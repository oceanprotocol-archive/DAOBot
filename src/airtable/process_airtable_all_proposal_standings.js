global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const { updateProposalRecords } = require('./airtable_utils')
const {
  getAllRoundProposals,
  processProposalStandings,
  processHistoricalStandings,
  getProjectsLatestProposal,
  updateCurrentRoundStandings
} = require('./proposals/proposal_standings')

const processAirtableProposalStandings = async (curRoundNumber) => {
  // Step 1 - Identify all proposal standings
  const allProposals = await getAllRoundProposals(curRoundNumber - 1)
  const proposalStandings = await processProposalStandings(allProposals)
  /*Logger.log(
    '\n======== Proposal Standings Found\n',
    JSON.stringify(proposalStandings)
  )*/

  // Step 2 - Resolve & Report standings
  await processHistoricalStandings(proposalStandings)
  /*Logger.log(
    '\n======== Reported Proposal Standings\n',
    JSON.stringify(proposalStandings)
  )*/

  // Add all historical proposals that we're going to update
  let rows = []
  for (const [, value] of Object.entries(proposalStandings)) {
    rows = rows.concat(value)
  }

  // Step 3 - Report the latest (top of stack) proposal standing
  const latestProposalStandings = await getProjectsLatestProposal(
    proposalStandings
  )

  const currentRoundProposals = await getAllRoundProposals(
    curRoundNumber,
    curRoundNumber
  )
  const currentProposalStandings = await processProposalStandings(
    currentRoundProposals,
    allProposals
  )
  await updateCurrentRoundStandings(
    currentProposalStandings,
    latestProposalStandings
  )

  // Add all current proposals that we're going to update
  for (const [, value] of Object.entries(currentProposalStandings)) {
    rows = rows.concat(value)
  }

  // drop all extra columns
  rows.forEach((x) => {
    if (x.fields['Proposal URL']) delete x.fields['Proposal URL']
    if (x.fields['Bad Status']) delete x.fields['Bad Status']
  })

  // Finally, update all DB records
  await updateProposalRecords(rows)
  Logger.log(
    '\n[%s]\nUpdated [%s] rows to Airtable',
    new Date().toString(),
    Object.entries(rows).length
  )
}

module.exports = {
  processAirtableProposalStandings
}
