global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords, sumSnapshotVotesToAirtable} = require('./airtable_utils')
const {getVoteCountStrategy, getVoterScores, getProposalVotesGQL} = require('../snapshot/snapshot_utils');
const {getCurrentRound} = require('./rounds/funding_rounds')

// Let's track the state of various proposals
var activeProposals = {}
var proposalVotes = {}
var proposalScores = {}
var proposalVoteSummary = {}

// DRY/PARAMETERIZE
const getActiveProposalVotes = async () => {
    const curRound = await getCurrentRound()
    //const curRoundNumber = curRound.get('Round')
    const curRoundNumber = 8

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
            const proposalScores = []
            for (var item = 0; item < voterScores.length; ++item) {
                for (var voter of Object.keys(item)) {
                    proposalScores.push(item[voter])
                }
            }
            console.log("scores: " + proposalScores)

            Object.entries(proposalVotes[ipfsHash]).map((voter) => {
                let strategyScore = 0
                for (i=0; i < strategy.length; i++) {
                    strategyScore += voterScores[i][voter[0]] || 0
                }
                voter[1].msg.payload.balance = strategyScore
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
