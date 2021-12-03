/* eslint-env mocha */

const { getTokenPrice } = require('../functions/coingecko')
const dotenv = require('dotenv')
dotenv.config()
const Logger = require('../utils/logger')

const { expect } = require('chai')

describe('Validate token price', function () {
  it('Should validate token price > 0.0', async function () {
    const tokenPrice = await getTokenPrice()
    Logger.log('Chainlink: Token Price', tokenPrice)

    expect(tokenPrice).to.be.greaterThan(0.0)
  })
})
