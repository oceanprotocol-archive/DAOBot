/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()
const should = require('chai').should()

const {
  RoundState,
  getCurrentRound,
  getFundingRoundFromSpecificTable
} = require('../../airtable/rounds/funding_rounds')

const {
  deleteProposalRecords,
  getTableFields,
  addRecordsToAirtable,
  updateRoundRecord,
  getProposalsSelectQueryFromBaseId
} = require('../../airtable/airtable_utils')
const main = require('../../scripts/update_funding_round')

beforeEach(() => {
  process.env.AIRTABLE_BASEID = 'appe3NtI7wcUn7qqq'
})

function addDaysToDate(days) {
  var res = new Date()
  res.setDate(res.getDate() + days)
  return res.toISOString()
}

function subtractsDaysFromDate(days) {
  var res = new Date()
  res.setDate(res.getDate() - days)
  return res.toISOString()
}

const newFundingRounds = [
  {
    fields: {
      Name: 'Round 1',
      'Max Grant': 13000,
      Earmarks:
        '{\n"New Entrants":{"OCEAN":0,"USD":0}, "General": {"OCEAN: 65000,"USD": 0}\n}',
      'Proposals Granted': 5,
      'Funding Available': 65000,
      'Start Date': '2021-12-10T23:59:00.000Z',
      'Proposals Due By': '2021-12-14T23:59:00.000Z',
      'Voting Starts': '2021-12-16T23:59:00.000Z',
      'Voting Ends': '2021-12-21T23:59:00.000Z',
      Proposals: 9,
      Round: '1',
      'Round State': RoundState.Voting,
      'Vote Type': 'single-choice',
      'Ballot Type': 'Batch',
      'Basis Currency': 'OCEAN'
    }
  },
  {
    fields: {
      Name: 'Round 16',
      'OCEAN Price': 0.67,
      Earmarks:
        '{\n"New Entrants":{"OCEAN":0,"USD":0},\n"General": {"OCEAN": 90000,"USD": 0}\n}',
      'Proposals Granted': 9,
      'Funding Available': 90000,
      'Start Date': addDaysToDate(0),
      'Proposals Due By': addDaysToDate(2),
      'Voting Starts': addDaysToDate(4),
      'Voting Ends': addDaysToDate(6),
      Proposals: 3,
      Round: '2',
      'Round State': undefined,
      'Vote Type': 'single-choice',
      'Ballot Type': 'Batch',
      'Basis Currency': 'OCEAN'
    }
  }
]

// Tests Skip. Use them to verify that data is getting syncd/dumped properly.
describe('Start Funding Round', function () {
  process.env.AIRTABLE_BASEID = 'appe3NtI7wcUn7qqq'

  it('Removes all proposals and creates new ones', async function () {
    const proposals = await getTableFields(
      'Proposals',
      'appe3NtI7wcUn7qqq',
      'All Proposals'
    )
    await deleteProposalRecords(proposals, 'Proposals')
    const newProposals = await getProposalsSelectQueryFromBaseId(
      `{Round} = 15`,
      'appeszr4DVj3R9IbF'
    )
    const newProposalsFormated = []
    var index = 0
    // TO DO: Fix all the fileds that are set to undefined
    newProposals.forEach((record) => {
      if (index >= 10) return
      record.fields['Funding Date'] = undefined
      record.fields['Created Date'] = undefined
      record.fields.RecordId = undefined
      record.fields.UUID = undefined
      record.fields['Last Deliverable Update'] = undefined

      // This changes are optional
      record.fields['Proposal Standing'] = undefined
      record.fields['Proposal State'] = undefined
      record.fields['Basis Currency'] = 'USD'
      record.fields.Round = undefined

      const formatedProposal = { fields: { ...record.fields } }
      newProposalsFormated.push(formatedProposal)
      ++index
    })
    await addRecordsToAirtable(newProposalsFormated, 'Proposals')
  })

  it('Removes all funding rounds and creates new ones', async function () {
    const fundingRounds = await getTableFields(
      'Funding Rounds',
      'appe3NtI7wcUn7qqq',
      'Rounds'
    )
    await deleteProposalRecords(fundingRounds, 'Funding Rounds')

    // get funding round from specified table and sets it up for testing requirements
    const newImportedFundingRound = await getFundingRoundFromSpecificTable(
      15,
      'appeszr4DVj3R9IbF'
    )
    newImportedFundingRound.fields['Round State'] = undefined
    newImportedFundingRound.fields['Start Date'] = await subtractsDaysFromDate(
      1
    )
    newImportedFundingRound.fields['Proposals Due By'] = await addDaysToDate(2)
    newImportedFundingRound.fields['Voting Starts'] = await addDaysToDate(3)
    newImportedFundingRound.fields['Voting Ends'] = await addDaysToDate(4)
    newFundingRounds[1] = { fields: { ...newImportedFundingRound.fields } }

    // configure previous round parameters
    newFundingRounds[0].fields.Round = (
      parseInt(newImportedFundingRound.fields.Round) - 1
    ).toString()
    newFundingRounds[0].fields.Name =
      'Round ' + (parseInt(newImportedFundingRound.fields.Round) - 1).toString()
    await addRecordsToAirtable(newFundingRounds, 'Funding Rounds')
  })

  it('Tests that last round is finnished and next round is started', async function () {
    await main()
    const curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'], RoundState.Started)
  })

  it('Tests that started round is going into DD period', async function () {
    let curRound = await getCurrentRound()
    const roundUpdate = {
      records: [
        {
          id: curRound.id,
          fields: {
            'Proposals Due By': subtractsDaysFromDate(1)
          }
        }
      ]
    }
    await updateRoundRecord(roundUpdate)
    await main()
    curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'], RoundState.DueDiligence)
  })

  it('Tests that current round is going into Voting state', async function () {
    let curRound = await getCurrentRound()
    const roundUpdate = {
      records: [
        {
          id: curRound.id,
          fields: {
            'Voting Starts': subtractsDaysFromDate(1)
          }
        }
      ]
    }
    await updateRoundRecord(roundUpdate)
    await main()
    curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'], RoundState.Voting)
  })
})
