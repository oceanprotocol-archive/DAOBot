global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const expect = require('chai').expect;
const {getProposalsSelectQuery} = require('../../airtable/airtable_utils')
const {getCurrentRound} = require('../../airtable/rounds/funding_rounds')
const {processAirtableNewProposals} = require('../../airtable/process_airtable_new_proposals')
const {prepareProposalsForSnapshot} = require('../../snapshot/prepare_snapshot_received_proposals_airtable')

describe('Testing Proposals', function() {
    it.skip('Validates proposals that are not been initialized.', async function() {
        let inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)
        should.equal(inactiveProposals.length, 1);
    });

    it.skip('Initializes proposals for this round.', async function() {
        let inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)

        if( inactiveProposals.length > 0 ) {
            const currentRound = await getCurrentRound()
            if( currentRound !== undefined ) {
                const curRoundNumber = currentRound.get('Round')
                await processAirtableNewProposals(curRoundNumber)

                inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)
                should.equal(inactiveProposals.length, 0);
            }
        }
    });

    it('Processes proposals for snapshot.', async function() {
        const currentRound = await getCurrentRound()
        if( currentRound !== undefined ) {
            await prepareProposalsForSnapshot(currentRound)

            const curRoundNumber = currentRound.get('Round')
            let acceptedProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", {Proposal State} = "Accepted", "true")`)
            expect(acceptedProposals.length).to.be.greaterThan(0);
        }
    }).timeout(5000);
});
