global['fetch'] = require('cross-fetch')
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
const { getCurrentRound } = require('./rounds/funding_rounds')

const main = async () => {
  const curRound = await getCurrentRound()
  const curRoundNumber = curRound.get('Round')

  // Step 1 - Identify all proposal standings
  let allProposals = await getAllRoundProposals(curRoundNumber - 1)
  let proposalStandings = await processProposalStandings(allProposals)
  console.log(
    '\n======== Proposal Standings Found\n',
    JSON.stringify(proposalStandings)
  )

  // Step 2 - Resolve & Report standings
  await processHistoricalStandings(proposalStandings)
  console.log(
    '\n======== Reported Proposal Standings\n',
    JSON.stringify(proposalStandings)
  )

  // Add all historical proposals that we're going to update
  let rows = []
  for (const [key, value] of Object.entries(proposalStandings)) {
    rows = rows.concat(value)
  }

  // Step 3 - Report the latest (top of stack) proposal standing
  let latestProposalStandings = await getProjectsLatestProposal(
    proposalStandings
  )

  let currentRoundProposals = await getAllRoundProposals(
    curRoundNumber,
    curRoundNumber
  )
  let currentProposalStandings = await processProposalStandings(
    currentRoundProposals
  )
  await updateCurrentRoundStandings(
    currentProposalStandings,
    latestProposalStandings
  )

  // Add all current proposals that we're going to update
  for (const [key, value] of Object.entries(currentProposalStandings)) {
    rows = rows.concat(value)
  }

  // drop all extra columns
  rows.forEach((x) => {
    if (x.fields['Proposal URL']) delete x.fields['Proposal URL']
  })

  // Finally, update all DB records
  await updateProposalRecords(rows)
  console.log(
    '\n[%s]\nUpdated [%s] rows to Airtable',
    new Date().toString(),
    Object.entries(rows).length
  )
}

main()
