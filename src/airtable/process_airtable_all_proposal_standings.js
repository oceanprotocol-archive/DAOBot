global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {updateProposalRecords} = require('./airtable_utils')
const {getAllRoundProposals, processProposalStandings, processHistoricalStandings, getProjectsLatestProposal, updateCurrentRoundStandings} = require('./proposals/proposal_standings')

var curRound = 8

const main = async () => {
    // Step 1 - Identify all proposal standings
    let allProposals = await getAllRoundProposals(curRound-1)
    let proposalStandings = await processProposalStandings(allProposals)
    console.log('\n======== Proposal Standings Found\n', JSON.stringify(proposalStandings))

    // Step 2 - Resolve & Report standings
    await processHistoricalStandings(proposalStandings)
    console.log('\n======== Reported Proposal Standings\n', JSON.stringify(proposalStandings))

    // Add all historical proposals that we're going to update
    let rows = []
    for (const [key, value] of Object.entries(proposalStandings)) {
        rows = rows.concat(value)
    }

    // Step 3 - Report the latest (top of stack) proposal standing
    let latestProposalStandings = getProjectsLatestProposal(proposalStandings)

    let currentRoundProposals = await getAllRoundProposals(curRound, curRound)
    let currentProposalStandings = processProposalStandings(currentRoundProposals)
    updateCurrentRoundStandings(currentProposalStandings, latestProposalStandings)

    // Add all current proposals that we're going to update
    for (const [key, value] of Object.entries(currentProposalStandings)) {
        rows = rows.concat(value)
    }

    // Finally, update all DB records
    await updateProposalRecords(rows)
    console.log('\n[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), Object.entries(rows).length)
}

main()
