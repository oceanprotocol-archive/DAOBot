global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const {
  getProposalsSelectQuery,
  updateProposalRecords
} = require('./airtable_utils')
const { initOAuthToken } = require('../gsheets/gsheets')
const {
  getValues,
  addSheet,
  updateValues
} = require('../gsheets/gsheets_utils')
const {
  getWinningProposals,
  calculateFinalResults,
  getDownvotedProposals,
  dumpResultsToGSheet
} = require('./rounds/funding_rounds')

const clearFundedRecords = (proposals) => {
  proposals.map((p) => {
    p.fields['USD Granted'] = 0
    p.fields['OCEAN Requested'] = 0
    p.fields['OCEAN Granted'] = 0
  })
}

const dumpWiningProposalsByEarmarksToGSheet = async(earmarkedResults, gsheetRows) => {
  for(const earmarkResult in earmarkedResults){
    let earmarkGSheetResults
    if(earmarkedResults[earmarkResult].winningProposals){
      earmarkGSheetResults = await dumpResultsToGSheet(
        earmarkedResults[earmarkResult].winningProposals
      )
      earmarkGSheetResults.splice(0, 0, [`${earmarkResult} Winners`])
      earmarkGSheetResults.push([''])
      gsheetRows = gsheetRows.concat(earmarkGSheetResults)
    }else if(earmarkedResults[earmarkResult].length===0){
      let earmarkGSheetResults = []
      earmarkGSheetResults.push([`${earmarkResult} Winners`])
      earmarkGSheetResults.push([
        'Project Name',
        'Yes Votes',
        'No Votes',
        'Pct Yes',
        '>50% Yes?',
        'USD Requested',
        'OCEAN Requested',
        'OCEAN Granted'
      ])
      earmarkGSheetResults.push([''])
      gsheetRows = gsheetRows.concat(earmarkGSheetResults)
    }
  }
  return gsheetRows
}

const processFundingRoundComplete = async (curRound, curRoundNumber) => {
  // Step 1 - Identify all winning and downvoted proposals
  const activeProposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Withdrawn"), "true")`
  )

  clearFundedRecords(activeProposals)
  const downvotedProposals = getDownvotedProposals(activeProposals)
  const winningProposals = getWinningProposals(activeProposals, curRoundNumber)
  const finalResults = calculateFinalResults(winningProposals, curRound)

  let airtableRows = []
  airtableRows = airtableRows.concat(downvotedProposals)
  airtableRows = airtableRows.concat(
    finalResults.earmarkedResults.winningProposals
  )
  airtableRows = airtableRows.concat(
    finalResults.generalResults.winningProposals
  )
  airtableRows = airtableRows.concat(finalResults.partiallyFunded)
  airtableRows = airtableRows.concat(finalResults.notFunded)

  airtableRows = airtableRows.map((p) => {
    return {
      id: p.id,
      fields: {
        'Proposal State': p.get('Proposal State'),
        'USD Granted': p.get('USD Granted'),
        'OCEAN Requested': p.get('OCEAN Requested'),
        'OCEAN Granted': p.get('OCEAN Granted')
      }
    }
  })

  // Step 2 - Update all DB records
  await updateProposalRecords(airtableRows)
  Logger.log(
    '\n[%s]\nUpdated [%s] rows to Airtable',
    new Date().toString(),
    Object.entries(airtableRows).length
  )

  // Step 3 - Dump all results to a flattened list
  const downvotedResults = await dumpResultsToGSheet(downvotedProposals)

  const generalResults = await dumpResultsToGSheet(
    finalResults.generalResults.winningProposals
  )
  const partiallyFundedResults = await dumpResultsToGSheet(
    finalResults.partiallyFunded
  )
  const notFundedResults = await dumpResultsToGSheet(finalResults.notFunded)

  // Finally, write to gsheets
  const oAuth = await initOAuthToken()

  const sheetName = 'Round' + curRoundNumber + 'FinalResults'

  // Get the sheet, otherwise create it
  let sheet = await getValues(oAuth, sheetName, 'A1:B3')
  if (sheet === undefined) {
    sheet = await addSheet(oAuth, sheetName)
    Logger.log('Created new sheet [%s].', sheetName)
  }

  let gsheetRows = []

  // Flatten results onto gsheetRows
  gsheetRows = await dumpWiningProposalsByEarmarksToGSheet(finalResults.earmarkedResults, gsheetRows)
  generalResults.splice(0, 0, ['General Winners'])
  generalResults.push([''])
  partiallyFundedResults.splice(0, 0, ['Partially Funded'])
  partiallyFundedResults.push([''])
  notFundedResults.splice(0, 0, ['Proposals that could not be funded'])
  notFundedResults.push([''])
  downvotedResults.splice(0, 0, ['Downvoted Proposals'])
  downvotedResults.push([''])
  gsheetRows = gsheetRows.concat(generalResults)
  gsheetRows = gsheetRows.concat(partiallyFundedResults)
  gsheetRows = gsheetRows.concat(notFundedResults)
  gsheetRows = gsheetRows.concat(downvotedResults)

  const oceanUSD = curRound.get('OCEAN Price')
  // 2x Rows => Header & Summed results
  const burnedFunds = [
    ['Earmarked USD Burned', '', 'General USD Burned', '', 'Total USD Burned'],
    [
      finalResults.earmarkedResults.fundsLeft,
      '',
      finalResults.generalResults.fundsLeft,
      '',
      finalResults.earmarkedResults.fundsLeft +
        finalResults.generalResults.fundsLeft
    ],
    [
      'Earmarked OCEAN Burned',
      '',
      'General OCEAN Burned',
      '',
      'Total OCEAN Burned'
    ],
    [
      finalResults.earmarkedResults.fundsLeft / oceanUSD,
      '',
      finalResults.generalResults.fundsLeft / oceanUSD,
      '',
      (finalResults.earmarkedResults.fundsLeft +
        finalResults.generalResults.fundsLeft) /
        oceanUSD
    ]
  ]
  gsheetRows = gsheetRows.concat(burnedFunds)

  await updateValues(
    oAuth,
    sheetName,
    'A1:H' + (gsheetRows.length + 1),
    gsheetRows
  )
  Logger.log(
    '\n[%s]\nDumped [%s] rows to Gsheets',
    new Date().toString(),
    Object.entries(gsheetRows).length
  )

  return (
    finalResults.earmarkedResults.winningProposals.length +
    finalResults.generalResults.winningProposals.length +
    finalResults.partiallyFunded.length
  )
}

const computeBurnedFunds = async (curRound, curRoundNumber) => {
  const activeProposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Withdrawn"), "true")`
  )

  const winningProposals = getWinningProposals(activeProposals, curRoundNumber)
  const finalResults = calculateFinalResults(winningProposals, curRound)
  const oceanPrice = curRound.get('OCEAN Price')

  const burntFunds =
    (finalResults.earmarkedResults.fundsLeft +
      finalResults.generalResults.fundsLeft) /
    oceanPrice
  return burntFunds
}

module.exports = { processFundingRoundComplete, computeBurnedFunds }
