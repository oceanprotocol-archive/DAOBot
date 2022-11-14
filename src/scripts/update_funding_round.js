global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const moment = require('moment')
const {
  getProposalsSelectQuery,
  getRoundsSelectQuery,
  updateRoundRecord
} = require('../airtable/airtable_utils')
const {
  RoundState,
  getCurrentRound,
  completeEarstructuresValues,
  calculateWinningProposalsForEarmark
} = require('../airtable/rounds/funding_rounds')
const {
  processAirtableNewProposals
} = require('../airtable/process_airtable_new_proposals')
const {
  processFundingRoundComplete,
  computeBurnedFunds
} = require('../airtable/process_airtable_funding_round_complete')
const {
  prepareProposalsForSnapshot
} = require('../snapshot/prepare_snapshot_received_proposals_airtable')
const {
  submitProposalsToSnaphotGranular,
  submitProposalsToSnaphotBatch
} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')
const {
  syncAirtableActiveProposalVotes
} = require('../airtable/sync_airtable_active_proposal_votes_snapshot')
const {
  syncGSheetsActiveProposalVotes
} = require('../gsheets/sync_gsheets_active_proposal_votes_snapshot')
const { BallotType } = require('../snapshot/snapshot_utils')
const { sleep } = require('../functions/utils')
const { getTokenPrice } = require('../functions/chainlink')
const {
  processAirtableProposalStandings
} = require('../airtable/process_airtable_all_proposal_standings')
const {
  checkAndGenerateNextRoundOpsSchedule
} = require('../scripts/ops/generate_issues')

const prepareNewProposals = async (curRound, curRoundNumber) => {
  // Prepare proposals for Snapshot (Check token balance, calc snapshot height)
  await processAirtableNewProposals(curRoundNumber)

  // Review all standings for Snapshot
  await sleep(1000)
  await prepareProposalsForSnapshot(curRound)
}

// Function is responsible for retrieving all data required to set USD floor to 100k
const FLOOR_OCEAN = 200000
const FLOOR_USD = 35000

const updateFundingAvailable = async (fundingRound) => {
  Logger.log('...updateFundingAvailable()')
  const oceanPrice = await getTokenPrice() // get the latest Ocean price
  fundingRound.fields.Earmarks = fundingRound.get('Default Earmark')
  const earmarkStructure = await completeEarstructuresValues(
    fundingRound,
    oceanPrice,
    FLOOR_OCEAN * oceanPrice < FLOOR_USD ? 'USD' : 'OCEAN'
  ) // calculate the earmark values based on the updated Ocean price
  const roundUpdateData = {
    'OCEAN Price': oceanPrice
  }

  // if the current amount is smaller than 200000/100k
  if (FLOOR_OCEAN * oceanPrice < FLOOR_USD) {
    roundUpdateData['Funding Available'] = FLOOR_USD / oceanPrice
    roundUpdateData['Funding Available USD'] = FLOOR_USD
  } else if (FLOOR_OCEAN * oceanPrice > FLOOR_USD) {
    roundUpdateData['Funding Available'] = FLOOR_OCEAN
    roundUpdateData['Funding Available USD'] = FLOOR_OCEAN * oceanPrice
  } else {
    roundUpdateData['Funding Available'] = FLOOR_OCEAN
    roundUpdateData['Funding Available USD'] = FLOOR_USD
  }

  roundUpdateData.Earmarks = JSON.stringify(earmarkStructure)
  await fundingRound.updateFields(roundUpdateData)
}

// Split up functionality
// Make it easy to debug/trigger events
// DONE - End voting periods
// DONE - Kickoff new round
// DONE - Update existing round
const main = async () => {
  const curRound = await getCurrentRound()
  let curRoundNumber
  let curRoundState
  let curRoundStartDate
  let curRoundProposalsDueBy
  let curRoundProposalsDueBy_plus15
  let curRoundVoteStart
  let curRoundVoteEnd
  let curRoundVoteType
  let curRoundBallotType

  if (curRound !== undefined) {
    curRoundNumber = curRound.get('Round')
    curRoundState = curRound.get('Round State')
    curRoundStartDate = curRound.get('Start Date')
    curRoundProposalsDueBy = moment(curRound.get('Proposals Due By'))
      .utc()
      .toISOString()
    curRoundProposalsDueBy_plus15 = moment(curRound.get('Proposals Due By'))
      .add(15, 'minutes')
      .utc()
      .toISOString()
    curRoundVoteStart = curRound.get('Voting Starts')
    curRoundVoteEnd = curRound.get('Voting Ends')
    curRoundVoteType = curRound.get('Vote Type')
    curRoundBallotType = curRound.get('Ballot Type')

    // TODO-RA: This function will take longer and longer to process
    await processAirtableProposalStandings(curRoundNumber) // process proposal standings
    await checkAndGenerateNextRoundOpsSchedule(curRoundNumber)
  }

  const lastRoundNumber = parseInt(curRoundNumber, 10) - 1
  let lastRound = await getRoundsSelectQuery(`{Round} = ${lastRoundNumber}`)
  let lastRoundState
  let lastRoundVoteEnd
  let lastRoundBallotType

  if (lastRound !== undefined && lastRound.length > 0) {
    ;[lastRound] = lastRound
    lastRoundState = lastRound.get('Round State')
    lastRoundVoteEnd = lastRound.get('Voting Ends')
    lastRoundBallotType = lastRound.get('Ballot Type')
  }

  const now = moment().utc().toISOString()

  if (curRoundState === undefined) {
    // TODO - Clean up results & gsheets
    // this is when the round is ending => switching to the next funding round
    if (lastRoundState === RoundState.Voting && now >= lastRoundVoteEnd) {
      // [curRound Ended] Apply final calcs
      // Update funding numbers to report how much is available
      await updateFundingAvailable(lastRound)

      Logger.log('Start next round.')
      // Update votes and compute funds burned
      const fundsBurned = await computeBurnedFunds(lastRound, lastRoundNumber)
      await syncAirtableActiveProposalVotes(
        lastRoundNumber,
        lastRoundBallotType
      )

      try {
        await syncGSheetsActiveProposalVotes(
          lastRoundNumber,
          lastRoundBallotType
        )
      } catch (err) {
        Logger.error(`Error syncing GSheets Active Proposal Votes: ${err}`)
      }

      // Complete round calculations
      // TODO - make this repeatable
      const proposalsFunded = await processFundingRoundComplete(
        lastRound,
        lastRoundNumber
      )
      // Start the next round
      const roundUpdate = [
        {
          id: lastRound.id,
          fields: {
            'Round State': RoundState.Ended,
            'Proposals Granted': proposalsFunded,
            'OCEAN Burned': fundsBurned
          }
        },
        {
          id: curRound.id,
          fields: {
            'Round State': RoundState.Started
          }
        }
      ]
      await updateRoundRecord(roundUpdate)
    } else if (now >= curRoundStartDate) {
      Logger.log('Start current round.')

      // Start the current round
      const roundUpdate = [
        {
          id: curRound.id,
          fields: {
            'Round State': RoundState.Started
          }
        }
      ]
      await updateRoundRecord(roundUpdate)
    }
  } else {
    // this is logic for the current funding round, and the states within it
    if (curRoundState === RoundState.Started && now < curRoundProposalsDueBy) {
      Logger.log('Update active round.')
      await prepareNewProposals(curRound, curRoundNumber)
    } else if (
      curRoundState === RoundState.Started &&
      now >= curRoundProposalsDueBy
    ) {
      Logger.log('Start DD period.')

      await prepareNewProposals(curRound, curRoundNumber)

      const allProposals = await getProposalsSelectQuery(
        `{Round} = ${curRoundNumber}`
      )
      const tokenPrice = await getTokenPrice()
      const basisCurrency = curRound.get('Basis Currency')

      let fundingAvailable = 0

      let fundingAvailableUSD = 0

      switch (basisCurrency) {
        case 'USD': {
          fundingAvailableUSD = curRound.get('Funding Available USD')

          fundingAvailable = fundingAvailableUSD / tokenPrice
          break
        }

        case 'OCEAN': {
          const fundingAvailableOCEAN = curRound.get('Funding Available')

          fundingAvailable = fundingAvailableOCEAN

          fundingAvailableUSD = fundingAvailableOCEAN * tokenPrice
          break
        }

        default:
          Logger.log('No Basis Currency was selected for this round.')
      }

      const roundUpdate = [
        {
          id: curRound.id,
          fields: {
            'Round State': RoundState.DueDiligence,
            Proposals: allProposals.length,
            'OCEAN Price': tokenPrice,
            Earmarks: JSON.stringify(
              completeEarstructuresValues(curRound, tokenPrice, basisCurrency)
            ),
            'Funding Available': fundingAvailable,
            'Funding Available USD': fundingAvailableUSD
          }
        }
      ]

      try {
        await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
      } catch (err) {
        Logger.error(`Error syncing GSheets Active Proposal Votes: ${err}`)
      }

      // Enter Due Diligence period
      calculateWinningProposalsForEarmark(
        allProposals,
        fundingAvailableUSD,
        tokenPrice
      )
      await updateRoundRecord(roundUpdate)
    } else if (
      curRoundState === RoundState.DueDiligence &&
      now >= curRoundVoteStart
    ) {
      Logger.log('Start Voting period.')

      // Submit to snapshot + Enter voting state
      if (curRoundBallotType === BallotType.Granular) {
        await submitProposalsToSnaphotGranular(curRoundNumber, curRoundVoteType)
      } else if (curRoundBallotType === BallotType.Batch) {
        await submitProposalsToSnaphotBatch(curRoundNumber, curRoundVoteType)
      }

      const roundUpdate = [
        {
          id: curRound.id,
          fields: {
            'Round State': RoundState.Voting
          }
        }
      ]
      await updateRoundRecord(roundUpdate)
    } else if (
      curRoundState === RoundState.DueDiligence &&
      now <= curRoundProposalsDueBy_plus15
    ) {
      // 15 minute grace period from DD to allow Alex to update proposals
      Logger.log('Update Proposals - Grace Period.')

      await prepareNewProposals(curRound, curRoundNumber)

      const allProposals = await getProposalsSelectQuery(
        `{Round} = ${curRoundNumber}`
      )
      // Update proposal count
      const roundUpdate = [
        {
          id: curRound.id,
          fields: {
            Proposals: allProposals.length
          }
        }
      ]
      await updateRoundRecord(roundUpdate)
    } else if (curRoundState === RoundState.Voting && now < curRoundVoteEnd) {
      // Update votes
      Logger.log('Update vote count.')
      await syncAirtableActiveProposalVotes(curRoundNumber, curRoundBallotType)

      // Update funding numbers to report how much is available
      await updateFundingAvailable(curRound)

      // TODO - Clean up results & gsheets
      try {
        await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
      } catch (err) {
        Logger.error(`Error syncing GSheets Active Proposal Votes: ${err}`)
      }
    }
  }
}

module.exports = main
