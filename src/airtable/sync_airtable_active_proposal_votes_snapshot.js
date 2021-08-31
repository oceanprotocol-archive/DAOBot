global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const { getProposalsSelectQuery, updateProposalRecords, sumSnapshotVotesToAirtable } = require('./airtable_utils')
const { getVoteCountStrategy, getVoterScores, getProposalVotesGQL } = require('../snapshot/snapshot_utils');
const { getCurrentRound } = require('./rounds/funding_rounds')

// Let's track the state of various proposals
var activeProposals = {}
var proposalVotes = {}
var proposalScores = {}
var proposalVoteSummary = {}

// DRY/PARAMETERIZE
const getActiveProposalVotes = async () => {
    const curRound = await getCurrentRound()
    const curRoundNumber = curRound.get('Round')

    activeProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`)

    await Promise.all(activeProposals.map(async (proposal) => {
        try {
            const ipfsHash = proposal.get('ipfsHash')
            let strategy = getVoteCountStrategy(proposal.get('Round'))

            await getProposalVotesGQL(ipfsHash)
                .then((result) => {
                    proposalVotes[ipfsHash] = result.data.votes
                })
            const voters = []
            for (var i = 0; i < proposalVotes[ipfsHash].length; ++i) {
                voters.push(proposalVotes[ipfsHash][i].voter)
            }
            const voterScores = await getVoterScores(strategy, voters, proposal.get('Snapshot Block'))

            activeVotes = Object.entries(proposalVotes[ipfsHash]).map((voter) => {
                let strategyScore = 0
                newVoter = voter[1].voter
                for (i = 0; i < strategy.length; i++) {
                    for (var counterVoter of Object.keys(voterScores[i])) {
                        if (counterVoter === newVoter) {
                            strategyScore += voterScores[i][newVoter]
                        } else {
                            strategyScore += 0
                        }
                    }
                }
                let resultVotes = {}
                resultVotes[newVoter] = {
                    "choice": voter[1].choice,
                    "balance": strategyScore
                }
                return resultVotes
            })
            let scores = {
                1: 0,
                2: 0
            }
            Object.entries(activeVotes).reduce((total, cur) => {
                const voterAddress = Object.keys(cur[1])[0]
                const choice = cur[1][voterAddress].choice
                const balance = cur[1][voterAddress].balance
                if (scores[choice] === undefined) scores[choice] = 0
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
