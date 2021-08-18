global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery} = require('../airtable/airtable_utils');
const {initOAuthToken} = require('./gsheets')
const {getValues, addSheet, updateValues} = require('./gsheets_utils')
const {getProposalVotes} = require('../snapshot/snapshot_utils');
const {getCurrentRound} = require('../airtable/rounds/funding_rounds')

// DRY/PARAMETERIZE
var curRoundNumber = undefined
const snapshot = require('@snapshot-labs/snapshot.js')
const space = 'officialoceandao.eth';

// TODO - RA: First 4 rounds were done with an ERC20-only strategy
const marketStrategy = [
    {
        name: 'erc20-balance-of',
        params: {
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            symbol: "OCEAN",
            decimals: 18
        }
    },
    {
        name: 'ocean-marketplace',
        params: {
            address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
            symbol: "OCEAN",
            decimals: 18
        }
    }
];

const network = '1';
const provider = snapshot.utils.getProvider(network);

// Let's track the state of various proposals
var activeProposals = {}
var proposalVotes = {}
var proposalScores = {}

// gsheet summaries to make downstream happy
var proposalSummary = {}
var roundSummary = {}

// Per Snapshot Proposal -> Google Sheet
// 1. Get proposal data
// 2. Creates sheet if doesn't exist
// 3. Flatten proposals into an array of values
// 4. Dumps flat scores & header from snapshot
const dumpFromSnapshotRawToGSheet = async (ipfsHash) => {
    const oAuth = await initOAuthToken()

    // DRY
    // Get the sheet, otherwise create it
    var proposal = await getValues(oAuth, ipfsHash, 'A1:B3')
    if (proposal === undefined) {
        var newSheets = await addSheet(oAuth, ipfsHash, indexOffset=curRoundNumber)
        console.log("Created new sheet [%s] at index [%s].", ipfsHash, curRoundNumber)
    }

    // Flatten votes from this proposal
    var flatObj = Object.entries(proposalVotes[ipfsHash]).map((v) => {
        try {
            const vote = v[1]
            return [
                vote.address,
                vote.msg.payload.choice,
                vote.msg.payload.balance,
                vote.msg.timestamp,
                vote.msg.version,
                vote.authorIpfsHash,
                vote.relayerIpfsHash
            ]
        } catch(err) {
            console.log(err)
        }
    })

    // Dump flattened data from snapshot to sheet
    flatObj.splice(0,0, ['address','choice','balace','timestamp','version','authorIpfsHash','relayIpfsHash'])
    await updateValues(oAuth, ipfsHash, 'A1:G'+flatObj.length, flatObj)
}

// For each proposal, calculate their summary
const calculateProposalSummary = async (proposals, scores) => {
    let records = []
    proposals.map((p) => {
        // TODO - Add support for non-granular voting system
        const batchIndex = p.get('Snapshot Batch Index')
        const ipfsHash = p.get('ipfsHash')

        const yesIndex = batchIndex === undefined ? 1 : batchIndex
        const noIndex = batchIndex === undefined ? 2 : undefined

        const yesVotes = scores[ipfsHash][yesIndex] || 0
        const noVotes = noIndex === 2 ? scores[ipfsHash][noIndex] : 0

        let numVoters = 0
        if( batchIndex === undefined ) {
            numVoters = Object.keys(proposalVotes[ipfsHash]).length
        } else {
            numVoters = Object.entries(proposalVotes[ipfsHash])
                .map((v) => {return v[1].msg.payload.choice === batchIndex ? 1 : 0})
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

const calculateRoundSummary = async (proposals, scores) => {
    // push all votes, from all proposals into a single object
    let votes = []
    const batchMode = proposals[0].get('Snapshot Batch Index') !== undefined
    // If Granular Voting
    if(batchMode === true) {
        votes = Object.entries(proposalVotes[proposals[0].get('ipfsHash')])
    } else {
        proposals.map((p) => {
            const ipfsHash = p.get('ipfsHash')
            votes = votes.concat(Object.entries(proposalVotes[ipfsHash]))
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
            vote.msg.payload.choice,
            vote.msg.payload.balance,
            vote.msg.timestamp,
            vote.msg.version,
            vote.authorIpfsHash,
            vote.relayerIpfsHash
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
            Object.values(w).map((v) => {
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
const dumpRoundSummaryToGSheets = async (proposalSummary, roundSummary) => {
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
const getVoterScores = async (provider, voters, blockHeight) => {

    return snapshot.utils.getScores(
        space,
        marketStrategy,
        network,
        provider,
        voters,
        blockHeight
    ).then(scores => {
        return scores
    });
}

// DRY
const getActiveProposalVotes = async () => {
    activeProposals = await getProposalsSelectQuery(`AND({Round} = "${curRoundNumber}", NOT({Proposal State} = "Rejected"), "true")`)

    await Promise.all(activeProposals.map(async (proposal) => {
        try {
            const ipfsHash = proposal.get('ipfsHash')

            await getProposalVotes(ipfsHash)
                .then((result) => {
                    proposalVotes[ipfsHash] = result.data
                })

            const voters = Object.keys(proposalVotes[ipfsHash])
            const voterScores = await getVoterScores(provider, voters, proposal.get('Snapshot Block'))

            // Add up total voter score, from all snapshot strategies.
            Object.entries(proposalVotes[ipfsHash]).map((voter) => {
                const strategyScore1 = voterScores[0][voter[0]] || 0
                const strategyScore2 = voterScores[1][voter[0]] || 0

                voter[1].msg.payload.balance = strategyScore1 + strategyScore2
            })

            // Add up total voter score, from all snapshot strategies.
            let scores = {
                1: 0,
                2: 0
            }
            Object.entries(proposalVotes[ipfsHash]).reduce((total, cur) => {
                const choice = cur[1].msg.payload.choice
                const balance = cur[1].msg.payload.balance
                if( scores[choice] === undefined ) scores[choice] = 0
                scores[choice] += balance
            }, {})

            proposalScores[ipfsHash] = scores
        } catch (err) {
            console.log(err)
        }
    }))
}

const main = async () => {
    const curRound = await getCurrentRound()
    curRoundNumber = curRound.get('Round')
    
    // Retrieve all active proposals from Airtable
    await getActiveProposalVotes()

    // Output the raw snapshot raw data into gsheets
    Object.entries(proposalVotes).map(async (p) => {
        await dumpFromSnapshotRawToGSheet(p[0])
    })

    // Output the round summary
    proposalSummary = await calculateProposalSummary(activeProposals, proposalScores)
    roundSummary = await calculateRoundSummary(activeProposals, proposalScores)
    await dumpRoundSummaryToGSheets(proposalSummary, roundSummary)

    console.log('Updated GSheets')
}

main()
