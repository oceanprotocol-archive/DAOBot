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
    `AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), NOT({Proposal State} = "Withdrawn"), "true")`
  )

  await Promise.all(
    activeProposals.map(async (proposal) => {
      try {
        const ipfsHash = proposal.get('ipfsHash')
        const proposalHash = proposal.get('proposalHash')

        console.log("proposal", proposal)
        console.log("ipfsHash", ipfsHash)
        console.log("proposalHash", proposalHash)
        
        const strategy = getVoteCountStrategy(proposal.get('Round'))

        await getProposalVotesGQL(proposalHash).then((result) => {
          proposalVotes[proposalHash] = result.data?.votes
        })
        const voters = []
        for (var i = 0; i < proposalVotes[proposalHash].length; ++i) {
          voters.push(proposalVotes[proposalHash][i].voter)
        }

        const scores = await getVoterScores(
          strategy,
          voters,
          proposal.get('Snapshot Block')
        )

        voterScores[proposalHash] = reduceVoterScores(
          strategy,
          proposalVotes[proposalHash],
          scores
        )

        if (curRoundNumber >= 14) {
          proposalScores[proposalHash] = calculateMatch(voterScores[proposalHash])
        } else {
          proposalScores[proposalHash] = reduceProposalScores(
            strategy,
            proposalVotes[proposalHash],
            voterScores[proposalHash]
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
  console.log("getActiveProposalVotes")
  const results = await getActiveProposalVotes(
    curRoundNumber,
    curRoundBallotType
  )
  const activeProposals = results[0]
  const proposalScores = results[2]

  console.log("sumSnapshotVotesToAirtable")
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
