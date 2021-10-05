global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery} = require('../airtable/airtable_utils');
const {initOAuthToken} = require('./gsheets')
const {getValues, addSheet, updateValues} = require('./gsheets_utils')
const {getVoteCountStrategy, getVoterScores, getProposalVotesGQL, reduceVoterScores, reduceProposalScores} = require('../snapshot/snapshot_utils');

// Let's track the state of various proposals
var activeProposals = {}
var voterScores = {}
var proposalScores = {}

// gsheet summaries to make downstream happy
var proposalSummary = {}
var roundSummary = {}

// Per Snapshot Proposal -> Google Sheet
// 1. Get proposal data
// 2. Creates sheet if doesn't exist
// 3. Flatten proposals into an array of values
// 4. Dumps flat scores & header from snapshot
const dumpFromSnapshotRawToGSheet = async (curRoundNumber, ipfsHash, voterScores) => {
    const oAuth = await initOAuthToken()

    // DRY
    // Get the sheet, otherwise create it
    var proposal = await getValues(oAuth, ipfsHash, 'A1:B3')
    if (proposal === undefined) {
        var newSheets = await addSheet(oAuth, ipfsHash, indexOffset=curRoundNumber)
        console.log("Created new sheet [%s] at index [%s].", ipfsHash, curRoundNumber)
    }

    // Flatten votes from this proposal
    var flatObj = Object.entries(voterScores[ipfsHash]).map((v) => {
        try {
            const vote = v[1]
            return [
                vote.address,
                vote.choice,
                vote.balance
            ]
        } catch(err) {
            console.log(err)
        }
    })

    // Dump flattened data from snapshot to sheet
    flatObj.splice(0,0, ['address','choice','balace'])
    await updateValues(oAuth, ipfsHash, 'A1:C'+flatObj.length, flatObj)
}

// For each proposal, calculate their summary
const calculateProposalSummary = async (proposals, voterScores, proposalScores) => {
    let records = []
    proposals.map((p) => {
        // TODO - Add support for non-granular voting system
        const batchIndex = p.get('Snapshot Batch Index')
        const batchIndexNo = p.get('Snapshot Batch Index No')
        const ipfsHash = p.get('ipfsHash')

        const yesIndex = batchIndex === undefined ? 1 : batchIndex
        const noIndex = batchIndexNo === undefined ? 2 : batchIndexNo

        const yesVotes = proposalScores[ipfsHash][yesIndex] || 0
        const noVotes = noIndex === 2 ? proposalScores[ipfsHash][noIndex] : 0

        let numVoters = 0
        if( batchIndex === undefined ) {
            numVoters = Object.keys(voterScores[ipfsHash]).length
        } else {
            numVoters = Object.entries(voterScores[ipfsHash])
                .map((v) => {return v[1].choice === batchIndex ? 1 : 0})
                .reduce((total, num) => {return total + num})
        }
        const sumVotes = yesVotes + noVotes

        records.push(
            [
                ipfsHash,
                p.get("Project Name"),
                yesVotes,
                noVotes,
                numVoters,
                sumVotes
            ]
        )
    });
    return records
}

const calculateRoundSummary = async (proposals, voterScores, proposalScores) => {
    // push all votes, from all proposals into a single object
    let votes = []

    // TODO - Update function to support Y/N voting
    const batchMode = proposals[0].get('Snapshot Batch Index') !== undefined
    // If Granular Voting
    if(batchMode === true) {
        votes = Object.entries(voterScores[proposals[0].get('ipfsHash')])
    } else {
        proposals.map((p) => {
            const ipfsHash = p.get('ipfsHash')
            votes = votes.concat(Object.entries(voterScores[ipfsHash]))
        })
    }

    // map votes to each wallet
    let wallets = {}
    votes.map((v) => {
        const vote = v[1]
        if(wallets[v[0]] == null ) {
            wallets[v[0]] = []
        }

        wallets[v[0]].push([
            vote.address,
            vote.choice,
            vote.balance
        ])
    });

    // reduce wallet summary
    let walletSummary = {}
    Object.values(wallets).map((w) => {
        address = w[0][0]
        walletSummary[address] = {
            'numVotes':0,
            'numYes':0,
            'numNo':0,
            'sumYes':0,
            'sumNo':0
        }

        if(batchMode === true) {
            Object.values(w).map((v) => {
                walletSummary[address]['numVotes']++;
                walletSummary[address]['numYes'] += 1
                walletSummary[address]['sumYes'] += v[2]
                walletSummary[address]['sumNo'] = 0
            })
        } else {
            Object.values(w).map((v) => {proposalScores
                walletSummary[address]['numVotes']++;
                walletSummary[address]['numYes'] += v[1] === 1 ? 1 : 0
                walletSummary[address]['numNo'] += v[1] === 2 ? 1 : 0
                walletSummary[address]['sumYes'] += v[1] === 1 ? v[2] : 0
                walletSummary[address]['sumNo'] += v[1] === 2 ? v[2] : 0
            })
        }
    })

    // Output the round summary
    // unique wallets, num yes, num no, avg votes per wallet, total votes, sum yes, sum no
    let record = {}
    record['numProposals'] = Object.values(proposals).length
    record['numWallets'] = Object.values(wallets).length
    record['numVotes'] = Object.values(wallets).length === 0 ? 0 : Object.entries(walletSummary)
        .map((ws) => {return ws[1]['numVotes']})
        .reduce((total, num) => {return total + num})

    record['numYes'] = Object.values(wallets).length === 0 ? 0 : Object.entries(walletSummary)
        .map((ws) => {return ws[1]['numYes']})
        .reduce((total, num) => {return total + num})
    record['numNo'] = Object.values(wallets).length === 0 ? 0 : Object.entries(walletSummary)
        .map((ws) => {return ws[1]['numNo']})
        .reduce((total, num) => {return total + num})
    record['sumYes'] = Object.values(wallets).length === 0 ? 0 : Object.entries(walletSummary)
        .map((ws) => {return ws[1]['sumYes']})
        .reduce((total, num) => {return total + num})
    record['sumNo'] = Object.values(wallets).length === 0 ? 0 : Object.entries(walletSummary)
        .map((ws) => {return ws[1]['sumNo']})
        .reduce((total, num) => {return total + num})

    return [[
        record['numProposals'],
        record['numWallets'],
        record['numVotes'],
        record['numYes'],
        record['numNo'],
        record['sumYes'],
        record['sumNo'],
        record['sumYes'] + record['sumNo']
    ]]
}

// ProposalSummary + RoundSummary -> Google Sheet
const dumpRoundSummaryToGSheets = async (curRoundNumber, proposalSummary, roundSummary) => {
    const oAuth = await initOAuthToken()

    // DRY
    // Get the sheet, otherwise create it
    const sheetName = `Round ${curRoundNumber} Results`
    var sheet = await getValues(oAuth, sheetName, 'A1:B3')
    if (sheet === undefined) {
        var newSheets = await addSheet(oAuth, sheetName)
        console.log("Created new sheet [%s] at index 0.", sheetName)
    }

    // Dump flattened data from proposalSummary to sheet
    let flatObj = proposalSummary
    flatObj.splice(0,0, ['ipfsHash','Project Name','Yes','No','Num Voters','Sum Votes'])
    await updateValues(oAuth, sheetName, 'A1:F'+flatObj.length, flatObj)

    // Dump flattened data from roundSummary to sheet
    flatObj = roundSummary
    flatObj.splice(0,0, ['Num Proposals','Unique Wallets','Num Votes','Num yes','Num No','Sum Yes','Sum No','Sum Votes'])
    await updateValues(oAuth, sheetName, 'J1:Q'+flatObj.length, flatObj)
}

// DRY
const getActiveProposalVotes = async (curRoundNumber) => {
    let proposalVotes = {}
    let voterScores = {}
    let proposalScores = {}

    activeProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`)

    await Promise.all(activeProposals.map(async (proposal) => {
        try {
            const ipfsHash = proposal.get('ipfsHash')
            let strategy = getVoteCountStrategy(proposal.get('Round'))

            await getProposalVotesGQL(ipfsHash)
                .then((result) => {
                    proposalVotes[ipfsHash] = result.data.votes
                })
            const voters = []
            for (var i = 0; i < proposalVotes[ipfsHash].length; ++i) {
                voters.push(proposalVotes[ipfsHash][i].voter)
            }

            const scores = await getVoterScores(strategy, voters, proposal.get('Snapshot Block'))

            voterScores[ipfsHash] = reduceVoterScores(strategy, proposalVotes[ipfsHash], scores)
            proposalScores[ipfsHash] = reduceProposalScores(voterScores[ipfsHash])
        } catch (err) {
            console.log(err)
        }
    }))

    return [voterScores, proposalScores]
}

const syncGSheetsActiveProposalVotes = async (curRoundNumber) => {
    // Retrieve all active proposals from Airtable
    const results = await getActiveProposalVotes(curRoundNumber)
    let voterScores = results[0]
    let proposalScores = results[1]

    // Output the raw snapshot raw data into gsheets
    Object.entries(voterScores).map(async (p) => {
        await dumpFromSnapshotRawToGSheet(curRoundNumber, p[0], voterScores)
    })

    // Output the round summary
    proposalSummary = await calculateProposalSummary(activeProposals, voterScores, proposalScores)
    roundSummary = await calculateRoundSummary(activeProposals, voterScores, proposalScores)
    await dumpRoundSummaryToGSheets(curRoundNumber, proposalSummary, roundSummary)

    console.log('Updated GSheets')
}

module.exports = {syncGSheetsActiveProposalVotes};
