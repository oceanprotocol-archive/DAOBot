global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const {
  getProposalsSelectQuery,
  updateProposalRecords
} = require('./airtable_utils')

// DRY/PARAMETERIZE
const processAirtableNewProposals = async (curRoundNumber) => {
  const inactiveProposals = await getProposalsSelectQuery(
    `AND({Round} = "", {Proposal State} = "", "true")`
  )
  const proposalRecords = []

  await Promise.all(
    inactiveProposals.map(async (p) => {
      try {
        proposalRecords.push({
          id: p.id,
          fields: {
            'Proposal State': 'Received',
            Round: curRoundNumber
          }
        })
      } catch (err) {
        Logger.error(err)
      }
    })
  )

  updateProposalRecords(proposalRecords)
}

module.exports = { processAirtableNewProposals }
