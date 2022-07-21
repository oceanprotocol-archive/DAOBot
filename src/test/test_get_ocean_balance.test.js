const { expect } = require('chai')
const dotenv = require('dotenv')
const { hasEnoughOceans } = require('../snapshot/snapshot_utils')
dotenv.config()
const ether = '0xd5e6219a79c5cc61b9074331d1b05a6f35c5a48a'
const polygon = '0x5a94f81d25c73eddbdd84b84e8f6d36c58270510'
const bsc = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3'

describe('Should get the Ocean balance for wallets', function () {
  it('Should get the balance for ETH Mainnet', async function () {
    const hasEnough = await hasEnoughOceans(ether)
    expect(hasEnough).to.be.equal(true)
  })

  it('Should get the balance for Polygon Mainnet', async function () {
    const hasEnough = await hasEnoughOceans(polygon)
    expect(hasEnough).to.be.equal(true)
  })

  it('Should get the balance for BSC', async function () {
    const hasEnough = await hasEnoughOceans(bsc)
    expect(hasEnough).to.be.equal(true)
  })
})
