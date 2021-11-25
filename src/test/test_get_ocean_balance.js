const dotenv = require('dotenv')
dotenv.config()

// const fetch = require('cross-fetch')
// const base = require('airtable').base(process.env.AIRTABLE_BASEID)

// const {getProposalsSelectQuery, updateProposalRecords} = require('../airtable/airtable_utils')
const { web3 } = require('../functions/web3')

const OCEAN_ERC20_0x = '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
const OCEAN_ERC20_ABI = require('../utils/oceanERC20ABI.json')
const WALLET_0x = '0x655efe6eb2021b8cefe22794d90293aec37bb325'

const oceanContract = new web3.eth.Contract(OCEAN_ERC20_ABI.abi, OCEAN_ERC20_0x)

const main = async () => {
  let balance = await oceanContract.methods.balanceOf(WALLET_0x).call()
  // Adjust for 18 decimals
  balance /= 10 ** 18
  console.log('Wallet balance is [%s]', balance)
}

main()
