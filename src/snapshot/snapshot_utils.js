const axios = require('axios');
const {bufferToHex} = require("ethereumjs-util")
const {version} = require("@snapshot-labs/snapshot.js/src/constants.json")
const fetch = require('cross-fetch')
const snapshot = require('@snapshot-labs/snapshot.js')
const {web3} = require('../functions/web3')

const hubUrl = process.env.SNAPSHOT_HUB_URL || 'https://testnet.snapshot.org';
const network = '1';
const provider = snapshot.utils.getProvider(network);

// Consts
const OCEAN_ERC20_0x = '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
const OCEAN_ERC20_ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getAccountsLength","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"cap","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"}],"name":"mint","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"kill","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isPauser","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"}],"name":"addMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"account","type":"address"}],"name":"isMinter","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_start","type":"uint256"},{"name":"_end","type":"uint256"}],"name":"getAccounts","outputs":[{"name":"","type":"address[]"},{"name":"","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"contractOwner","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"MinterRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"}]
const MIN_OCEAN_REQUIRED = 500.0
const oceanContract = new web3.eth.Contract(OCEAN_ERC20_ABI,OCEAN_ERC20_0x);

const getWalletBalance = async (wallet0x) => {
    let balance = 0

    if (wallet0x) {
        balance = await oceanContract.methods.balanceOf(wallet0x).call()
        // Adjust for 18 decimals
        balance /= 10 ** 18
    }

    return balance
}

const hasEnoughOceans = async(wallet_address) => {
    let balance = await getWalletBalance(wallet_address)
    return balance >= MIN_OCEAN_REQUIRED
}

const strategy = {
    'test_strategy_spring': [{
        name: "erc20-balance-of",
        params: {
            symbol: "SPRNG",
            address: "0x6D40A673446B2D00D1f9E85251209C638049ba22",
            decimals: 2
        }
    }],
    'strategy_v0_1': [{
        name: "erc20-balance-of",
        params: {
            symbol: "OCEAN",
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            decimals: 18
        }
    }],
    'strategy_v0_2': [{
        name: "ocean-marketplace",
        params: {
            symbol: "OCEAN",
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            decimals: 18
        }
    }, {
        name: "erc20-balance-of",
        params: {
            symbol: "OCEAN",
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            decimals: 18
        }
    }],
    'strategy_v0_3': [{
        name: 'erc20-balance-of',
        params: {
            symbol: 'OCEAN',
            address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
            decimals: 18
        }
    },
    {
        name: 'ocean-marketplace',
        params: {
            symbol: 'OCEAN',
            address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
            decimals: 18
        }
    },
    {
        name: 'sushiswap',
        params: {
            symbol: 'OCEAN',
            address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
            decimals: 18
        }
    },
    {
        name: 'uniswap',
        params: {
            symbol: 'OCEAN',
            address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
            decimals: 18
        }
    },
    {
        name: 'contract-call',
        params: {
            address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
            args: [
                '%{address}',
                '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
                '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
            ],
            decimals: 18,
            symbol: 'OCEAN',
            methodABI: {
                inputs: [
                    {
                        internalType: 'address',
                        name: 'provider',
                        type: 'address'
                    },
                    {
                        internalType: 'address',
                        name: 'poolToken',
                        type: 'address'
                    },
                    {
                        internalType: 'address',
                        name: 'reserveToken',
                        type: 'address'
                    }
                ],
                name: 'totalProviderAmount',
                outputs: [
                    {
                        internalType: 'uint256',
                        name: '',
                        type: 'uint256'
                    }
                ],
                stateMutability: 'view',
                type: 'function'
            }
        }
    }]
};


const getVoteCountStrategy = (roundNumber) => {
    const defaultStrategy = process.env.SNAPSHOT_STRATEGY
    if( defaultStrategy !== undefined ) {
        return strategy[process.env.SNAPSHOT_STRATEGY]
    }

    if(roundNumber < 5) return strategy['strategy_v0_1']
    if(roundNumber < 9) return strategy['strategy_v0_2']
    return strategy['strategy_v0_3']
}

const getVotesQuery = (ifpshash) => `query Votes {
  votes (
    first: 10000,
    where: {
      proposal: "${ifpshash}"
    }
  ) {
    voter
    choice
  }
}`

const getProposalVotes = async (ipfsHash) => {
    const proposalUrl = `${hubUrl}/api/${process.env.SNAPSHOT_SPACE}/proposal/` + ipfsHash
    return await axios.get(proposalUrl)
}

const getProposalVotesGQL = async (ipfsHash) => {
    const options = {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            query: getVotesQuery(ipfsHash)
        })
    };
    const response = await fetch("https://hub.snapshot.org/graphql", options)
    return await response.json()
}

const getVoterScores = async (strategy, voters, blockHeight) => {
    return snapshot.utils.getScores(
        process.env.SNAPSHOT_SPACE,
        strategy,
        network,
        provider,
        voters,
        blockHeight
    ).then(scores => {
        return scores
    });
}

// Returns reduced voter score based on multiple strategies => {voter:{choice:int,balance:int}}
const reduceVoterScores = (strategy, proposalVotes, voterScores) => {
    return Object.entries(proposalVotes).map((voter) => {
        let strategyScore = 0
        const newVoter = voter[1].voter
        for (i = 0; i < strategy.length; i++) {
            const curStratScore = voterScores[i][newVoter]
            if( curStratScore !== undefined )
                strategyScore += curStratScore
        }
        return {
            "address": newVoter,
            "choice": voter[1].choice,
            "balance": strategyScore
        }
    })
}

// Returns reduced proposal summary based on many voters => {1:int,2:int}
const reduceProposalScores = (voterScores) => {
    let scores = {
        1: 0,
        2: 0
    }

    Object.entries(voterScores).reduce((total, cur) => {
        const choice = cur[1].choice
        const balance = cur[1].balance
        if (scores[choice] === undefined) scores[choice] = 0
        scores[choice] += balance
    }, {})

    return scores
}

// Configure the proposal template that will be submitted to Snapshot
const buildProposalPayload = (proposal, roundNumber) => {
    const strategy = getVoteCountStrategy(roundNumber)
    const startTs = Date.parse(proposal.get('Voting Starts'))/1000
    const endTs = Date.parse(proposal.get('Voting Ends'))/1000
    const blockHeight = proposal.get('Snapshot Block')
    const body = `${proposal.get("One Liner")}

## Full Proposal
${proposal.get("Proposal URL")}

## Grant Deliverables
${proposal.get("Grant Deliverables")}

### Engage in community conversation, questions and feedback
https://discord.gg/TnXjkR5

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
            strategies: strategy
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
                console.log(e)
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
                space: pSpace === null ? process.env.SNAPSHOT_SPACE : pSpace,
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

module.exports = {
    getVoteCountStrategy,
    getVotesQuery,
    getProposalVotes,
    getProposalVotesGQL,
    getVoterScores,
    reduceVoterScores,
    reduceProposalScores,
    buildProposalPayload,
    local_broadcast_proposal,
    calcTargetBlockHeight,
    hasEnoughOceans
}
