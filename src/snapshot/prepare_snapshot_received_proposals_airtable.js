const dotenv = require('dotenv')
dotenv.config()

const {
  getProposalsSelectQuery,
  updateProposalRecords
} = require('../airtable/airtable_utils')
const { hasEnoughOceans } = require('../snapshot/snapshot_utils')
const { calcTargetBlockHeight } = require('../snapshot/snapshot_utils')
const { web3 } = require('../functions/web3')
const Logger = require('../utils/logger')
const {
  Standings,
  getProposalRecord
} = require('../airtable/proposals/proposal_standings')

// Script parameters - Should be changed each round
// For instructions on calculating snapshot block height, read calcTargetBlockHeight() @ snapshot_utils.js
const avgBlockTime = 13.4

// TODO-RA: This function broke for R13.
// Proposals were not successfully configured (Voting Starts, Voting Ends, Snapshot Block)
// Proposals should be getting validated & updated properly in this function.
// Proposals are being set to "Accepted" ahead of time, and are not being found.
const prepareProposalsForSnapshot = async (curRound) => {
  const curRoundNumber = curRound.get('Round')

  const voteStartTime = curRound.get('Voting Starts')
  const voteEndTime = curRound.get('Voting Ends')

  const currentBlock = await web3.eth.getBlock('latest')
  const currentBlockHeight = currentBlock.number

  const startDate = new Date(voteStartTime)
  const voteStartTimestamp = startDate.getTime() / 1000 // get unix timestamp in seconds

  // TODO-RA: Proposals are being set to "Accepted" ahead of time, and are not being found.
  // Changed to this for R13 to work => `AND({Round} = "${curRoundNumber}", OR({Proposal State} = "Accepted"), "true")`
  const proposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", {Proposal State} = "Accepted", "true")`
  )
  const estimatedBlockHeight = calcTargetBlockHeight(
    currentBlockHeight,
    voteStartTimestamp,
    avgBlockTime
  )

  const recordsPayload = []

  await Promise.all(
    proposals.map(async (proposal) => {
      getProposalRecord(proposal, proposals)
      try {
        const wallet_0x = proposal.get('Wallet Address')
        const proposalStanding = proposal.get('Proposal Standing')

        // Please update enums as required
        const goodStanding =
          proposalStanding === Standings.Completed ||
          proposalStanding === Standings.Refunded ||
          proposalStanding === Standings.Undefined ||
          proposalStanding === Standings.Unreported ||
          proposalStanding === Standings.NewProject

        if ((await hasEnoughOceans(wallet_0x)) && goodStanding === true) {
          recordsPayload.push({
            id: proposal.id,
            fields: {
              'Proposal State': 'Accepted',
              'Voting Starts': voteStartTime,
              'Voting Ends': voteEndTime,
              'Snapshot Block': Number(estimatedBlockHeight),
              'Deployment Ready': 'Yes'
            }
          })
        } else {
          recordsPayload.push({
            id: proposal.id,
            fields: {
              'Proposal State': 'Rejected',
              'Voting Starts': null,
              'Voting Ends': null,
              'Snapshot Block': null,
              'Deployment Ready': 'No'
            }
          })
        }
      } catch (err) {
        Logger.error(err)
      }
    })
  )

  if (recordsPayload.length > 0) {
    await updateProposalRecords(recordsPayload)
    Logger.log('Updated [%s] records', recordsPayload.length)
  }

  return recordsPayload.length
}

module.exports = { prepareProposalsForSnapshot }
