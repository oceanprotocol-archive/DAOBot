/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const {
  getRoundsSelectQuery,
  sumSnapshotVotesToAirtable
} = require('../../airtable/airtable_utils')
const {
  syncAirtableActiveProposalVotes
} = require('../../airtable/sync_airtable_active_proposal_votes_snapshot')
const {
  processFundingRoundComplete
} = require('../../airtable/process_airtable_funding_round_complete')
const { expect } = require('chai')

// Tests Skip. Use them to verify that data is getting syncd/dumped properly.
describe('Airtable sync functionality', function () {
  it('Should map and return the votes for each proposal', async function () {
    const proposals = [
      {
        id: 'rec1',
        'Snapshot Batch Index': 1,
        'Snapshot Batch Index No': 2,
        ipfsHash: 'hash',
        get: function (key) {
          return this[key]
        }
      },
      {
        id: 'rec2',
        'Snapshot Batch Index': 3,
        'Snapshot Batch Index No': 4,
        ipfsHash: 'hash',
        get: function (key) {
          return this[key]
        }
      },
      {
        id: 'rec3',
        'Snapshot Batch Index': 5,
        'Snapshot Batch Index No': 6,
        ipfsHash: 'hash',
        get: function (key) {
          return this[key]
        }
      }
    ]
    const scores = {
      hash: {
        1: 100,
        2: 200,
        3: 500,
        4: 1000,
        5: 2000,
        6: 100
      }
    }
    const result = await sumSnapshotVotesToAirtable(proposals, scores)

    let i = 1
    result.forEach(function (record) {
      expect(record.fields['Voted Yes']).to.be.eq(scores.hash[i++])
      expect(record.fields['Voted No']).to.be.eq(scores.hash[i++])
    })
  })

  it.skip('Validates Round 8 Sync is working', async function () {
    const curRoundNumber = 8
    await syncAirtableActiveProposalVotes(curRoundNumber)
  }) // .timeout(10000)

  it.skip('Validates Round 8 Completion is working', async function () {
    const curRoundNumber = 8
    const curRound = await getRoundsSelectQuery(`{Round} = "${curRoundNumber}"`)

    await processFundingRoundComplete(curRound[0], curRoundNumber)
  }) // .timeout(10000)
})
