/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()
const Logger = require('../../utils/logger')

const should = require('chai').should()
const {
  getWinningProposals,
  getDownvotedProposals,
  calculateWinningAllProposals,
  calculateFinalResults,
  dumpResultsToGSheet,
  completeEarstructuresValues,
  Earmarks
} = require('../../airtable/rounds/funding_rounds')

var fundingRound = {}
var allProposals = []

beforeEach(async function () {
  fundingRound = {
    id: 'round_8',
    fields: {
      'OCEAN Price': 0.5,
      Earmarks: `{"${Earmarks.NEW_GENERAL}":{"OCEAN":30000, "USD":30000}, "${Earmarks.NEW_OUTREACH}":{"OCEAN":40000, "USD":50000}, "${Earmarks.CORE_TECH}":{"OCEAN":50000, "USD":30000}}`,
      'Funding Available USD': 115000,
      'Basis Token': 'USD'
    },
    get: function (key) {
      return this.fields[key]
    }
  }

  allProposals = [
    {
      id: 'proposal_5',
      fields: {
        'Project Name': 'Pretty Pear',
        'USD Requested': 30000,
        'Voted Yes': 600,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_1',
      fields: {
        'Project Name': 'Oblong Apple',
        'USD Requested': 20000,
        'Voted Yes': 1000,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_4',
      fields: {
        'Project Name': 'Funky Fig',
        'USD Requested': 1000,
        'Voted Yes': 700,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_8',
      fields: {
        'Project Name': 'Warped Watermelon',
        'USD Requested': 1000,
        'Voted Yes': 400,
        'Voted No': 300
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_2',
      fields: {
        'Project Name': 'Swift Tangerine',
        'USD Requested': 1000,
        'Voted Yes': 1000,
        'Voted No': 1050
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_7',
      fields: {
        'Project Name': 'Grudging Grape',
        'USD Requested': 1000,
        'Voted Yes': 200,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_3',
      fields: {
        'Project Name': 'Bittersweet Lemon',
        'USD Requested': 1000,
        'Voted Yes': 800,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_6',
      fields: {
        'Project Name': 'Averse Avocado',
        'USD Requested': 1000,
        'Voted Yes': 500,
        'Voted No': 0
      },
      get: function (key) {
        return this.fields[key]
      }
    }
  ]
})

describe('Calculating Winners', function () {
  it('Check if earmarks structure OCEAN values are populated ', async function () {
    fundingRound.fields.Earmarks = `{"${Earmarks.NEW_GENERAL}":{"OCEAN":0, "USD":28000}, "${Earmarks.NEW_OUTREACH}":{"OCEAN":0, "USD":38000}, "${Earmarks.CORE_TECH}":{"OCEAN":0, "USD":48000}}`
    fundingRound.fields['Basis Token'] = 'USD'
    const tokenPrice = 0.5
    const basisToken = fundingRound.fields['Basis Token']
    const newEarmarks = await completeEarstructuresValues(
      fundingRound,
      tokenPrice,
      basisToken
    )

    for (const earmark in newEarmarks) {
      should.equal(
        newEarmarks[earmark].OCEAN,
        newEarmarks[earmark].USD / tokenPrice
      )
    }
  })

  it('Check if earmarks structure USD values are populated ', async function () {
    fundingRound.fields.Earmarks = `{"${Earmarks.NEW_GENERAL}":{"OCEAN":28000, "USD":0}, "${Earmarks.NEW_OUTREACH}":{"OCEAN":38000, "USD":0}, "${Earmarks.CORE_TECH}":{"OCEAN":48000, "USD":0}}`
    fundingRound.fields['Basis Token'] = 'OCEAN'
    const tokenPrice = 0.5
    const basisToken = fundingRound.fields['Basis Token']
    const newEarmarks = await completeEarstructuresValues(
      fundingRound,
      tokenPrice,
      basisToken
    )

    for (const earmark in newEarmarks) {
      should.equal(
        newEarmarks[earmark].USD,
        newEarmarks[earmark].OCEAN * tokenPrice
      )
    }
  })

  it('Sample data includes 3 proposals', function () {
    should.equal(allProposals.length, 8)
  })

  it('Retrieves all winning proposals sorted by vote count', function () {
    const winningProposals = getWinningProposals(allProposals, fundingRound)

    should.equal(winningProposals.length, 7)
    should.equal(winningProposals[0].id, 'proposal_1')
    should.equal(winningProposals[6].id, 'proposal_8')
  })

  it('Retrieves all losing proposals sorted by vote count', function () {
    const downvotedProposals = getDownvotedProposals(allProposals)

    should.equal(downvotedProposals.length, 1)
    should.equal(downvotedProposals[0].id, 'proposal_2')
  })

  it('Validates no winning earmarked proposals', function () {
    const oceanPrice = fundingRound.get('OCEAN Price')

    const earmarks = allProposals.filter((p) => p.get('Earmarks') !== undefined)
    const earmarkedResults = calculateWinningAllProposals(
      earmarks,
      fundingRound,
      oceanPrice
    )
    should.equal(earmarkedResults.winningProposals.length, 0)
    should.equal(earmarkedResults.fundsLeft, 110000)
  })

  it('Validates 1 winning earmarked proposals', function () {
    const oceanPrice = fundingRound.get('OCEAN Price')

    allProposals[0].fields.Earmarks = Earmarks.NEW_OUTREACH
    const earmarks = allProposals.filter((p) => p.get('Earmarks') !== undefined)
    const earmarkedResults = calculateWinningAllProposals(
      earmarks,
      fundingRound,
      oceanPrice
    )
    should.equal(earmarkedResults.winningProposals.length, 1)
  })

  it('Validates 1 winning earmark + 1 partial funding', function () {
    const oceanPrice = fundingRound.get('OCEAN Price')

    allProposals[0].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[1].fields.Earmarks = Earmarks.NEW_OUTREACH
    const earmarks = allProposals.filter((p) => p.get('Earmarks') !== undefined)
    const earmarkedResults = calculateWinningAllProposals(
      earmarks,
      fundingRound,
      oceanPrice
    )

    should.equal(earmarkedResults.winningProposals.length, 2)
    should.equal(earmarkedResults.winningProposals[0].get('USD Granted'), 30000)
    should.equal(
      earmarkedResults.winningProposals[0].get('OCEAN Granted'),
      60000
    )

    should.equal(earmarks.length, 2)
    should.equal(earmarks[1].get('USD Granted'), 20000)
    should.equal(earmarks[1].get('OCEAN Granted'), 40000)
  })

  it('Validates all Final Result parameters are correct.', function () {
    const downvotedProposals = getDownvotedProposals(allProposals)
    should.equal(downvotedProposals.length, 1)

    fundingRound.fields['Funding Available USD'] = 115000
    allProposals[0].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[1].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[5].fields['USD Requested'] = 3000
    const winningProposals = getWinningProposals(allProposals, fundingRound)
    const finalResults = calculateFinalResults(winningProposals, fundingRound)

    Logger.log(finalResults)

    // Validate all winning, not funded, and downvoted proposals add up
    should.equal(finalResults.earmarkedResults.winningProposals.length, 2)
    should.equal(finalResults.generalResults.winningProposals.length, 3)
    should.equal(finalResults.partiallyFunded.length, 1)
    should.equal(finalResults.notFunded.length, 1)

    should.equal(
      finalResults.earmarkedResults.winningProposals.length +
        finalResults.generalResults.winningProposals.length +
        finalResults.partiallyFunded.length +
        finalResults.notFunded.length +
        downvotedProposals.length,
      allProposals.length
    )

    // Validate all winning, not funded, and downvoted proposals have the right Proposal State
    should.equal(
      finalResults.earmarkedResults.winningProposals[0].fields[
        'Proposal State'
      ],
      'Granted'
    )
    should.equal(
      finalResults.generalResults.winningProposals[0].fields['Proposal State'],
      'Granted'
    )
    should.equal(
      finalResults.partiallyFunded[0].fields['Proposal State'],
      'Granted'
    )
    should.equal(
      finalResults.notFunded[0].fields['Proposal State'],
      'Not Granted'
    )
    should.equal(downvotedProposals[0].fields['Proposal State'], 'Down Voted')

    // Validate USD amount adds up
    const earmarkedUSDGranted =
      finalResults.earmarkedResults.winningProposals.reduce(
        (total, p) => total + p.get('USD Granted'),
        0
      )
    const generalUSDGranted =
      finalResults.generalResults.winningProposals.reduce(
        (total, p) => total + p.get('USD Granted'),
        0
      )
    const partialUSDGranted = finalResults.partiallyFunded.reduce(
      (total, p) => total + p.get('USD Granted'),
      0
    )

    Logger.log(earmarkedUSDGranted, generalUSDGranted, partialUSDGranted)

    should.equal(
      earmarkedUSDGranted + generalUSDGranted + partialUSDGranted,
      55000
    )
  })

  it('Validates gsheet output is correct.', async function () {
    const downvotedProposals = getDownvotedProposals(allProposals)
    should.equal(downvotedProposals.length, 1)

    allProposals[0].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[1].fields.Earmarks = Earmarks.NEW_OUTREACH
    const winningProposals = getWinningProposals(allProposals, fundingRound)
    const finalResults = calculateFinalResults(winningProposals, fundingRound)

    const downvotedResults = await dumpResultsToGSheet(downvotedProposals)
    const earmarkedResults = await dumpResultsToGSheet(
      finalResults.earmarkedResults.winningProposals
    )
    const generalResults = await dumpResultsToGSheet(
      finalResults.generalResults.winningProposals
    )
    const partiallyFundedResults = await dumpResultsToGSheet(
      finalResults.partiallyFunded
    )
    const notFundedResults = await dumpResultsToGSheet(finalResults.notFunded)

    // Validate all winning, not funded, and downvoted proposals add up
    should.equal(downvotedResults.length, 2)
    should.equal(earmarkedResults.length, 3)
    should.equal(generalResults.length, 6)
    should.equal(partiallyFundedResults.length, 1)
    should.equal(notFundedResults.length, 1)
  })

  it('Test new earmarks structure', function () {
    const oceanPrice = fundingRound.get('OCEAN Price')

    // set earmarks for proposals and add USD Granted
    allProposals[0].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[0].fields['USD Requested'] = 2000

    allProposals[1].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[1].fields['USD Requested'] = 2000

    allProposals[2].fields.Earmarks = Earmarks.NEW_OUTREACH
    allProposals[2].fields['USD Requested'] = 2000

    allProposals[3].fields.Earmarks = Earmarks.CORE_TECH
    allProposals[3].fields['USD Requested'] = 2000

    allProposals[4].fields.Earmarks = Earmarks.CORE_TECH
    allProposals[4].fields['USD Requested'] = 2000

    allProposals[5].fields['USD Granted'] = 2000

    // filter all proposals that have Earmarks
    const proposalsWithEarmark = allProposals.filter(
      (p) => p.get('Earmarks') !== undefined
    )

    // calculate and get all winning proposals
    const earmarkedResults = calculateWinningAllProposals(
      proposalsWithEarmark,
      fundingRound,
      oceanPrice
    )
    should.equal(earmarkedResults.winningProposals.length, 5)
  })
})