global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
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
  getProposalVotesGQL,
  calculateMatch
} = require('../snapshot/snapshot_utils')

// ? curRoundBallotType - does this need to work retroactively?
const getActiveProposalVotes = async (curRoundNumber, curRoundBallotType) => {
  const proposalVotes = {}
  const voterScores = {}
  const proposalScores = {}

  const activeProposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`
  )

  await Promise.all(
    activeProposals.map(async (proposal) => {
      try {
        const ipfsHash = proposal.get('ipfsHash')
        const strategy = getVoteCountStrategy(proposal.get('Round'))

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

        if (curRoundNumber >= 14) {
          proposalScores[ipfsHash] = calculateMatch(voterScores[ipfsHash])
        } else {
          proposalScores[ipfsHash] = reduceProposalScores(
            strategy,
            proposalVotes[ipfsHash],
            voterScores[ipfsHash]
          )
        }
      } catch (err) {
        Logger.error(err)
      }
    })
  )

  return [activeProposals, voterScores, proposalScores]
}

const syncAirtableActiveProposalVotes = async (
  curRoundNumber,
  curRoundBallotType
) => {
  const results = await getActiveProposalVotes(
    curRoundNumber,
    curRoundBallotType
  )
  const activeProposals = results[0]
  const proposalScores = results[2]

  const proposalVoteSummary = await sumSnapshotVotesToAirtable(
    activeProposals,
    proposalScores
  )
  Logger.log('============')
  await updateProposalRecords(proposalVoteSummary)
  Logger.log(
    '[%s]\nUpdated [%s] rows to Airtable',
    new Date().toString(),
    proposalVoteSummary.length
  )
}

module.exports = { syncAirtableActiveProposalVotes, getActiveProposalVotes }
