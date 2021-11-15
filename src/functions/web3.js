const Web3 = require('web3')
const dotenv = require('dotenv')
dotenv.config()

// Load Providers
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_key_here'
const url = `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
const web3 = new Web3(new Web3.providers.HttpProvider(url))

// Load private key & account
// console.log("INFURA_API_URL", `https://mainnet.infura.io/v3/${INFURA_API_KEY}`);
module.exports = { web3 }
