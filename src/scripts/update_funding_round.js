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
  getWinningProposals,
  getDownvotedProposals,
  completeEarstructuresValues,
  calculateFinalResults,
  calculateWinningProposalsForEarmark,
  dumpResultsToGSheet
} = require('../airtable/rounds/funding_rounds')
const {
  processAirtableNewProposals
} = require('../airtable/process_airtable_new_proposals')
const {
  processFundingRoundComplete,
  computeBurnedFunds,
  clearFundedRecords,
  dumpWiningProposalsByEarmarksToGSheet
} = require('../airtable/process_airtable_funding_round_complete')
const { initOAuthToken } = require('../gsheets/gsheets')
const {
  getValues,
  addSheet,
  updateValues
} = require('../gsheets/gsheets_utils')
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
  syncGSheetsActiveProposalVotes,
  createRoundResultsGSheet
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

// Generate final google sheets
const calculateRoundResults = async (curRound) => {
  // the following line will disable this test, should be commented in to make the test run
  if (curRound.get('Round') !== 1) return
  if (curRound.get('Round State') !== 'Voting') return
  const oceanPrice = await getTokenPrice() // get the latest Ocean price
  const earmarkStructure = await completeEarstructuresValues(
      curRound,
      oceanPrice,
      curRound.get('Basis Currency')
  ) // calculate the earmark values based on the updated Ocean price

  curRound['OCEAN Price'] = oceanPrice
  curRound.Earmarks = JSON.stringify(earmarkStructure)
  curRound['Funding Available USD'] =
      curRound.get('Funding Available') * oceanPrice

  // Complete round calculations
  const activeProposals = await getProposalsSelectQuery(
      `AND({Round} = "${curRound.get(
          'Round'
      )}", NOT({Proposal State} = "Withdrawn"), "true")`
  )

  clearFundedRecords(activeProposals)
  const downvotedProposals = getDownvotedProposals(activeProposals)
  const winningProposals = getWinningProposals(
      activeProposals,
      curRound.get('Round')
  )
  const finalResults = calculateFinalResults(winningProposals, curRound)
  const oceanFunded =
      finalResults.resultsByEarmark.usdEarmarked / curRound.get('OCEAN Price')
  oceanFunded.should.equal(
      curRound.get('Funding Available') -
      finalResults.resultsByEarmark.fundsLeftOcean
  )

  // write results to GSsheets
  const downvotedResults = await dumpResultsToGSheet(downvotedProposals)

  const partiallyFundedResults = await dumpResultsToGSheet(
      finalResults.partiallyFunded
  )
  const notFundedResults = await dumpResultsToGSheet(finalResults.notFunded)

  // Finally, write to gsheets
  const oAuth = await initOAuthToken()
  const fundsLeftRule = curRound.get('Funds Left')
  const sheetName = 'Round' + curRound.get('Round') + 'FinalResults'

  // Get the sheet, otherwise create it
  let sheet = await getValues(oAuth, sheetName, 'A1:B3')
  if (sheet === undefined) {
    sheet = await addSheet(oAuth, sheetName)
    Logger.log('Created new sheet [%s].', sheetName)
  }
  let gsheetRows = []
  // Flatten results onto gsheetRows
  gsheetRows = await dumpWiningProposalsByEarmarksToGSheet(
      finalResults.resultsByEarmark,
      gsheetRows
  )
  partiallyFundedResults.splice(0, 0, ['Partially Funded'])
  partiallyFundedResults.push([''])
  notFundedResults.splice(0, 0, ['Proposals that could not be funded'])
  notFundedResults.push([''])
  downvotedResults.splice(0, 0, ['Downvoted Proposals'])
  downvotedResults.push([''])
  gsheetRows = gsheetRows.concat(partiallyFundedResults)
  gsheetRows = gsheetRows.concat(notFundedResults)
  gsheetRows = gsheetRows.concat(downvotedResults)

  // 2x Rows => Header & Summed results
  gsheetRows.push([''])
  gsheetRows.push(['Summed round results'])
  const oceanUSD = curRound.get('OCEAN Price')
  const foundsLeftRuleString =
      fundsLeftRule === 'Burn' ? 'Burned' : 'Recycled'
  const usdResultsTexts = []
  const oceanResultsTexts = []
  const usdResultsValues = []
  const oceanResultsValues = []
  finalResults.resultsByEarmark.earmarks.forEach((earmark) => {
    usdResultsTexts.push(`${earmark} USD ${foundsLeftRuleString}`)
    oceanResultsTexts.push(`${earmark} OCEAN ${foundsLeftRuleString}`)
    const usdFundsLeft = finalResults.resultsByEarmark[earmark].fundsLeft
    usdResultsValues.push(finalResults.resultsByEarmark[earmark].fundsLeft)
    oceanResultsValues.push(usdFundsLeft / oceanPrice)
  })

  // Total USD&OCEAN burned/recycled
  usdResultsTexts.push(`Total USD ${foundsLeftRuleString}`)
  oceanResultsTexts.push(`Total OCEAN ${foundsLeftRuleString}`)
  usdResultsValues.push(finalResults.resultsByEarmark.fundsRecycled)
  oceanResultsValues.push(
      finalResults.resultsByEarmark.fundsRecycled / oceanUSD
  )

  // Total USD&OCEAN granted
  usdResultsTexts.push(`Total USD Granted`)
  oceanResultsTexts.push(`Total OCEAN Granted`)
  usdResultsValues.push(finalResults.resultsByEarmark.usdEarmarked)
  oceanResultsValues.push(
      finalResults.resultsByEarmark.usdEarmarked / oceanUSD
  )

  gsheetRows.push(usdResultsTexts)
  gsheetRows.push(usdResultsValues)
  gsheetRows.push(oceanResultsTexts)
  gsheetRows.push(oceanResultsValues)
  gsheetRows.push([])

  await updateValues(
      oAuth,
      sheetName,
      'A1:I' + (gsheetRows.length + 1),
      gsheetRows
  )
}

const completeRound = () => {

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
      const oceanPrice = await getTokenPrice() // get the latest Ocean price
      const earmarkStructure = await completeEarstructuresValues(
        lastRound,
        oceanPrice,
        lastRound.get('Basis Currency')
      ) // calculate the earmark values based on the updated Ocean price
      const roundUpdateData = {
        'OCEAN Price': oceanPrice,
        Earmarks: JSON.stringify(earmarkStructure),
        'Funding Available USD': lastRound.get('Funding Available') * oceanPrice
      }

      await lastRound.updateFields(roundUpdateData) // update the round record

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

      await createRoundResultsGSheet(curRoundNumber)

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
      Logger.log('Update vote count.')

      // Update votes
      await syncAirtableActiveProposalVotes(curRoundNumber, curRoundBallotType)

      // TODO - Clean up results & gsheets
      await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
      // await calculateRoundResults(curRound)
    }
  }
}

main()
