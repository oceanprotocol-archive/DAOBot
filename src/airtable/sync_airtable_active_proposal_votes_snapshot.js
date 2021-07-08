global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsByState, updateProposalRecords, sumSnapshotVotesToAirtable} = require('./airtable_utils')
const {getProposalVotes} = require('../snapshot/snapshot_utils');

// DRY/PARAMETERIZE
const roundNumber = 7
const snapshot = require('@snapshot-labs/snapshot.js')
const space = 'officialoceandao.eth';
const marketStrategy = [
    {
        name: 'erc20-balance-of',
        params: {
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            symbol: "OCEAN",
            decimals: 18
        }
    },
    {
        name: 'ocean-marketplace',
        params: {
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            symbol: "OCEAN",
            decimals: 18
        }
    }
];

const network = '1';
const provider = snapshot.utils.getProvider(network);

// Let's track the state of various proposals
var activeProposals = {}
var proposalVotes = {}
var proposalScores = {}
var proposalVoteSummary = {}

// DRY
const getVoterScores = async (provider, voters, blockHeight) => {
    return snapshot.utils.getScores(
        space,
        marketStrategy,
        network,
        provider,
        voters,
        blockHeight
    ).then(scores => {
        return scores
    });
}

// DRY
const getActiveProposalVotes = async () => {
    activeProposals = await getProposalsByState(`AND({Round} = "${roundNumber}", NOT({Proposal State} = "Rejected"), "true")`)

    await Promise.all(activeProposals.map(async (proposal) => {
        try {
            const ipfsHash = proposal.get('ipfsHash')

            await getProposalVotes(ipfsHash)
                .then((result) => {
                    proposalVotes[ipfsHash] = result.data
                })

            const voters = Object.keys(proposalVotes[ipfsHash])
            const voterScores = await getVoterScores(provider, voters, proposal.get('Snapshot Block'))

            Object.entries(proposalVotes[ipfsHash]).map((voter) => {
                const strategyScore1 = voterScores[0][voter[0]] || 0
                const strategyScore2 = voterScores[1][voter[0]] || 0

                voter[1].msg.payload.balance = strategyScore1 + strategyScore2
            })

            let scores = {
                1: 0,
                2: 0
            }
            Object.entries(proposalVotes[ipfsHash]).reduce((total, cur) => {
                const choice = cur[1].msg.payload.choice
                const balance = cur[1].msg.payload.balance
                if( scores[choice] === undefined ) scores[choice] = 0
                scores[choice] += balance
            }, {})

            proposalScores[ipfsHash] = scores
        } catch (err) {
            console.log(err)
        }
    }))
}

const main = async () => {
    await getActiveProposalVotes()
    proposalVoteSummary = await sumSnapshotVotesToAirtable(activeProposals, proposalScores)
    console.log('============')
    await updateProposalRecords(proposalVoteSummary)
    console.log('[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), proposalVoteSummary.length)
}

main()
