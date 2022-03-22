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
  completeEarstructuresValues
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
  sleep(1000)
  await prepareProposalsForSnapshot(curRound)
}

const updateFunding = async (round) => {
  const tokenPrice = await getTokenPrice()
  const basisCurrency = round.get('Basis Currency')

  let fundingAvailable = 0
  let fundingAvailableUSD = 0

  switch (basisCurrency) {
    case 'USD': {
      fundingAvailableUSD = round.get('Funding Available USD')
      fundingAvailable = fundingAvailableUSD / tokenPrice
      break
    }
    case 'OCEAN': {
      fundingAvailable = round.get('Funding Available')
      fundingAvailableUSD = fundingAvailable * tokenPrice
      break
    }

    default:
      Logger.log('No Basis Currency was selected for this round.')
  }

  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'OCEAN Price': tokenPrice,
        Earmarks: JSON.stringify(
          completeEarstructuresValues(round, tokenPrice, basisCurrency)
        ),
        'Funding Available': fundingAvailable,
        'Funding Available USD': fundingAvailableUSD
      }
    }
  ]

  // Update funding information
  await updateRoundRecord(roundUpdate)
}

const updateVotes = async (round) => {
  const curRoundNumber = round.get('Round')
  const curRoundBallotType = round.get('Ballot Type')

  // Update votes
  await syncAirtableActiveProposalVotes(curRoundNumber, curRoundBallotType)
  await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
}

const updateWinners = async (round) => {
  const roundNumber = round.get('Round')
  const roundBasisCurrency = round.get('Basis Currency')
  const roundFundingAvailable = round.get('Funding Available')

  const oceanPrice = await getTokenPrice() // get the latest Ocean price
  const earmarkStructure = await completeEarstructuresValues(
    round,
    oceanPrice,
    roundBasisCurrency
  ) // calculate the earmark values based on the updated Ocean price

  // Update votes and compute funds burned
  const fundsBurned = await computeBurnedFunds(round, roundNumber)

  // Complete round calculations
  // TODO - make this repeatable
  const proposalsFunded = await processFundingRoundComplete(round, roundNumber)

  // Update airtable
  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'OCEAN Price': oceanPrice,
        'Proposals Granted': proposalsFunded,
        'OCEAN Burned': fundsBurned,
        Earmarks: JSON.stringify(earmarkStructure),
        'Funding Available USD': roundFundingAvailable * oceanPrice
      }
    }
  ]
  await updateRoundRecord(roundUpdate)
}

const startSubmissionPeriod = async (round) => {
  // Start the current round
  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'Round State': RoundState.Started
      }
    }
  ]
  await updateRoundRecord(roundUpdate)
}

const updateSubmissionPeriod = async (round) => {
  const roundNumber = round.get('Round')
  await prepareNewProposals(round, roundNumber)
}

const startDueDilligencePeriod = async (round) => {
  const roundNumber = round.get('Round')
  await prepareNewProposals(round, roundNumber)

  const allProposals = await getProposalsSelectQuery(`{Round} = ${roundNumber}`)

  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'Round State': RoundState.DueDiligence,
        Proposals: allProposals.length
      }
    }
  ]
  await updateRoundRecord(roundUpdate)

  updateFunding(round)
  updateVotes(round)
}

const startVotingPeriod = async (round) => {
  Logger.log('Start Voting period.')
  const curRoundNumber = round.get('Round')
  const curRoundVoteType = round.get('Vote Type')
  const curRoundBallotType = round.get('Ballot Type')

  // Submit to snapshot + Enter voting state
  if (curRoundBallotType === BallotType.Granular) {
    await submitProposalsToSnaphotGranular(curRoundNumber, curRoundVoteType)
  } else if (curRoundBallotType === BallotType.Batch) {
    await submitProposalsToSnaphotBatch(curRoundNumber, curRoundVoteType)
  }

  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'Round State': RoundState.Voting
      }
    }
  ]
  await updateRoundRecord(roundUpdate)
}

const updateVotingPeriod = async (round) => {
  await updateFunding(round)
  await updateVotes(round)
}

const endVotingPeriod = async (round) => {
  await updateVotingPeriod(round)
  await updateWinners(round)

  // Start the next round
  const roundUpdate = [
    {
      id: round.id,
      fields: {
        'Round State': RoundState.Ended
      }
    }
  ]
  await updateRoundRecord(roundUpdate)
}

const updateFundingRound = async (curRound) => {
  const now = moment().utc().toISOString()
  const curRoundState = curRound.get('Round State')
  const curRoundStartDate = curRound.get('Start Date')
  const curRoundProposalsDueBy = moment(curRound.get('Proposals Due By'))
    .utc()
    .toISOString()
  const curRoundVoteStart = curRound.get('Voting Starts')
  const curRoundVoteEnd = curRound.get('Voting Ends')

  switch (curRoundState) {
    case undefined:
      if (now >= curRoundStartDate) startSubmissionPeriod(curRound)
      break
    case RoundState.Started:
      if (now < curRoundProposalsDueBy) updateSubmissionPeriod(curRound)
      else if (now >= curRoundProposalsDueBy) startDueDilligencePeriod(curRound)
      break
    case RoundState.DueDiligence:
      if (now >= curRoundVoteStart) startVotingPeriod(curRound)
      break
    case RoundState.Voting:
      if (now < curRoundVoteEnd) updateVotingPeriod(curRound)
      else if (now >= curRoundVoteEnd) {
        // complete the round
        updateVotingPeriod(curRound)
        endVotingPeriod(curRound)
      }
      break
  }
}

const main = async () => {
  const curRound = await getCurrentRound()
  const curRoundNumber = curRound.get('Round')

  // TODO: Fix this to only process against last round, or project.
  await processAirtableProposalStandings(curRoundNumber)
  await checkAndGenerateNextRoundOpsSchedule(curRoundNumber)

  const lastRoundNumber = parseInt(curRoundNumber, 10) - 1
  const lastRound = await getRoundsSelectQuery(`{Round} = ${lastRoundNumber}`)

  updateFundingRound(lastRound)
  updateFundingRound(curRound)
}

main()
