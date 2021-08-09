global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords} = require('./airtable_utils')
const {getCurrentRound} = require('./rounds/funding_rounds')
const {getWinningProposals, calculateFinalResults, getDownvotedProposals} = require('./rounds/funding_rounds')

const main = async () => {
    const curRound = await getCurrentRound()
    const curRoundNumber = curRound.get('Round')

    // Step 1 - Identify all winning and downvoted proposals
    const activeProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`)
    const downvotedProposals = getDownvotedProposals(activeProposals)
    const winningProposals = getWinningProposals(activeProposals)
    const finalResults = calculateFinalResults(winningProposals, curRound)

    let rows = []
    rows = rows.concat(downvotedProposals)
    rows = rows.concat(finalResults.earmarkedResults.winningProposals)
    rows = rows.concat(finalResults.generalResults.winningProposals)
    rows = rows.concat(finalResults.partiallyFunded)
    rows = rows.concat(finalResults.notFunded)

    rows = rows.map(p => {
        return {
            id: p['id'],
            fields: {
                'Proposal State': p.get('Proposal State'),
                'USD Granted': p.get('USD Granted'),
                'OCEAN Requested': p.get('OCEAN Requested'),
                'OCEAN Granted': p.get('OCEAN Granted')
            }
        }
    })

    // Finally, update all DB records
    await updateProposalRecords(rows)
    console.log('\n[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), Object.entries(rows).length)
}

main()
