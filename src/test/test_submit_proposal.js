const {local_broadcast_proposal} = require('../snapshot/snapshot_utils')
const {web3} = require('../functions/web3')

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here';
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const payload = {
    "name": "Initial Alex Offering",
    "body": "Read more about the proposal here:\nhttps://medium.com/@AlexMasmej/taking-risks-during-chaos-initial-alex-offering-339883bb7f6d\n\nProposal Overview\nAlex is revolutionizing self-actualization.\n\nGrant Deliverables:\nThis grant supports the following deliverables:\n1. Alex creating an awesome coin\n    - [The Case for Alex Coin](https://www.coingecko.com/en/coins/alex)\n2. Another case for Alex Coin\n    - [Next case for Alex Coin](https://www.coingecko.com/en/coins/alex)\n3. [The actual case for Alex Coin](https://www.coingecko.com/en/coins/alex)\n4. Therefore, investing in Alex Coin is investing in the future.\n\n\nEngage in community conversation, questions and feedback:\n\n###Dates:\nVoting opens on Sun, 02 May 2021 00:00:00 GMT GMT.\nVoting closes on Sun, 02 May 2021 00:00:00 GMT GMT.\n\n###Cast your vote below!",
    "choices": [
        "Yes",
        "No"
    ],
    "type": "single-choice",
    "start": 1622676600,
    "end": 1622677500,
    "snapshot": 12557832,
    "metadata": {
        "strategies": [
            {
                "network": 1,
                "name": "erc20-balance-of",
                "params": {
                    "symbol": "ALEX",
                    "address": "0x8BA6DcC667d3FF64C1A2123cE72FF5F0199E5315",
                    "decimals": 4
                }
            }
        ]
    }
}

const testPayload = async (payload_url) => {
    try {
        const result = await local_broadcast_proposal(web3, account, payload, pSpace='alex', pUrl=payload_url)
        console.log("Results are: ", result)
    } catch(err) {
        console.log(err)
    }
}

// testPayload('')
// testPayload('https://testnet.snapshot.org')
