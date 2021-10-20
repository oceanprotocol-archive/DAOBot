const dotenv = require('dotenv');
dotenv.config();

const {Standings} = require('../airtable/proposals/proposal_standings')
const {getProposalsSelectQuery, updateProposalRecords} = require('../airtable/airtable_utils')
const {calcTargetBlockHeight, hasEnoughOceans} = require('../snapshot/snapshot_utils')
const {web3} = require('../functions/web3')

// Script parameters - Should be changed each round
// For instructions on calculating snapshot block height, read calcTargetBlockHeight() @ snapshot_utils.js
const avgBlockTime = 13.4

const prepareProposalsForSnapshot = async (curRound) => {
    const curRoundNumber = curRound.get('Round')

    const voteStartTime = curRound.get('Voting Starts')
    const voteEndTime = curRound.get('Voting Ends')

    const currentBlock = await web3.eth.getBlock("latest")
    const currentBlockHeight = currentBlock.number

    const startDate = new Date(voteStartTime)
    const voteStartTimestamp = startDate.getTime() / 1000 // get unix timestamp in seconds

    let proposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", OR({Proposal State} = "Received", {Proposal State} = "Rejected"), "true")`)
    let estimatedBlockHeight = calcTargetBlockHeight(currentBlockHeight, voteStartTimestamp, avgBlockTime)

    let recordsPayload = []

    await Promise.all(proposals.map(async (proposal) => {
        try {
            let wallet_0x = proposal.get('Wallet Address')
            let proposalStanding = proposal.get('Proposal Standing')
            let goodStanding = proposalStanding === Standings.Completed || proposalStanding === Standings.Refunded || proposalStanding === Standings.Undefined

            if( hasEnoughOceans(wallet_0x) && goodStanding === true ) {
                recordsPayload.push({
                    id: proposal.id,
                    fields: {
                        'Proposal State': 'Accepted',
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
                        'Proposal State': 'Rejected',
                        'Voting Starts': null,
                        'Voting Ends': null,
                        'Snapshot Block': null,
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

    return recordsPayload.length
}

module.exports = {prepareProposalsForSnapshot};
