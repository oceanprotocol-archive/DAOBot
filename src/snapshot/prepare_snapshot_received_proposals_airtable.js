const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords} = require('../airtable/airtable_utils')
const {getCurrentRound} = require('../airtable/rounds/funding_rounds')
const {calcTargetBlockHeight} = require('../snapshot/snapshot_utils')
const {web3} = require('../functions/web3')

// Consts
const OCEAN_ERC20_0x = '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
const OCEAN_ERC20_ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getAccountsLength","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"cap","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"mint","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isPauser","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"addMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isMinter","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_start","type":"uint256"},{"name":"_end","type":"uint256"}],"name":"getAccounts","outputs":[{"name":"","type":"address[]"},{"name":"","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"contractOwner","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"}]
const MIN_OCEAN_REQUIRED = 500.0
const oceanContract = new web3.eth.Contract(OCEAN_ERC20_ABI,OCEAN_ERC20_0x);

// Script parameters - Should be changed each round
// For instructions on calculating snapshot block height, read calcTargetBlockHeight() @ snapshot_utils.js
const avgBlockTime = 13

const getWalletBalance = async (wallet0x) => {
    let balance = 0

    if (wallet0x) {
        balance = await oceanContract.methods.balanceOf(wallet0x).call()
        // Adjust for 18 decimals
        balance /= 10 ** 18
    }

    return balance
}

const main = async () => {
    const curRound = await getCurrentRound()
    const curRoundNumber = curRound.get('Round')

    const voteStartTime = curRound.get('Voting Starts')
    const voteEndTime = curRound.get('Voting Ends')

    const currentBlock = await web3.eth.getBlock("latest")
    const currentBlockHeight = currentBlock.number

    const startDate = new Date(voteStartTime)
    const voteStartTimestamp = startDate.getTime() / 1000 // get unix timestamp in seconds

    let proposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", {Proposal State} = "Received", "true")`)
    let estimatedBlockHeight = calcTargetBlockHeight(currentBlockHeight, voteStartTimestamp, avgBlockTime)
    let recordsPayload = []

    await Promise.all(proposals.map(async (proposal) => {
        try {
            let wallet_0x = proposal.get('Wallet Address')
            let balance = await getWalletBalance(wallet_0x)

            if( balance >= MIN_OCEAN_REQUIRED ) {
                recordsPayload.push({
                    id: proposal.id,
                    fields: {
                        'Voting Starts': voteStartTime,
                        'Voting Ends': voteEndTime,
                        'Snapshot Block': Number(estimatedBlockHeight),
                        'Deployment Ready': 'Yes'
                    }
                })
            } else {
                recordsPayload.push({
                    id: proposal.id,
                    fields: {
                        'Voting Starts': '',
                        'Voting Ends': '',
                        'Snapshot Block': 0,
                        'Deployment Ready': 'No'
                    }
                })
            }
        } catch (err) {
            console.log(err)
        }
    }))

    if( recordsPayload.length > 0 ) {
        await updateProposalRecords(recordsPayload)
        console.log('Updated [%s] records', recordsPayload.length)
    }
}

main()
