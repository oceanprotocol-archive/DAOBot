/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
const {
  computeBurnedFunds,
  clearFundedRecords
} = require('../../airtable/process_airtable_funding_round_complete')
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
var expectedResults = []

beforeEach(async function () {
  fundingRound = {
    id: 'round_15',
    fields: {
      'OCEAN Price': 0.4596236,
      Earmarks:
        '{"New Entrants":{"OCEAN":28200,"USD":12961.384},"New Outreach":{"OCEAN":14100,"USD":6480.692},"Core Tech":{"OCEAN":35250,"USD":16201.73},"General":{"OCEAN":157450,"USD":72367.728}}',
      'Funding Available OCEAN': 235000,
      'Funding Available USD': 108100,
      'Basis Token': 'OCEAN',
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
  // or use https://shancarter.github.io/mr-data-converter/
  const proposal_csv = [
    ['Ocean is NEAR', 'New Entrants', 3000, 62501, 0],
    ['FELToken', 'General', 10000, 291663, 0],
    ['Newsletter for the Spanish Community', 'General', 6209, 660, 0],
    ['Ocean South Africa', 'New Outreach', 3000, 923, 65],
    ['DeadmanDAO Web3 Hacker Network', 'New Entrants', 3000, 357, 0],
    ['Knowan', 'New Outreach', 3000, 11918, 0],
    ['Data Whale', 'General', 9865, 997095, 0],
    ['DATALATTE', 'General', 20000, 238940, 0],
    ['ExamGuide', 'New Entrants', 2800, 12995, 0],
    ['WeData', 'New Entrants', 3000, 23260, 0],
    ['Walt.id', 'General', 13300, 192586, 0],
    ['Dev4Block', 'New Outreach', 3000, 7682, 0],
    [
      'OceanProtocol Non-Custodial Loan Infrastructure',
      'New Entrants',
      2870,
      100,
      52
    ],
    ['nCight', 'General', 9045, 122664, 0],
    ['Autobots', 'New Entrants', 3000, 1269, 2928],
    [
      'DAO Contributor Health Assessment Development',
      'New Entrants',
      3000,
      8672,
      0
    ],
    ['Datatera Inspector Functions', 'New Entrants', 3000, 6989, 0],
    ['Onboard - web3, in your hands', 'New Outreach', 3000, 109, 0],
    ['PGWG Rewards', 'General', 3000, 31281, 0],
    ['VORN', 'General', 10000, 10407, 0],
    ['VideoWiki', 'General', 20000, 20494, 65],
    ['Data Onshore', 'General', 12000, 476, 0],
    ['Ocean Pearl', 'General', 20000, 534167, 0],
    ['FitCoral', 'General', 6000, 247517, 0],
    ['Algovera', 'Core Tech', 20000, 1342364, 0],
    ['Posthuman AI', 'General', 12000, 13278, 526],
    ['DataX', 'General', 18950, 1019057, 0],
    ['OCEAN DIGEST', 'New Outreach', 2500, 2360, 0],
    ['Ocean Missions', 'General', 7673, 200078, 0],
    ['Athena Equity', 'General', 10000, 11215, 0],
    ['Xdata', 'New Entrants', 3000, 48, 4689]
  ]

  allProposals = []
  expectedResults = [
    {
      'Project Name': 'Ocean is NEAR',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 6527,
      'USD Requested': 3000,
      'USD Granted': 3000
    },
    {
      'Project Name': 'FELToken',
      'OCEAN Requested': 21757,
      'OCEAN Granted': 14706,
      'USD Requested': 10000,
      'USD Granted': 6759
    },
    {
      'Project Name': 'Newsletter for the Spanish Community',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 6209,
      'USD Granted': 0
    },
    {
      'Project Name': 'Ocean South Africa',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 3000,
      'USD Granted': 0
    },
    {
      'Project Name': 'DeadmanDAO Web3 Hacker Network',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 3000,
      'USD Granted': 0
    },
    {
      'Project Name': 'Knowan',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 6527,
      'USD Requested': 3000,
      'USD Granted': 3000
    },
    {
      'Project Name': 'Data Whale',
      'OCEAN Requested': 21463,
      'OCEAN Granted': 21463,
      'USD Requested': 9865,
      'USD Granted': 9865
    },
    {
      'Project Name': 'DATALATTE',
      'OCEAN Requested': 43514,
      'OCEAN Granted': 12048,
      'USD Requested': 20000,
      'USD Granted': 5537
    },
    {
      'Project Name': 'ExamGuide',
      'OCEAN Requested': 6092,
      'OCEAN Granted': 6092,
      'USD Requested': 2800,
      'USD Granted': 2800
    },
    {
      'Project Name': 'WeData',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 6527,
      'USD Requested': 3000,
      'USD Granted': 3000
    },
    {
      'Project Name': 'Walt.id',
      'OCEAN Requested': 28937,
      'OCEAN Granted': 9710,
      'USD Requested': 13300,
      'USD Granted': 4463
    },
    {
      'Project Name': 'Dev4Block',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 5793,
      'USD Requested': 3000,
      'USD Granted': 2663
    },
    {
      'Project Name': 'OceanProtocol Non-Custodial Loan Infrastructure',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 2870,
      'USD Granted': 0
    },
    {
      'Project Name': 'nCight',
      'OCEAN Requested': 19679,
      'OCEAN Granted': 6185,
      'USD Requested': 9045,
      'USD Granted': 2843
    },
    {
      'Project Name': 'Autobots',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 3000,
      'USD Granted': 0
    },
    {
      'Project Name': 'DAO Contributor Health Assessment Development',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 5013,
      'USD Requested': 3000,
      'USD Granted': 2304
    },
    {
      'Project Name': 'Datatera Inspector Functions',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 4040,
      'USD Requested': 3000,
      'USD Granted': 1857
    },
    {
      'Project Name': 'Onboard - web3, in your hands',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 3000,
      'USD Granted': 0
    },
    {
      'Project Name': 'PGWG Rewards',
      'OCEAN Requested': 6527,
      'OCEAN Granted': 1577,
      'USD Requested': 3000,
      'USD Granted': 725
    },
    {
      'Project Name': 'VORN',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 10000,
      'USD Granted': 0
    },
    {
      'Project Name': 'VideoWiki',
      'OCEAN Requested': 43514,
      'OCEAN Granted': 1030,
      'USD Requested': 20000,
      'USD Granted': 473
    },
    {
      'Project Name': 'Data Onshore',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 12000,
      'USD Granted': 0
    },
    {
      'Project Name': 'Ocean Pearl',
      'OCEAN Requested': 43514,
      'OCEAN Granted': 26933,
      'USD Requested': 20000,
      'USD Granted': 12379
    },
    {
      'Project Name': 'FitCoral',
      'OCEAN Requested': 13054,
      'OCEAN Granted': 12480,
      'USD Requested': 6000,
      'USD Granted': 5736
    },
    {
      'Project Name': 'Algovera',
      'OCEAN Requested': 43514,
      'OCEAN Granted': 35250,
      'USD Requested': 20000,
      'USD Granted': 16202
    },
    {
      'Project Name': 'Posthuman AI',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 12000,
      'USD Granted': 0
    },
    {
      'Project Name': 'DataX',
      'OCEAN Requested': 41229,
      'OCEAN Granted': 41229,
      'USD Requested': 18950,
      'USD Granted': 18950
    },
    {
      'Project Name': 'OCEAN DIGEST',
      'OCEAN Requested': 5439,
      'OCEAN Granted': 1780,
      'USD Requested': 2500,
      'USD Granted': 818
    },
    {
      'Project Name': 'Ocean Missions',
      'OCEAN Requested': 16694,
      'OCEAN Granted': 10088,
      'USD Requested': 7673,
      'USD Granted': 4637
    },
    {
      'Project Name': 'Athena Equity',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 10000,
      'USD Granted': 0
    },
    {
      'Project Name': 'Xdata',
      'OCEAN Requested': 0,
      'OCEAN Granted': 0,
      'USD Requested': 3000,
      'USD Granted': 0
    }
  ]

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
        'Minimum OCEAN Requested': 1000,
        'Basis Currency': 'OCEAN'
      },
      get: function (key) {
        return this.fields[key]
      }
    })
  })

  clearFundedRecords(allProposals)
  downvotedProposals = getDownvotedProposals(allProposals)
  winningProposals = getWinningProposals(allProposals, 15)
  finalResults = calculateFinalResults(winningProposals, fundingRound)
})

let downvotedProposals
let winningProposals
let finalResults

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
  })

  it('There should be 2 downvoted proposals', async function () {
    should.equal(downvotedProposals.length, 2)
  })

  it('There should be 9 projects not funded', function () {
    should.equal(finalResults.notFunded.length, 9)
  })

  it('There should be 20 projects funded', function () {
    should.equal(finalResults.resultsByEarmark.winnerIds.length, 20)
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

    totalOceanGranted.should.closeTo(235000, 200)
  })
})
