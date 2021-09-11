global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getRoundsSelectQuery} = require('../../airtable/airtable_utils')
const {syncAirtableActiveProposalVotes} = require('../../airtable/sync_airtable_active_proposal_votes_snapshot')
const {processFundingRoundComplete} = require('../../airtable/process_airtable_funding_round_complete')

// Tests Skip. Use them to verify that data is getting syncd/dumped properly.
describe('Airtable sync functionality', function() {
    it.skip('Validates Round 8 Sync is working', async function() {
        let curRoundNumber = 8
        await syncAirtableActiveProposalVotes(curRoundNumber)
    }).timeout(10000)

    it.skip('Validates Round 8 Completion is working', async function() {
        const curRoundNumber = 8
        const curRound = await getRoundsSelectQuery(`{Round} = "${curRoundNumber}"`)

        await processFundingRoundComplete(curRound[0], curRoundNumber)
    }).timeout(10000)
});
