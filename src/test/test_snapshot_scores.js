const snapshot = require('@snapshot-labs/snapshot.js')
global.fetch = require('cross-fetch')

const space = 'officialoceandao.eth'
const strategies = [
  {
    name: 'erc20-balance-of',
    params: {
      address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
      symbol: 'OCEAN',
      decimals: 18
    }
  },
  {
    name: 'ocean-marketplace',
    params: {
      address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
      symbol: 'OCEAN',
      decimals: 18
    }
  }
]

const network = '1'
const provider = snapshot.utils.getProvider(network)
const voters = [
  '0x655efe6eb2021b8cefe22794d90293aec37bb325',
  '0xce7be31f48205c48a91a84e777a66252bba87f0b',
  '0xcc7e9b8331bea863a158589e8ebcf118c72d0683',
  '0xa1682eff089a61491010640407e90289feeb22d6'
]
const snapshotHeight = 11437846

snapshot.utils
  .getScores(space, strategies, network, provider, voters, snapshotHeight)
  .then((scores) => {
    console.log('Scores', scores)
  })
