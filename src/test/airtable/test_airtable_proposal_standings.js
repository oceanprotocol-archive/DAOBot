const should = require('chai').should();
const expect = require('chai').expect;
const {Standings, Disputed, getProposalRecord, processProposalStandings, processHistoricalStandings} = require('../../airtable/proposal_standings')

var record = undefined
var allProposals = []

beforeEach(async function() {
    record = undefined
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
            'Disputed Status': '',
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
            'Disputed Status': '',
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
            'Disputed Status': '',
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
            'Disputed Status': '',
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

describe('Calculating Project Standings', function() {
    it('Sample data includes 4 proposals from one project', function() {
        should.equal(allProposals.length, 4);
    });

    it('Validate complete & refunded standing', async function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })

        // Process proposals and historical standings
        let proposalStandings = await processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Verify every proposal in history is completed or refunded
        let projectName = allProposals[0].get('Project Name')
        proposalStandings[projectName].forEach((x) => {
            expect(x.fields['Proposal Standing']).to.be.oneOf([Standings.Completed, Standings.Refunded])
        })
    });

    it('Validate complete & refunded => invalid', async function() {
        // Complete every proposal
        allProposals.forEach((x) => {
            x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
        })
        // Set the very first proposal to not be completed
        allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

        // Process all proposals
        let proposalStandings = await processProposalStandings(allProposals);
        processHistoricalStandings(proposalStandings);

        // Validate that all proposals are Incomplete
        let projectName = allProposals[0].get('Project Name')
        proposalStandings[projectName].forEach((x) => {
            should.equal(x.fields['Proposal Standing'], Standings.Incomplete);
        })
    });
});
