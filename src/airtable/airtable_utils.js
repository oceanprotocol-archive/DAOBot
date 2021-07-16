const fetch = require('cross-fetch')
const base = require('airtable').base(process.env.AIRTABLE_BASEID)

const splitArr = (arr, chunk) => {
    let arrSplit = []
    for (i=0; i < arr.length; i += chunk) {
        arrSplit.push(arr.slice(i, i + chunk))
    }
    return arrSplit
}

const getProposalsSelectQuery = async (selectQuery, sortQuery=[]) => {
    try {
        return await base('Proposals').select({
            view: "All Proposals",
            filterByFormula: selectQuery,
            sort: sortQuery
        }).firstPage()
    } catch(err) {
        console.log(err)
    }
}

const sumSnapshotVotesToAirtable = async (proposals, scores) => {
    let records = []
    proposals.map((p) => {
        const batchIndex = p.get('Snapshot Batch Index')
        const ipfsHash = p.get('ipfsHash')

        const yesIndex = batchIndex === undefined ? 1 : batchIndex
        const noIndex = batchIndex === undefined ? 2 : undefined

        const yesVotes = scores[ipfsHash][yesIndex] === undefined ? 0 : scores[ipfsHash][yesIndex]
        const noVotes = scores[ipfsHash][noIndex] === undefined ? 0 : scores[ipfsHash][noIndex]

        records.push(
            {
                id: p.id,
                fields: {
                    'Voted Yes': yesVotes,
                    'Voted No': noVotes
                }
            }
        )
    });
    return records
}

const updateProposalRecords = async (records) => {
    const splitReocrds = splitArr(records, 10)
    await Promise.all(splitReocrds.map(batch =>
        fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASEID}/Proposals`, {
            method: "patch", // make sure it is a "PATCH request"
            headers: {
                Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`, // API key
                "Content-Type": "application/json",
            },
            body: JSON.stringify({records: batch}),
        })
        .then((res) => {
            console.log('Response from Airtable: ', res.status)
        })
        .catch((err) => {
            console.log(err);
        })
    ))
}

module.exports = {getProposalsSelectQuery, updateProposalRecords, sumSnapshotVotesToAirtable}
