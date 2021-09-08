global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const expect = require('chai').expect;
const {State, Standings, Disputed, getProposalRecord, getProjectsLatestProposal, processProposalStandings, processHistoricalStandings, updateCurrentRoundStandings} = require('../../airtable/proposals/proposal_standings')

var currentProposals = undefined
var allProposals = []

beforeEach(async function() {
    currentProposals = [{
        id: 'proposal_5',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': State.Funded,
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'May 01, 2021',
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    },
    {
        id: 'proposal_1_new_existing_entrant',
        fields: {
            'Project Name': 'New Existing Entrant',
            'Proposal URL': 'www.new-existing-entrant.com',
            'Proposal State': undefined,
            'Proposal Standing': undefined,
            'Deliverable Checklist': undefined,
            'Last Deliverable Update': undefined,
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    },
    {
        id: 'proposal_1_new_entrant',
        fields: {
            'Project Name': 'New Entrant',
            'Proposal URL': 'www.new-entrant.com',
            'Proposal State': undefined,
            'Proposal Standing': undefined,
            'Deliverable Checklist': undefined,
            'Last Deliverable Update': undefined,
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    }]
    allProposals = [{
        id: 'proposal_1',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': State.Funded,
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'Jan 01, 2021',
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    },{
        id: 'proposal_2',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': State.Funded,
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'Feb 01, 2021',
            'Refund Transaction': '0xRefundTx',
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    },{
        id: 'proposal_3',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': State.Funded,
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'Mar 01, 2021',
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    },{
        id: 'proposal_4',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': State.Funded,
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'Apr 01, 2021',
            'Refund Transaction': undefined,
            'Disputed Status': undefined,
        },
        get: function (key) {
            return this.fields[key];
        }
    }]
});

describe('Calculating Proposal Standings', function() {
    it('Sample data includes 4 proposals from one project', function() {
        should.equal(allProposals.length, 4);
    });

    it('Validates all initial proposal standings', function() {
        let record = getProposalRecord(allProposals[0]);
        should.equal(record.fields['Proposal Standing'], Standings.Incomplete);

        record = getProposalRecord(allProposals[1]);
        should.equal(record.fields['Proposal Standing'], Standings.Refunded);

        record = getProposalRecord(allProposals[2]);
        should.equal(record.fields['Proposal Standing'], Standings.Incomplete);

        record = getProposalRecord(allProposals[3]);
        should.equal(record.fields['Proposal Standing'], Standings.Completed);
    });

    it('Validates Incomplete becomes Complete', function() {
        let record = getProposalRecord(allProposals[0]);
        should.equal(record.fields['Proposal Standing'], Standings.Incomplete);

        allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        record = getProposalRecord(allProposals[0]);
        should.equal(record.fields['Proposal Standing'], Standings.Completed);
    });

    it('Validates Refunded proposals remains Refunded', function() {
        let record = getProposalRecord(allProposals[1]);
        should.equal(record.fields['Proposal Standing'], Standings.Refunded);

        allProposals[1].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        record = getProposalRecord(allProposals[1]);
        should.equal(record.fields['Proposal Standing'], Standings.Refunded);
    });

    it('Validates Incomplete proposals become Completed', function() {
        let record = getProposalRecord(allProposals[2]);
        should.equal(record.fields['Proposal Standing'], Standings.Incomplete);

        allProposals[2].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        record = getProposalRecord(allProposals[2]);
        should.equal(record.fields['Proposal Standing'], Standings.Completed);
    });
});

describe('Process Project Standings', function() {
    it('Sample data includes 4 proposals from one project', function() {
        should.equal(allProposals.length, 4);
    });

    it('All proposalStandings are Completed or Refunded', async function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })

        // Process proposals and historical standings
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Verify every proposal in history is completed or refunded
        let projectName = allProposals[0].get('Project Name')
        proposalStandings[projectName].forEach((x) => {
            expect(x.fields['Proposal Standing']).to.be.oneOf([Standings.Completed, Standings.Refunded])
        })
    });

    it('If proposalStanding is Incomplete then remainder of projectStanding is Incomplete', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Validate that all proposals are Incomplete
        let projectName = allProposals[0].get('Project Name')
        proposalStandings[projectName].forEach((x) => {
            should.equal(x.fields['Proposal Standing'], Standings.Incomplete);
        })
    });

    it('Validate [latestProposal] is head of indexed proposals ', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Validate that all proposals are Incomplete
        let projectName = allProposals[0].get('Project Name')
        proposalStandings[projectName].forEach((x) => {
            should.equal(x.fields['Proposal Standing'], Standings.Incomplete);
        })

        // Step 3 - Report the latest (top of stack) proposal standing
        // Retrieve the last proposals from projectStandings
        let latestProposals = getProjectsLatestProposal(proposalStandings)
        should.equal(latestProposals[projectName]['id'], allProposals[allProposals.length-1]['id']);
    });

    it('Validate [currentProposalStanding] maps to head of indexed proposals', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Step 3 - Report the latest (top of stack) proposal standing from each project
        // latestProposal should equal head of each project
        let latestProposals = getProjectsLatestProposal(proposalStandings)
        should.equal(latestProposals['test']['id'], allProposals[allProposals.length-1]['id']);

        let currentProposalStandings = processProposalStandings(currentProposals)
        updateCurrentRoundStandings(currentProposalStandings, latestProposals)
        should.equal(currentProposalStandings['test'][0].fields['Proposal Standing'], latestProposals['test'].fields['Proposal Standing'])
        should.equal(currentProposalStandings['test'][0].fields['Proposal Standing'], Standings.Incomplete);
    });

    it('Validate [currentProposalStanding] New Entrants, and Unmatched have no standing', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Step 3 - Report the latest (top of stack) proposal standing from each project
        // latestProposal should equal head of each project
        let latestProposals = getProjectsLatestProposal(proposalStandings)
        should.equal(latestProposals['test']['id'], allProposals[allProposals.length-1]['id']);

        let currentProposalStandings = processProposalStandings(currentProposals)
        updateCurrentRoundStandings(currentProposalStandings, latestProposals)
        should.equal(currentProposalStandings['test'][0].fields['Proposal Standing'], latestProposals['test'].fields['Proposal Standing'])
        should.equal(currentProposalStandings['test'][0].fields['Proposal Standing'], Standings.Incomplete);

        should.equal(currentProposalStandings['New Existing Entrant'][0].fields['Proposal Standing'], null);
        should.equal(currentProposalStandings['New Existing Entrant'][0].fields['Proposal State'], undefined);
        should.equal(currentProposalStandings['New Entrant'][0].fields['Proposal Standing'], null);
        should.equal(currentProposalStandings['New Entrant'][0].fields['Proposal State'], undefined);
    });

    it('Validates [Bad Project State] is cleaned up', function() {
        // Initialize Proposal[1] to not be refunded
        // Process all proposals
        allProposals[1].fields['Refund Transaction'] = undefined

        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Validate proposals are incomplete and bad URLs are reporting properly
        should.equal(proposalStandings['test'][0].fields['Proposal Standing'], Standings.Incomplete)
        should.equal(proposalStandings['test'][1].fields['Proposal Standing'], Standings.Incomplete)

        let badUrl0 = proposalStandings['test'][0].fields['Outstanding Proposals']
        let badUrl1 = proposalStandings['test'][1].fields['Outstanding Proposals']
        let badUrl0Count = badUrl0.split('\n')
        let badUrl1Count = badUrl1.split('\n')
        should.equal(badUrl0Count.length, 2)
        should.equal(badUrl1Count.length, 3)

        // Update initial proposal to be completed
        allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

        // Process standings again
        proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Validate first proposal is completed, and [Oustanding URLs] is correct.
        should.equal(proposalStandings['test'][0].fields['Proposal Standing'], Standings.Completed)
        should.equal(proposalStandings['test'][1].fields['Proposal Standing'], Standings.Incomplete)

        badUrl0 = proposalStandings['test'][0].fields['Outstanding Proposals']
        badUrl1 = proposalStandings['test'][1].fields['Outstanding Proposals']
        badUrl0Count = badUrl0.split('\n')
        should.equal(badUrl0Count.length, 1)

        badUrl1Count = badUrl1.split('\n')
        should.equal(badUrl1Count.length, 2)
    });

    it('Validates [Ongoing Disputed Proposals] are a bad state. Not Eligible for grants.', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Disputed Status'] = Disputed.Ongoing

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        for (let i = 1; i < proposalStandings.length; i++) {
            should.equal(proposalStandings['test'][i].fields['Proposal Standing'], Standings.Dispute)
        }
    });

    it('Validates [Completed Disputes] is a good state.', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Disputed Status'] = Disputed.Resolved

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        for (let i = 1; i < proposalStandings.length; i++) {
            should.equal(proposalStandings['test'][i].fields['Proposal Standing'], Standings.Completed)
        }
    });

    it('Validates projects not funded, do not receive a standing.', function() {
        // Set the very first proposal to not be completed
        allProposals[0].fields['Proposal State'] = State.Rejected
        allProposals[1].fields['Proposal State'] = State.NotGranted
        allProposals[2].fields['Proposal State'] = State.DownVoted

        // Zero every completion
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = undefined
        })
        // Complete the last one
        allProposals[3].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        should.equal(proposalStandings['test'][0].fields['Proposal Standing'], undefined)
        should.equal(proposalStandings['test'][1].fields['Proposal Standing'], undefined)
        should.equal(proposalStandings['test'][2].fields['Proposal Standing'], undefined)
    });

    it('Validates downvoted/declined projects without standing receive previous standings.', function() {
        // Set the very first proposal to not be completed
        allProposals[0].fields['Proposal State'] = State.Funded
        allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

        allProposals[1].fields['Proposal State'] = State.Funded
        allProposals[1].fields['Refund Transaction'] = undefined
        allProposals[1].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

        allProposals[2].fields['Proposal State'] = State.Funded
        allProposals[2].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

        allProposals[3].fields['Proposal State'] = State.DownVoted
        allProposals[3].fields['Deliverable Checklist'] = undefined

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        should.equal(proposalStandings['test'][0].fields['Proposal Standing'], Standings.Completed)
        should.equal(proposalStandings['test'][1].fields['Proposal Standing'], Standings.Completed)
        should.equal(proposalStandings['test'][2].fields['Proposal Standing'], Standings.Completed)
        should.equal(proposalStandings['test'][3].fields['Proposal Standing'], Standings.Completed)
    });

    it('Validates State.Received proposals report Standing.NoOcean.', function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })

        // Process all proposals
        let proposalStandings = processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Step 3 - Report the latest (top of stack) proposal standing from each project
        // latestProposal should equal head of each project
        let latestProposals = getProjectsLatestProposal(proposalStandings)

        currentProposals[0].fields['Deployment Ready'] = 'No'
        currentProposals[0].fields['Deliverable Checklist'] = undefined
        currentProposals[0].fields['Proposal State'] = State.Received

        let currentProposalStandings = processProposalStandings(currentProposals)
        updateCurrentRoundStandings(currentProposalStandings, latestProposals)

        should.equal(currentProposalStandings['test'][0].fields['Proposal Standing'], Standings.NoOcean);
    });
});
