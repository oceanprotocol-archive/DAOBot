const dotenv = require('dotenv');
dotenv.config();

const {local_broadcast_proposal} = require('../snapshot/snapshot_utils')
const {web3} = require('../functions/web3')

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here';
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;
const snapshot_url = process.env.SNAPSHOT_HUB_URL

const payload = {
    "name": "Spring Proposal",
    "body": "Vote below",
    "choices": [
        "Yes",
        "No"
    ],
    "type": "single-choice",
    "start": 1630471000,
    "end": 1630475000,
    "snapshot": 13135768,
    "metadata": {
        "strategies": [
            {
                "network": 1,
                "name": "erc20-balance-of",
                "params": {
                    "symbol": "SPRNG",
                    "address": "0x6D40A673446B2D00D1f9E85251209C638049ba22",
                    "decimals": 2
                }
            }
        ]
    }
}

// TODO - Build payload programmatically
const testPayload = async () => {
    try {
        const result = await local_broadcast_proposal(web3, account, payload, {pSpace: 'spring-dao', pUrl: snapshot_url})
        console.log("Results are: ", result)
    } catch(err) {
        console.log(err)
    }
}

// testPayload()
