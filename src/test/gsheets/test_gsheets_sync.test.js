/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const {
  syncGSheetsActiveProposalVotes
} = require('../../gsheets/sync_gsheets_active_proposal_votes_snapshot')

// Tests Skip. Use them to verify that data is getting synced/dumped properly.
describe('GSheets Sync functionality', function () {
  it.skip('Validates Round 8 is working', async function () {
    const curRoundNumber = 8
    await syncGSheetsActiveProposalVotes(curRoundNumber)
  }) // .timeout(30000)
})