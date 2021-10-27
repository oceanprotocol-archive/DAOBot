/* eslint-env mocha */

const {getTokenPrice} = require('../../src/functions/coingecko')
const dotenv = require('dotenv');
dotenv.config();

const expect = require('chai').expect;

describe('Calculating Winners', function() {
    it('Should validate token price > 0.0', async function () {
        const tokenPrice = await getTokenPrice()
        console.log('CoinGecko: Token Price', tokenPrice)

        expect(tokenPrice).to.be.greaterThan(0.0);
    });
})
