/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
const Logger = require('../../utils/logger')
dotenv.config()
const {
  completeEarstructuresValues,
  getWinningProposals,
  calculateFinalResults,
  dumpResultsToGSheet,
  getDownvotedProposals,
  getCurrentRound
} = require('../../airtable/rounds/funding_rounds')
const { getProposalsSelectQuery } = require('../../airtable/airtable_utils')
const { getTokenPrice } = require('../../functions/chainlink')
const {
  clearFundedRecords,
  dumpWiningProposalsByEarmarksToGSheet
} = require('../../airtable/process_airtable_funding_round_complete')
const {
  getValues,
  addSheet,
  updateValues
} = require('../../gsheets/gsheets_utils')
const { initOAuthToken } = require('../../gsheets/gsheets')

jest.setTimeout(900000)

describe('Calculating Winners', function () {
  it('Checks current round results', async function () {
    const curRound = await getCurrentRound()
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
  })
})
