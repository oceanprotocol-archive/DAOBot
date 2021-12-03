/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const {
  syncGSheetsActiveProposalVotes
} = require('../../gsheets/sync_gsheets_active_proposal_votes_snapshot')
const { BallotType } = require('../../snapshot/snapshot_utils')

beforeEach(() => {
  jest.setTimeout(20000)
})

afterAll(() => {
  jest.clearAllTimers()
})

// Tests Skip. Use them to verify that data is getting synced/dumped properly.
describe('GSheets Sync functionality', function () {
  it('Validates Round 8 is working', async function () {
    await syncGSheetsActiveProposalVotes(curRoundNumber, BallotType.Batch)
  })
})
