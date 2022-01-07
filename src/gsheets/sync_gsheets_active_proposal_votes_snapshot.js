global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
const { BallotType } = require('../snapshot/snapshot_utils')
const Logger = require('../utils/logger')
dotenv.config()

const { getProposalsSelectQuery } = require('../airtable/airtable_utils')
const { initOAuthToken } = require('./gsheets')
const { getValues, addSheet, updateValues } = require('./gsheets_utils')
const {
  getVoteCountStrategy,
  getVoterScores,
  getProposalVotesGQL,
  reduceVoterScores,
  reduceProposalScores
} = require('../snapshot/snapshot_utils')

// Let's track the state of various proposals
let activeProposals = {}
// var voterScores = {}
// var proposalScores = {}

// gsheet summaries to make downstream happy
let proposalSummary = {}
let roundSummary = {}

// Per Snapshot Proposal -> Google Sheet
// 1. Get proposal data
// 2. Creates sheet if doesn't exist
// 3. Flatten proposals into an array of values
// 4. Dumps flat scores & header from snapshot

/*
const dumpFromSnapshotRawToGSheet = async (
  curRoundNumber,
  ipfsHash,
  voterScores
) => {
  const oAuth = await initOAuthToken()

  // DRY
  // Get the sheet, otherwise create it
  var proposal = await getValues(oAuth, ipfsHash, 'A1:B3')
  if (proposal === undefined) {
    await addSheet(oAuth, ipfsHash, curRoundNumber)
    console.log(
      'Created new sheet [%s] at index [%s].',
      ipfsHash,
      curRoundNumber
    )
  }

  // Flatten votes from this proposal
  var flatObj = Object.entries(voterScores[ipfsHash]).map((v) => {
    try {
      const vote = v[1]
      return [vote.address, vote.balance]
    } catch (err) {
      Logger.error(err)
    }
  })
  // Flatten votes from this proposal
  var flatObj = Object.entries(voterScores[ipfsHash]).map((v) => {
    try {
      const vote = v[1]
      return [
        vote.address,
        JSON.stringify(vote.choice),
        vote.created,
        vote.balance
      ]
    } catch (err) {
      console.log(err)
    }
  })
  // Dump flattened data from snapshot to sheet
  flatObj.splice(0, 0, ['address', 'choice', 'created', 'balace'])
  await updateValues(oAuth, ipfsHash, 'A1:E' + flatObj.length, flatObj)
}
*/

// For each proposal, calculate their summary
const calculateProposalSummary = async (
  proposals,
  voterScores,
  proposalScores
) => {
  const records = []
  proposals.map((p) => {
    // TODO - Add support for non-granular voting system
    const batchIndexYes = p.get('Snapshot Batch Index')
    const batchIndexNo = p.get('Snapshot Batch Index No')
    const ipfsHash = p.get('ipfsHash')

    const yesIndex = batchIndexYes === undefined ? 1 : batchIndexYes
    const noIndex = batchIndexNo === undefined ? 2 : batchIndexNo

    const yesVotes = proposalScores[ipfsHash][yesIndex] || 0
    const noVotes = proposalScores[ipfsHash][noIndex] || 0

    let numVoters = 0
    if (batchIndexYes === undefined || batchIndexNo === undefined) {
      numVoters = Object.keys(voterScores[ipfsHash]).length
    } else {
      numVoters = Object.entries(voterScores[ipfsHash])
        .map((v) => {
          return v[1].choice[batchIndexYes] > 0 || v[1].choice[batchIndexNo] > 0
            ? 1
            : 0
        })
        .reduce((total, num) => {
          return total + num
        }, 0)
    }
    const sumVotes = yesVotes + noVotes

    records.push([
      ipfsHash,
      p.get('Project Name'),
      yesVotes,
      noVotes,
      numVoters,
      sumVotes
    ])
  })
  return records
}

const calculateRoundSummary = async (
  curRoundBallotType,
  proposals,
  voterScores
) => {
  // push all votes, from all proposals into a single object
  let votes = []

  // If Granular Voting
  if (curRoundBallotType === BallotType.Granular) {
    votes = Object.entries(voterScores[proposals[0].get('ipfsHash')])
  } else if (curRoundBallotType === BallotType.Batch) {
    const ipfsHash = proposals[0].get('ipfsHash')
    votes = votes.concat(Object.entries(voterScores[ipfsHash]))
  }

  // map votes to each wallet
  const wallets = {}
  votes.map((v) => {
    const vote = v[1]
    if (wallets[v[0]] == null) {
      wallets[v[0]] = []
    }

    wallets[v[0]].push([vote.address, vote.choice, vote.balance])
  })

  // reduce wallet summary
  const walletSummary = {}
  Object.values(wallets).map((w) => {
    const address = w[0][0]
    walletSummary[address] = {
      numVotes: 0,
      numYes: 0,
      numNo: 0,
      sumYes: 0,
      sumNo: 0
    }

    if (curRoundBallotType === BallotType.Granular) {
      Object.values(w).map((v) => {
        walletSummary[address].numVotes++
        walletSummary[address].numYes += 1
        walletSummary[address].sumYes += v[2]
        walletSummary[address].sumNo = 0
      })
    } else if (curRoundBallotType === BallotType.Batch) {
      // For the batch case, the choices are the same on all proposals
      // And is a dictionary of form: {1: 1, 3: 2, 4: 2, 5: 2, 6: 1}
      // So calculating all the votes distribution once
      if (w.length > 0) {
        const wallet = w[0]

        const proposalsYesIndexes = []
        const proposalsNoIndexes = []
        proposals.map((p) => {
          proposalsYesIndexes.push(p.get('Snapshot Batch Index'))
          proposalsNoIndexes.push(p.get('Snapshot Batch Index No'))
        })
        const walletBalance = wallet[2]
        const walletChoices = wallet[1]
        let numYesVotes = 0
        let sumYesVotes = 0
        let numNoVotes = 0
        let sumNoVotes = 0

        let allWalletVotesCount = 0
        allWalletVotesCount += Object.entries(walletChoices).length

        for (const [index, votesCount] of Object.entries(walletChoices)) {
          const proposalIndex = parseInt(index)

          if (votesCount > 0 && allWalletVotesCount > 0 && walletBalance > 0) {
            if (proposalsYesIndexes.includes(proposalIndex)) {
              numYesVotes += 1
              sumYesVotes += (walletBalance / allWalletVotesCount) * 1
            } else if (proposalsNoIndexes.includes(proposalIndex)) {
              numNoVotes += 1
              sumNoVotes += (walletBalance / allWalletVotesCount) * 1
            }
          }
        }
        walletSummary[address].numVotes += allWalletVotesCount
        walletSummary[address].numYes += numYesVotes
        walletSummary[address].numNo += numNoVotes
        walletSummary[address].sumYes += sumYesVotes
        walletSummary[address].sumNo += sumNoVotes
      }
    }
  })

  // Output the round summary
  // unique wallets, num yes, num no, avg votes per wallet, total votes, sum yes, sum no
  const record = {}
  record.numProposals = Object.values(proposals).length
  record.numWallets = Object.values(wallets).length
  record.numVotes =
    Object.values(wallets).length === 0
      ? 0
      : Object.entries(walletSummary)
          .map((ws) => {
            return ws[1].numVotes
          })
          .reduce((total, num) => {
            return total + num
          })

  record.numYes =
    Object.values(wallets).length === 0
      ? 0
      : Object.entries(walletSummary)
          .map((ws) => {
            return ws[1].numYes
          })
          .reduce((total, num) => {
            return total + num
          })
  record.numNo =
    Object.values(wallets).length === 0
      ? 0
      : Object.entries(walletSummary)
          .map((ws) => {
            return ws[1].numNo
          })
          .reduce((total, num) => {
            return total + num
          })
  record.sumYes =
    Object.values(wallets).length === 0
      ? 0
      : Object.entries(walletSummary)
          .map((ws) => {
            return ws[1].sumYes
          })
          .reduce((total, num) => {
            return total + num
          })
  record.sumNo =
    Object.values(wallets).length === 0
      ? 0
      : Object.entries(walletSummary)
          .map((ws) => {
            return ws[1].sumNo
          })
          .reduce((total, num) => {
            return total + num
          })

  return [
    [
      record.numProposals,
      record.numWallets,
      record.numVotes,
      record.numYes,
      record.numNo,
      record.sumYes,
      record.sumNo,
      record.sumYes + record.sumNo
    ]
  ]
}

// ProposalSummary + RoundSummary -> Google Sheet
const dumpRoundSummaryToGSheets = async (
  curRoundNumber,
  proposalSummary,
  roundSummary
) => {
  const oAuth = await initOAuthToken()

  // DRY
  // Get the sheet, otherwise create it
  const sheetName = `Round ${curRoundNumber} Results`
  var sheet = await getValues(oAuth, sheetName, 'A1:B3')
  if (sheet === undefined) {
    await addSheet(oAuth, sheetName)
    await Logger.log('Created new sheet [%s] at index 0.', sheetName)
  }

  // Dump flattened data from proposalSummary to sheet
  let flatObj = proposalSummary
  flatObj.splice(0, 0, [
    'ipfsHash',
    'Project Name',
    'Yes',
    'No',
    'Num Voters',
    'Sum Votes'
  ])
  await updateValues(oAuth, sheetName, 'A1:F' + flatObj.length, flatObj)

  // Dump flattened data from roundSummary to sheet
  flatObj = roundSummary
  flatObj.splice(0, 0, [
    'Num Proposals',
    'Unique Wallets',
    'Num Votes',
    'Num yes',
    'Num No',
    'Sum Yes',
    'Sum No',
    'Sum Votes'
  ])
  await updateValues(oAuth, sheetName, 'J1:Q' + flatObj.length, flatObj)
}

// DRY
const getActiveProposalVotes = async (curRoundNumber, curRoundBallotType) => {
  const proposalVotes = {}
  const voterScores = {}
  const proposalScores = {}

  activeProposals = await getProposalsSelectQuery(
    `AND({Round} = "${curRoundNumber}", AND(NOT({Proposal State} = "Withdrawn"), NOT({Proposal State} = "Rejected"), "true"), "true")`
  )

  await Promise.all(
    activeProposals.map(async (proposal) => {
      try {
        const ipfsHash = proposal.get('ipfsHash')
        const strategy = getVoteCountStrategy(proposal.get('Round'))
        await getProposalVotesGQL(ipfsHash).then((result) => {
          proposalVotes[ipfsHash] = result.data.votes
        })
        const voters = []
        for (var i = 0; i < proposalVotes[ipfsHash].length; ++i) {
          voters.push(proposalVotes[ipfsHash][i].voter)
        }

        const scores = await getVoterScores(
          strategy,
          voters,
          proposal.get('Snapshot Block')
        )

        voterScores[ipfsHash] = reduceVoterScores(
          strategy,
          proposalVotes[ipfsHash],
          scores
        )
        proposalScores[ipfsHash] = reduceProposalScores(
          curRoundBallotType,
          voterScores[ipfsHash]
        )
      } catch (err) {
        Logger.error(err)
      }
    })
  )

  return [voterScores, proposalScores]
}

const syncGSheetsActiveProposalVotes = async (
  curRoundNumber,
  curRoundBallotType
) => {
  // Retrieve all active proposals from Airtable
  const results = await getActiveProposalVotes(
    curRoundNumber,
    curRoundBallotType
  )
  const voterScores = results[0]
  const proposalScores = results[1]

  // Output the raw snapshot raw data into gsheets
  /*
  Object.entries(voterScores).map(async (p) => {
    await timer(3000)
    await dumpFromSnapshotRawToGSheet(curRoundNumber, p[0], voterScores)
  })
  */

  // Output the round summary
  proposalSummary = await calculateProposalSummary(
    activeProposals,
    voterScores,
    proposalScores
  )
  roundSummary = await calculateRoundSummary(
    curRoundBallotType,
    activeProposals,
    voterScores
  )
  await dumpRoundSummaryToGSheets(curRoundNumber, proposalSummary, roundSummary)

  Logger.log('Updated GSheets')
}

module.exports = { syncGSheetsActiveProposalVotes }
