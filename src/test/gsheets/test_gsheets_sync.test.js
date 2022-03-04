/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const {
  syncGSheetsActiveProposalVotes
} = require('../../gsheets/sync_gsheets_active_proposal_votes_snapshot')
const { BallotType } = require('../../snapshot/snapshot_utils')

afterAll(() => {
  jest.clearAllTimers()
})

// Tests Skip. Use them to verify that data is getting synced/dumped properly.
describe('GSheets Sync functionality', function () {
  it.skip('Validates Round 11 is working', async function () {
    const curRoundNumber = 11
    const ballotType = BallotType.Batch
    await syncGSheetsActiveProposalVotes(curRoundNumber, ballotType)
  })
})

describe('Round Testing', function () {
  it('GSheet Sync Functionality is working', async function () {
    const curRoundNumber = 15
    const ballotType = BallotType.Batch
    await syncGSheetsActiveProposalVotes(curRoundNumber, ballotType)
  })
})
