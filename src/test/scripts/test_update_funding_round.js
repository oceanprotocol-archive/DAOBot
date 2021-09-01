global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const expect = require('chai').expect;
const {getProposalsSelectQuery} = require('../../airtable/airtable_utils')
const {getCurrentRound} = require('../../airtable/rounds/funding_rounds')
const {processAirtableNewProposals} = require('../../airtable/process_airtable_new_proposals')
const {prepareProposalsForSnapshot} = require('../../snapshot/prepare_snapshot_received_proposals_airtable')
const {submitProposalsToSnapshot} = require('../../snapshot/submit_snapshot_accepted_proposals_airtable')
const {sleep} = require('../../functions/utils')

// To run these tests, you should setup the DB beforehand
// Requirement: 1 proposal in DB w/o "Round" or "Proposal State" params
// 1. In DB - Delete a proposal "Round" + "Propoal State" params.
describe('Functionally test updateFundingRound', function() {
    it.skip('Validates proposals that are not been initialized.', async function() {
        let inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)
        expect(inactiveProposals.length).to.be.greaterThan(0);
    });

    it('Initializes proposals for this round.', async function() {
        let inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)

        if( inactiveProposals.length > 0 ) {
            const currentRound = await getCurrentRound()
            if( currentRound !== undefined ) {
                const curRoundNumber = currentRound.get('Round')
                await processAirtableNewProposals(curRoundNumber)

                await sleep(500)
                inactiveProposals = await getProposalsSelectQuery(`AND({Round} = "", {Proposal State} = "", "true")`)
                should.equal(inactiveProposals.length, 0);
            }
        }
    }).timeout(5000);

    it('Processes proposals for snapshot.', async function() {
        const currentRound = await getCurrentRound()
        if( currentRound !== undefined ) {
            await prepareProposalsForSnapshot(currentRound)

            await sleep(500)
            const curRoundNumber = currentRound.get('Round')
            let acceptedProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", {Proposal State} = "Accepted", "true")`)
            expect(acceptedProposals.length).to.be.greaterThan(0);
        }
    }).timeout(5000);

    it('Deploys proposals to snapshot.', async function() {
        const currentRound = await getCurrentRound()
        if( currentRound !== undefined ) {
            // Submit to snapshot + Enter voting state
            const curRoundNumber = currentRound.get('Round')
            await submitProposalsToSnapshot(curRoundNumber)

            await sleep(500)
            let acceptedProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", {Proposal State} = "Running", "true")`)
            expect(acceptedProposals.length).to.be.greaterThan(0);
        }
    }).timeout(90000);
});
