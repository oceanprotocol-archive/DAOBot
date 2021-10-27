/* eslint-env mocha */

global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const expect = require('chai').expect;
const should = require('chai').should();
const {getCurrentRound, filterCurrentRound} = require('../../airtable/rounds/funding_rounds')
const {getRoundsSelectQuery} = require('../../airtable/airtable_utils')

var allRounds = []

beforeEach(async function() {
    allRounds = [{
        id: 'round7',
        fields: {
            'Name': 'Round 7',
            'Round': '7',
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
            'Nmae': 'Round 8',
            'Round': '8',
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
            'Name': 'Round 9',
            'Round': '9',
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

        let currentRound = filterCurrentRound(allRounds)

        Date.now = originalDateNow
        should.equal(currentRound.id, allRounds[1].id);
    });
});

// Tests against Airtable DB
describe('Airtable test', () => {
    it('Validates "Round 8" record from "Funding Rounds" automatically', async () => {
        const mockDateMay = '2021-08-04'
        function mockDateNow() {
            return 'Aug 04, 2021 12:00'
        }

        const originalDateNow = Date.now
        Date.now = mockDateNow

        let roundsFound = await getRoundsSelectQuery(`AND({Proposals Due By} <= "${mockDateMay}", {Voting Ends} >= "${mockDateMay}", "true")`)

        Date.now = originalDateNow
        should.equal(roundsFound[0].get('Round'), allRounds[1].get('Round'));
    });

    it('Validates Current Round from many "Funding Round" records', async () => {
        const mockDateMay = '2021-08-04'
        function mockDateNow() {
            return 'Aug 04, 2021 12:00'
        }

        const originalDateNow = Date.now
        Date.now = mockDateNow

        const roundsFound = await getRoundsSelectQuery(`{Proposals Due By} <= "${mockDateMay}"`)
        const currentRound = filterCurrentRound(roundsFound)

        Date.now = originalDateNow
        should.equal(currentRound.get('Round'), allRounds[1].get('Round'));
    });

    it('Validates there is only one record from Airtable based on today', async () => {
        const now = new Date().toISOString().split('T')[0]
        const roundsMatch = await getRoundsSelectQuery(`AND({Start Date} <= "${now}", {Voting Ends} >= "${now}", "true")`)

        should.equal(roundsMatch.length, 1);
    });

    it('Validates getCurrentRecord returns a single record', async () => {
        const currentRound = await getCurrentRound()

        should.exist(currentRound);
        expect(currentRound).not.to.be.undefined;
    });
});
