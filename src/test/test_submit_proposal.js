const dotenv = require('dotenv')
dotenv.config()

const { web3 } = require('../functions/web3')

const {
    getCurrentRound,
} = require('../airtable/rounds/funding_rounds')
const {
    submitProposalsToSnaphotBatch,
} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here'
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account)
web3.eth.defaultAccount = account.address

process.env.SNAPSHOT_HUB_URL = "https://demo.snapshot.org"

// Build and submit proposals
const testSubmitProposals = async () => {
    try {
        const curRound = await getCurrentRound()
        curRoundNumber = curRound.get('Round')
        curRoundVoteType = curRound.get('Vote Type')

        await submitProposalsToSnaphotBatch(curRoundNumber, curRoundVoteType)
    } catch(err) {
        console.log(err)
    }
}

// testSubmitProposals()
