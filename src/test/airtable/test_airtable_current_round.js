global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const expect = require('chai').expect;
const {getCurrentRound} = require('../../airtable/rounds/funding_rounds')

var allRounds = []

beforeEach(async function() {
    allRounds = [{
        id: 'round7',
        fields: {
            'Round': 'Round 7',
            'Start Date': 'June 8, 2021 00:00',
            'Proposals Due By': 'July 6, 2021 23:59',
            'Voting Starts': 'July 8, 2021 23:59',
            'Voting Ends': 'July 12, 2021 23:59',
            'Earmark Percentage': 0.35,
            'Max Grant': 32000,
            'Earmarked': 140000,
            'Funding Available': 400000,
            'Max Grant USD': 17600,
            'Earmarked USD': 96250,
            'Funding Available USD': 275000,
        },
        get: function (key) {
            return this.fields[key];
        }
    },{
        id: 'round8',
        fields: {
            'Round': 'Round 8',
            'Start Date': 'July 13, 2021 00:00',
            'Proposals Due By': 'August 3, 2021 23:59',
            'Voting Starts': 'August 5, 2021 23:59',
            'Voting Ends': 'August 9, 2021 23:59',
            'Earmark Percentage': 0.35,
            'Max Grant': 32000,
            'Earmarked': 140000,
            'Funding Available': 400000,
            'Max Grant USD': 17600,
            'Earmarked USD': 96250,
            'Funding Available USD': 275000,
        },
        get: function (key) {
            return this.fields[key];
        }
    },{
        id: 'round9',
        fields: {
            'Round': 'Round 8',
            'Start Date': 'August 10, 2021 00:00',
            'Proposals Due By': 'September 7, 2021 23:59',
            'Voting Starts': 'September 9, 2021 23:59',
            'Voting Ends': 'September 13, 2021 23:59',
            'Earmark Percentage': 0.35,
            'Max Grant': 32000,
            'Earmarked': 140000,
            'Funding Available': 400000,
            'Max Grant USD': 17600,
            'Earmarked USD': 96250,
            'Funding Available USD': 275000,
        },
        get: function (key) {
            return this.fields[key];
        }
    }]
});

describe('Get Current Round', function() {
    it('Sample data includes 3 rounds', function() {
        should.equal(allRounds.length, 3);
    });

    it('Gets correct round based on sample date', function() {

        function mockDateNow() {
            return 'Jul 26, 2021 12:00'
        }

        const originalDateNow = Date.now
        Date.now = mockDateNow

        let currentRound = getCurrentRound(allRounds)

        Date.now = originalDateNow
        should.equal(currentRound.id, allRounds[1].id);
    });
});
