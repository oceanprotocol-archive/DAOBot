const dotenv = require('dotenv')
dotenv.config()
const Logger = require('../utils/logger')

const {
  getProposalsSelectQuery,
  updateProposalRecords
} = require('../airtable/airtable_utils')
const {
  buildGranularProposalPayload,
  buildBatchProposalPayload,
  local_broadcast_proposal
} = require('./snapshot_utils')
const { sleep } = require('../functions/utils')
const { web3 } = require('../functions/web3')

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here'
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account)
web3.eth.defaultAccount = account.address

// All required fields should have already been validated by the online Form
// Build payload for proposal, and submit it
const submitProposalsToSnaphotGranular = async (roundNumber, voteType) => {
  try {
    // TODO - Parameterize (Docker) + CI/CD Deploy Button + PEBKAC
    const acceptedProposals = await getProposalsSelectQuery(
      `AND({Round} = "${roundNumber}", {Proposal State} = "Accepted", "true")`
    )

    // Assert quality
    // Foreach may be locking/sync vs. Promise/all which may fire all at once
    // We probably want to throttle the deployment to snapshot w/ a sleep
    const submittedProposals = []
    for (const proposal of acceptedProposals) {
      const payload = buildGranularProposalPayload(
        proposal,
        roundNumber,
        voteType
      )
      const result = await local_broadcast_proposal(
        web3,
        account,
        payload,
        process.env.SNAPSHOT_SPACE
      )

      if (result !== undefined) {
        Logger.log(result)
        submittedProposals.push({
          id: proposal.id,
          fields: {
            ipfsHash: result.ipfsHash,
            'Vote URL': `https://${process.env.SNAPSHOT_URL}/#/${process.env.SNAPSHOT_SPACE}/proposal/${result.ipfsHash}`,
            'Proposal State': 'Running'
          }
        })
      }

      await sleep(250)
    }

    if (submittedProposals.length > 0) {
      await updateProposalRecords(submittedProposals)
      Logger.log(
        '[SUCCESS] Submitted [%s] proposals to Snapshot.',
        submittedProposals.length
      )
    }
    if (acceptedProposals.length !== submittedProposals.length)
      Logger.log(
        '[WARNING] Accepted [%s] proposals, but only submitted [%s]. Please check logs.',
        acceptedProposals.length,
        submittedProposals.length
      )
  } catch (err) {
    Logger.error(err)
  }
}

const submitProposalsToSnaphotBatch = async (roundNumber, voteType) => {
  try {
    // TODO - Parameterize (Docker) + CI/CD Deploy Button + PEBKAC
    const acceptedProposals = await getProposalsSelectQuery(
      `AND({Round} = "${roundNumber}", {Proposal State} = "Accepted", "true")`
    )

    const proposalIndex = {} // let's keep a dict of proposalName + y/n indexes
    const proposalArr = [] // let's keep all proposals Y/N in an ordered array
    let index = 1

    for (const proposal of acceptedProposals) {
      proposalIndex[proposal.get('Project Name')] = [index, index + 1]
      proposalArr.push(proposal.get('Project Name') + '_Yes')
      proposalArr.push(proposal.get('Project Name') + '_No')
      index += 2
    }

    const payload = buildBatchProposalPayload(
      acceptedProposals,
      proposalArr,
      roundNumber,
      voteType
    )
    const result = await local_broadcast_proposal(
      web3,
      account,
      payload,
      process.env.SNAPSHOT_SPACE
    )
    Logger.log(result)

    const submittedProposals = []
    if (result !== undefined) {
      for (const proposal of acceptedProposals) {
        try {
          const index = proposalIndex[proposal.get('Project Name')]
          submittedProposals.push({
            id: proposal.id,
            fields: {
              ipfsHash: result.ipfsHash,
              'Vote URL': `https://${process.env.SNAPSHOT_URL}/#/${process.env.SNAPSHOT_SPACE}/proposal/${result.ipfsHash}`,
              'Proposal State': 'Running',
              'Snapshot Batch Index': index[0],
              'Snapshot Batch Index No': index[1]
            }
          })
        } catch (err) {
          Logger.error(err)
        }
      }
    }

    if (submittedProposals.length > 0) {
      await updateProposalRecords(submittedProposals)
      Logger.log(
        '[SUCCESS] Submitted [%s] proposals to Snapshot.',
        submittedProposals.length
      )
    }
    if (acceptedProposals.length !== submittedProposals.length)
      Logger.log(
        '[WARNING] Accepted [%s] proposals, but only submitted [%s]. Please check logs.',
        acceptedProposals.length,
        submittedProposals.length
      )
  } catch (err) {
    Logger.error(err)
  }
}

module.exports = {
  submitProposalsToSnaphotGranular,
  submitProposalsToSnaphotBatch
}
