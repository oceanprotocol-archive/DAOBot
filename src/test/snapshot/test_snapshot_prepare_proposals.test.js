/* eslint-env mocha */

global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const expect = require('chai').expect;
const should = require('chai').should();
const {getCurrentRound} = require('../../airtable/rounds/funding_rounds')
const {web3} = require('../../functions/web3')

// Tests against Airtable against DB
describe('Airtable test', () => {
    it('Validates date and time parameters are properly transformed', async () => {
        function mockDateNow() {
            return 'Jul 26, 2021 12:00'
        }

        // Override Date.now
        const originalDateNow = Date.now
        Date.now = mockDateNow

        const curRound = await getCurrentRound()

        const voteStartTime = curRound.get('Voting Starts')
        const voteEndTime = curRound.get('Voting Ends')

        const currentBlock = await web3.eth.getBlock("latest")
        const currentBlockHeight = currentBlock.number

        const startDate = new Date(voteStartTime)
        const startTimestamp = startDate.getTime() / 1000 // get unix timestamp in seconds

        should.equal(voteStartTime, '2021-08-05T23:59:00.000Z');
        should.equal(voteEndTime, '2021-08-09T12:00:00.000Z');
        expect(currentBlockHeight).to.be.a('number');
        expect(startTimestamp).to.be.a('number');

        // Reset Date.now
        Date.now = originalDateNow
    });
});
