global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const { getProposalsSelectQuery } = require('./airtable_utils')
const {
  getVoteCountStrategy,
  getVoterScores,
  reduceVoterScores,
  getProposalVotesGQL,
  calculateMatch
} = require('../snapshot/snapshot_utils')

// DRY/PARAMETERIZE
const { getCurrentRound } = require('./rounds/funding_rounds')

// Let's track the state of various proposals
var allProposals = []
var proposalVotes = {}
var proposalScores = {}
// eslint-disable-next-line no-unused-vars
const getAllProposalVotes = async () => {
  const curRound = await getCurrentRound()
  const curRoundNumber = curRound.get('Round')

  for (var roundNum = 1; roundNum < curRoundNumber; roundNum++) {
    const strategy = getVoteCountStrategy(roundNum)
    const roundProposals = await getProposalsSelectQuery(
      `AND({Round} = "${roundNum}", NOT({Proposal State} = "Rejected"), "true")`
    )
    allProposals = allProposals.concat(roundProposals)

    await Promise.all(
      roundProposals.map(async (proposal) => {
        try {
          const ipfsHash = proposal.get('ipfsHash')

          await getProposalVotesGQL(ipfsHash).then((result) => {
            proposalVotes[ipfsHash] = result.data?.votes
          })
          const voters = []
          for (var index = 0; index < proposalVotes[ipfsHash].length; ++index) {
            voters.push(proposalVotes[ipfsHash][index].voter)
          }

          const voterScores = await getVoterScores(
            strategy,
            voters,
            proposal.get('Snapshot Block')
          )

          const reducedVoterScores = reduceVoterScores(
            strategy,
            proposalVotes[ipfsHash],
            voterScores
          )
          proposalScores[ipfsHash] = calculateMatch(reducedVoterScores)
        } catch (err) {
          Logger.error(err)
        }
      })
    )
  }
}

// This updates every record with the latest snapshot votes
const main = async () => {
  return console.error("Don't run me")

  // await getAllProposalVotes()
  // Logger.log('\n============ Total Proposal Scores [%s]', proposalScores.length)

  // proposalVoteSummary = await sumSnapshotVotesToAirtable(
  //   allProposals,
  //   proposalScores
  // )
  // Logger.log('\n============ Total Proposals [%s]', proposalVoteSummary.length)

  // await updateProposalRecords(proposalVoteSummary)
  // Logger.log(
  //   '[%s]\nUpdated [%s] rows to Airtable',
  //   new Date().toString(),
  //   proposalVoteSummary.length
  // )
}

main()
