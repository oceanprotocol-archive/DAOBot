global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const expect = require('chai').expect;
const {Standings, Disputed, getProposalRecord, getProjectsLatestProposal, processProposalStandings, processHistoricalStandings, updateCurrentRoundStandings} = require('../../airtable/proposals/proposal_standings')

var currentProposals = undefined
var allProposals = []

beforeEach(async function() {
    currentProposals = [{
        id: 'proposal_5',
        fields: {
            'Project Name': 'test',
            'Proposal URL': 'www.testurl.com',
            'Proposal State': 'myState',
            'Proposal Standing': undefined,
            'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
            'Last Deliverable Update': 'May 01, 2021',
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
            'Proposal State': 'myState',
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
            'Proposal State': 'myState',
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
            'Proposal State': 'myState',
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
            'Proposal State': 'myState',
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

    it('Validate latestProposal === lastProposal in allProposals ', function() {
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

    it('Validate currentProposalStanding === latestProposalStading', function() {
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

        // Step 3 - Report the latest (top of stack) proposal standing from each project
        // Validate the top proposal we get == is the last proposal inside projectStandings
        // Update the Submitted Proposals for funding, to reflect the Project Standing
        let latestProposals = getProjectsLatestProposal(proposalStandings)
        should.equal(latestProposals[projectName]['id'], allProposals[allProposals.length-1]['id']);

        let currentProposalStandings = processProposalStandings(currentProposals)
        updateCurrentRoundStandings(currentProposalStandings, latestProposals)
        should.equal(currentProposalStandings[projectName][0].fields['Proposal Standing'], latestProposals[projectName].fields['Proposal Standing'])
        should.equal(currentProposalStandings[projectName][0].fields['Proposal Standing'], Standings.Incomplete);
    });
});
