const { web3 } = require('../functions/web3')
const Logger = require('../utils/logger')

// const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here';

const main = async () => {
  const account = web3.eth.accounts.create()
  Logger.log('New account created: ', account)
}

main()
