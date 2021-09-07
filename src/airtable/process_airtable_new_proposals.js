global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords} = require('./airtable_utils')

// DRY/PARAMETERIZE
const processAirtableNewProposals = async (curRoundNumber) => {
    let inactiveProposals = await getProposalsSelectQuery(`AND({Round} = ${curRoundNumber}, {Proposal State} = "", "true")`)
    let proposalRecords = []

    await Promise.all(inactiveProposals.map(async (p) => {
        try {
            proposalRecords.push({
                id: p['id'],
                fields: {
                    'Proposal State': 'Received',
                    'Round': curRoundNumber
                }
            })
        } catch (err) {
            console.log(err)
        }
    }))

    updateProposalRecords(proposalRecords)
}

module.exports = {processAirtableNewProposals};
