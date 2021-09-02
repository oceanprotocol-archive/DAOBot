global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const { getProposalsSelectQuery, updateProposalRecords, sumSnapshotVotesToAirtable } = require('./airtable_utils')
const { getVoteCountStrategy, getVoterScores, reduceVoterScores, reduceProposalScores, getProposalVotesGQL } = require('../snapshot/snapshot_utils');
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

            const reducedVoterScores = reduceVoterScores(strategy, proposalVotes[ipfsHash], voterScores)
            proposalScores[ipfsHash] = reduceProposalScores(reducedVoterScores)
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
