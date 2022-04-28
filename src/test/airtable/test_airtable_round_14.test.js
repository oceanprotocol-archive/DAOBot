/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()
const should = require('chai').should()
const {
  getWinningProposals,
  getDownvotedProposals,
  calculateFinalResults,
  completeEarstructuresValues
} = require('../../airtable/rounds/funding_rounds')

var fundingRound = {}
var allProposals = []

beforeEach(async function () {
  fundingRound = {
    id: 'round_14',
    fields: {
      'OCEAN Price': 0.66,
      Earmarks:
        '{"New Entrants":{"OCEAN":24000,"USD":15840},"New Outreach":{"OCEAN":12000,"USD":7920},"Core Tech":{"OCEAN":30000,"USD":19800},"General":{"OCEAN":134000,"USD":88440}}',
      'Funding Available OCEAN': 200000,
      'Funding Available USD': 132000,
      'Basis Token': 'USD',
      'Funds Left': 'Recycle'
    },
    get: function (key) {
      return this.fields[key]
    }
  }

  // Dump csv from Airtable
  // use awk to add quotes, do the rest manually
  // cat airtable.csv | awk -F, -v OFS='","' -v q='"' '{$1=$1; print q $0 q}' > round_N_results.csv
  // ...improve on the awk/sed/regex. How: add brackets, make the last column numbers, etc...
  const proposal_csv = [
    ['DataX', 'General', 18750, 3201271, 1311],
    ['Data Whale', 'General', 18987, 2757474, 1311],
    ['RugPullIndex', 'General', 5000, 2405635, 1311],
    ['Algovera', 'General', 23000, 1395695, 0],
    ['Defillama Integration', 'New Entrants', 1400, 694002, 593],
    ['Ocean Ambassadors', 'General', 20000, 684302, 0],
    ['Core Tech WG Rewards', 'General', 3000, 613749, 0],
    ['Walt.id', 'General', 20000, 475440, 1311],
    ['Ocean Pearl', 'General', 20000, 465911, 0],
    ['LYNX', 'General', 14825, 441721, 619309],
    ['FELToken', 'General', 10000, 392118, 1311],
    ['mPowered', 'Core Tech', 20000, 351231, 0],
    ['Comments & Ratings integration', 'Core Tech', 2500, 310223, 1311],
    ['datastream by cloutcoin', 'New Entrants', 3000, 178936, 6500],
    ['Evotegra', 'General', 9500, 177857, 1311],
    ['DATALATTE', 'General', 20000, 156882, 1311],
    ['OceanDAO Analytics', 'General', 9500, 149563, 0],
    ['Newsletter for the Spanish Community', 'General', 6395, 132364, 1311],
    ['VORN","General', 10000, 115420, 1311],
    ['Ocean Missions', 'General', 5000, 64848, 0],
    ['Indian Ocean program', 'General', 7400, 64130, 0],
    ['VideoWiki', 'General', 15000, 42503, 1311],
    ['Ocean Protocol Turkey', 'General', 3000, 21947, 1311],
    ['Aquarium', 'New Entrants', 3000, 21395, 136383],
    ['Rent Smart', 'New Entrants', 3000, 21188, 5190],
    ['Athena Equity', 'General', 9600, 16725, 0],
    ['Coral Market', 'General', 20000, 13067, 468],
    ['Datavest', 'New Entrants', 2887, 10906, 6500],
    ['D-mail', 'Core Tech', 3000, 9535, 113439],
    [
      'OceanProtocol Non-Custodial Loan Infrastructure',
      'New Entrants',
      2870,
      7501,
      144992
    ],
    ['Ocean Protocol Japan', 'General', 9000, 6585, 131746],
    ['Ocean SRE/QA Community', 'New Outreach', 2884, 6388, 5616],
    [
      'Decentralized Grant Orchestration Tool',
      'New Entrants',
      3000,
      5699,
      1311
    ],
    ['Ocean South Africa', 'New Outreach', 3000, 2502, 2846],
    ['Ocean Greek Community', 'General', 3800, 1929, 1311],
    ['Nigeria Community Building', 'General', 5000, 1929, 1311],
    ['ExamGuide', 'New Entrants', 2700, 1175, 63811],
    ['Bubble', 'New Entrants', 3000, 972, 63523]
  ]

  allProposals = []

  proposal_csv.forEach((proposal) => {
    allProposals.push({
      id: proposal[0],
      fields: {
        'Project Name': proposal[0],
        Earmarks: proposal[1],
        'USD Requested': proposal[2],
        'Voted Yes': proposal[3],
        'Voted No': proposal[4],
        'Minimum USD Requested': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    })
  })
})

describe('Calculating Winners', function () {
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
    allProposals.length.should.equal(38)
  })

  it('Check funding distribution adds up to 200k Ocean', async function () {
    const downvotedProposals = getDownvotedProposals(allProposals)
    should.equal(downvotedProposals.length, 8)

    const winningProposals = getWinningProposals(allProposals, fundingRound)
    const finalResults = calculateFinalResults(winningProposals, fundingRound)

    // sum all winnings
    const totalOceanGranted =
      finalResults.resultsByEarmark.usdEarmarked /
      fundingRound.get('OCEAN Price')

    Math.round(totalOceanGranted).should.equal(200000)
  })
})
