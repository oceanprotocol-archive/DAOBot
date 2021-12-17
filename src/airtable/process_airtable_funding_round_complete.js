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
  const earmarkedResults = await dumpResultsToGSheet(
    finalResults.earmarkedResults.winningProposals
  )
  const partiallyFundedResults = await dumpResultsToGSheet(
    finalResults.partiallyFunded
  )
  const notFundedResults = await dumpResultsToGSheet(finalResults.notFunded)

  // Finally, write to gsheets
  const oAuth = await initOAuthToken()
  const fundsLeftRule = curRound.get('Funds Left')  
  const sheetName = 'Round' + curRoundNumber + 'FinalResults'

  // Get the sheet, otherwise create it
  let sheet = await getValues(oAuth, sheetName, 'A1:B3')
  if (sheet === undefined) {
    sheet = await addSheet(oAuth, sheetName)
    Logger.log('Created new sheet [%s].', sheetName)
  }

  let gsheetRows = []

  // Flatten results onto gsheetRows
  earmarkedResults.splice(0, 0, ['Earmarked Winners'])
  earmarkedResults.push([''])
  partiallyFundedResults.splice(0, 0, ['Partially Funded'])
  partiallyFundedResults.push([''])
  notFundedResults.splice(0, 0, ['Proposals that could not be funded'])
  notFundedResults.push([''])
  downvotedResults.splice(0, 0, ['Downvoted Proposals'])
  downvotedResults.push([''])
  gsheetRows = gsheetRows.concat(earmarkedResults)
  gsheetRows = gsheetRows.concat(partiallyFundedResults)
  gsheetRows = gsheetRows.concat(notFundedResults)
  gsheetRows = gsheetRows.concat(downvotedResults)

  const oceanUSD = curRound.get('OCEAN Price')
  // 2x Rows => Header & Summed results
  const foundsLeftRuleString = fundsLeftRule === 'Burn' ? 'Burned' : 'Recycled'
  const burnedFunds = [
    [`Total USD ${foundsLeftRuleString}`],
    [
      finalResults.earmarkedResults.fundsLeft
    ],
    [
      `Total OCEAN ${foundsLeftRuleString}`
    ],
    [
      finalResults.earmarkedResults.fundsLeft / oceanUSD,
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
    finalResults.earmarkedResults.fundsLeft /
    oceanPrice
  return burntFunds
}

module.exports = { processFundingRoundComplete, computeBurnedFunds }
