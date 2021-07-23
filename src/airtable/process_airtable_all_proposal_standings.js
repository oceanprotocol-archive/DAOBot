global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {updateProposalRecords} = require('./airtable_utils')
const {getAllProposals, processProposalStandings, processHistoricalStandings} = require('./proposals/proposal_standings')

var currentRound = 8

const main = async () => {
    // Step 1 - Identify all proposal standings
    let allProposals = await getAllProposals(currentRound)
    let proposalStandings = await processProposalStandings(allProposals)
    console.log('\n======== Proposal Standings Found\n', JSON.stringify(proposalStandings))

    // Step 2 - Resolve & Report standings
    await processHistoricalStandings(proposalStandings)
    console.log('\n======== Reported Proposal Standings\n', JSON.stringify(proposalStandings))

    let rows = []
    for (const [key, value] of Object.entries(proposalStandings)) {
        rows = rows.concat(value)
    }

    await updateProposalRecords(rows)
    console.log('\n[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), Object.entries(rows).length)
}

main()
