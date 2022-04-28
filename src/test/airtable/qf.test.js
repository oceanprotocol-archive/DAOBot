/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
const {
  clearFundedRecords
} = require('../../airtable/process_airtable_funding_round_complete')
dotenv.config()
const should = require('chai').should()
const {
  getWinningProposals,
  calculateFinalResults,
  completeEarstructuresValues
} = require('../../airtable/rounds/funding_rounds')

var fundingRound = {}
var allProposals = []
var proposal_csv, expectedResults
const data = {
  14: require('./qf_data/round14'),
  15: require('./qf_data/round15')
}

beforeEach(async function () {})

let winningProposals
let finalResults

describe('Compare QF Results', () => {
  for (const rn of [14, 15]) {
    ;({ proposal_csv, expectedResults, fundingRound } = data[rn])
    allProposals = []
    proposal_csv.forEach((proposal) => {
      allProposals.push({
        id: proposal[0],
        fields: {
          'Project Name': proposal[0],
          Earmarks: proposal[1],
          'USD Requested': proposal[2],
          'OCEAN Requested': proposal[2] / fundingRound.fields['OCEAN Price'],
          'Voted Yes': proposal[3],
          'Voted No': proposal[4],
          'USD Granted': 0,
          'OCEAN Granted': 0,
          'Minimum USD Requested': 800,
          'Basis Currency': 'USD'
        },
        get: function (key) {
          return this.fields[key]
        }
      })
    })

    clearFundedRecords(allProposals)
    winningProposals = getWinningProposals(allProposals, 14)
    finalResults = calculateFinalResults(winningProposals, fundingRound)
    describe(`Calculating Winners for round ${rn}`, function () {
      it('Check if earmark is setup', async function () {
        // from Airtable
        const tokenPrice = fundingRound.fields['OCEAN Price']
        const newEarmarks = await completeEarstructuresValues(
          fundingRound,
          tokenPrice,
          fundingRound.fields['Basis Token']
        )
        for (const earmark in newEarmarks) {
          should.equal(
            newEarmarks[earmark].OCEAN.toFixed(2),
            (newEarmarks[earmark].USD / tokenPrice).toFixed(2)
          )
        }
      })

      it('Grant amounts must match expected results', function () {
        finalResults.resultsByEarmark.winningProposals.forEach((proposal) => {
          proposal.fields['OCEAN Granted'].should.closeTo(
            expectedResults.find(
              (x) => x['Project Name'] === proposal.fields['Project Name']
            )['OCEAN Granted'],
            5
          )
          proposal.fields['OCEAN Requested'].should.closeTo(
            expectedResults.find(
              (x) => x['Project Name'] === proposal.fields['Project Name']
            )['OCEAN Requested'],
            5
          )
          proposal.fields['USD Granted'].should.closeTo(
            expectedResults.find(
              (x) => x['Project Name'] === proposal.fields['Project Name']
            )['USD Granted'],
            5
          )
          proposal.fields['USD Requested'].should.closeTo(
            expectedResults.find(
              (x) => x['Project Name'] === proposal.fields['Project Name']
            )['USD Requested'],
            5
          )
        })
      })

      it('Funding distribution adds up to 235K Ocean', async function () {
        const totalOceanGranted =
          finalResults.resultsByEarmark.usdEarmarked /
          fundingRound.get('OCEAN Price')

        totalOceanGranted.should.closeTo(
          fundingRound.fields['Funding Available OCEAN'],
          200
        )
      })
    })
  }
})
