global['fetch'] = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const {
  getProposalsSelectQuery,
  updateProposalRecords,
  sumSnapshotVotesToAirtable
} = require('./airtable_utils')
const {
  getVoteCountStrategy,
  getVoterScores,
  reduceVoterScores,
  reduceProposalScores,
  getProposalVotesGQL
} = require('../snapshot/snapshot_utils')

// Let's track the state of various proposals
var activeProposals = {}
// var proposalVotes = {}

const getActiveProposalVotes = async (curRoundNumber) => {
  let proposalVotes = {}
  let voterScores = {}
  let proposalScores = {}

  activeProposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`
  )

  await Promise.all(
    activeProposals.map(async (proposal) => {
      try {
        const ipfsHash = proposal.get('ipfsHash')
        let strategy = getVoteCountStrategy(proposal.get('Round'))

        await getProposalVotesGQL(ipfsHash).then((result) => {
          proposalVotes[ipfsHash] = result.data.votes
        })
        const voters = []
        for (var i = 0; i < proposalVotes[ipfsHash].length; ++i) {
          voters.push(proposalVotes[ipfsHash][i].voter)
        }

        const scores = await getVoterScores(
          strategy,
          voters,
          proposal.get('Snapshot Block')
        )

        voterScores[ipfsHash] = reduceVoterScores(
          strategy,
          proposalVotes[ipfsHash],
          scores
        )
        proposalScores[ipfsHash] = reduceProposalScores(voterScores[ipfsHash])
      } catch (err) {
        console.log(err)
      }
    })
  )

  return [voterScores, proposalScores]
}

const syncAirtableActiveProposalVotes = async (curRoundNumber) => {
  const results = await getActiveProposalVotes(curRoundNumber)
  let proposalScores = results[1]

  const proposalVoteSummary = await sumSnapshotVotesToAirtable(
    activeProposals,
    proposalScores
  )
  console.log('============')
  await updateProposalRecords(proposalVoteSummary)
  console.log(
    '[%s]\nUpdated [%s] rows to Airtable',
    new Date().toString(),
    proposalVoteSummary.length
  )
}

module.exports = { syncAirtableActiveProposalVotes }
