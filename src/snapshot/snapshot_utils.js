const axios = require('axios');
const {bufferToHex} = require("ethereumjs-util")
const {version} = require("@snapshot-labs/snapshot.js/src/constants.json")
const fetch = require('cross-fetch')

const hubUrl = process.env.SNAPSHOT_HUB_URL || 'https://testnet.snapshot.org';
const space = 'officialoceandao.eth'
const strategies = [{
    "network": 1,
    "name": "ocean-marketplace",
    "params": {
        "symbol": "OCEAN",
        "address": "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
        "decimals": 18
    }
}, {
    "name": "erc20-balance-of",
    "params": {
        "symbol": "OCEAN",
        "address": "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
        "decimals": 18
    }
}]

const getProposalVotes = async (ipfsHash) => {
    const proposalUrl = 'https://hub.snapshot.page/api/officialoceandao.eth/proposal/' + ipfsHash
    return await axios.get(proposalUrl)
}

// Configure the proposal template that will be submitted to Snapshot
const buildProposalPayload = (proposal) => {
    const startTs = Date.parse(proposal.get('Voting Starts'))/1000
    const endTs = Date.parse(proposal.get('Voting Ends'))/1000
    const blockHeight = proposal.get('Snapshot Block')
    const humanReadableStartDate = new Date(proposal.get('Voting Starts')).toUTCString()
    const humanReadableEndDate = new Date(proposal.get('Voting Starts')).toUTCString()
    const body = `${proposal.get("One Liner")}

## Full Proposal
${proposal.get("Proposal URL")}

## Grant Deliverables
${proposal.get("Grant Deliverables")}

### Engage in community conversation, questions and feedback
https://discord.com/channels/612953348487905282/776848812534398986

## Cast your vote below!`

    return payload = {
        end: endTs,
        body: body,
        name: proposal.get('Project Name'),
        type: "single-choice",
        start: startTs,
        choices: ["Yes", "No"],
        metadata: {
            network: 1,
            strategies: strategies
        },

        snapshot: blockHeight
    }
}

const send = async (url, init) => {
    return new Promise((resolve, reject) => {
        fetch(url, init)
            .then((res) => {
                if (res.ok) return resolve(res.json());
                throw res;
            })
            .catch((e) => {
                console.log(e.json())
            });
    });
}

const local_broadcast_proposal = async (web3, account, payload, pSpace=null, pUrl=null ) => {
    try {
        var msg = {
            address: account.address,
            msg: JSON.stringify({
                version: version,
                timestamp: (Date.now() / 1e3).toFixed(),
                space: pSpace === null ? space : pSpace,
                type: 'proposal',
                payload
            })
        };

        var encodedMsg = bufferToHex(new Buffer.from(msg.msg, 'utf8'));
        msg.sig = await web3.eth.sign(encodedMsg, msg.address)

        const url = pUrl === null ? `${hubUrl}/api/message` : `${pUrl}/api/message`
        let init = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(msg)
        };
        return send(url, init)
    } catch(err) {
        console.log("ERROR: Broadcast Proposal: ", err)
    }
}

// 1. Get current block height => https://etherscan.io/blocks
// 2. Get the unix second timestamp in seconds for the target date => https://www.epochconverter.com/
// 3. Get the average block time in seconds => https://bitinfocharts.com/ethereum/
const calcTargetBlockHeight = (currentBlockHeight, targetUnixTimestamp, avgBlockTime) => {
    const blockNumber = currentBlockHeight
    const targetTimestamp = targetUnixTimestamp
    const curTimestamp = Date.now()/1000

    return Math.floor(blockNumber + ((targetTimestamp - curTimestamp) / avgBlockTime))
}

module.exports = {getProposalVotes, buildProposalPayload, local_broadcast_proposal, calcTargetBlockHeight}
