global.fetch = require('cross-fetch')
const Logger = require('../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const moment = require('moment')
const {
    getProposalsSelectQuery,
    getRoundsSelectQuery,
    updateRoundRecord
} = require('../airtable/airtable_utils')
const {
    RoundState,
    getCurrentRound,
    completeEarstructuresValues,
    calculateWinningProposalsForEarmark
} = require('../airtable/rounds/funding_rounds')
const {
    processAirtableNewProposals
} = require('../airtable/process_airtable_new_proposals')
const {
    processFundingRoundComplete,
    computeBurnedFunds
} = require('../airtable/process_airtable_funding_round_complete')
const {
    prepareProposalsForSnapshot
} = require('../snapshot/prepare_snapshot_received_proposals_airtable')
const {
    submitProposalsToSnaphotGranular,
    submitProposalsToSnaphotBatch
} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')
const {
    syncAirtableActiveProposalVotes
} = require('../airtable/sync_airtable_active_proposal_votes_snapshot')
const {
    syncGSheetsActiveProposalVotes
} = require('../gsheets/sync_gsheets_active_proposal_votes_snapshot')
const { BallotType } = require('../snapshot/snapshot_utils')
const { sleep } = require('../functions/utils')
const { getTokenPrice } = require('../functions/chainlink')
const {
    processAirtableProposalStandings
} = require('../airtable/process_airtable_all_proposal_standings')
const {
    checkAndGenerateNextRoundOpsSchedule
} = require('../scripts/ops/generate_issues')

const prepareNewProposals = async (curRound, curRoundNumber) => {
    // Prepare proposals for Snapshot (Check token balance, calc snapshot height)
    await processAirtableNewProposals(curRoundNumber)

    // Review all standings for Snapshot
    sleep(1000)
    await prepareProposalsForSnapshot(curRound)
}

const updateFunding = async (round) => {
    const tokenPrice = await getTokenPrice()
    let basisCurrency = round.get('Basis Currency')

    let fundingAvailable = 0
    let fundingAvailableUSD = 0

    switch (basisCurrency) {
        case 'USD': {
            fundingAvailableUSD = round.get('Funding Available USD')
            fundingAvailable = fundingAvailableUSD / tokenPrice
            break
        }
        case 'OCEAN': {
            fundingAvailable = round.get('Funding Available')
            fundingAvailableUSD = fundingAvailable * tokenPrice
            break
        }

        default:
            Logger.log('No Basis Currency was selected for this round.')
    }

    const roundUpdate = [
        {
            id: round.id,
            fields: {
                'OCEAN Price': tokenPrice,
                Earmarks: JSON.stringify(
                    completeEarstructuresValues(round, tokenPrice, basisCurrency)
                ),
                'Funding Available': fundingAvailable,
                'Funding Available USD': fundingAvailableUSD
            }
        }
    ]

    // Update funding information
    await updateRoundRecord(roundUpdate)
}

const updateVotes = async (round) => {
    let curRoundNumber = round.get('Round')
    let curRoundBallotType = round.get('Ballot Type')

    // Update votes
    await syncAirtableActiveProposalVotes(curRoundNumber, curRoundBallotType)
    // await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
}

const updateWinners = async (round) => {
    let roundNumber = round.get('Round')
    let roundBasisCurrency = round.get('Basis Currency')
    let roundFundingAvailable = round.get('Funding Available')

    const oceanPrice = await getTokenPrice() // get the latest Ocean price
    const earmarkStructure = await completeEarstructuresValues(
        round,
        oceanPrice,
        roundBasisCurrency
    ) // calculate the earmark values based on the updated Ocean price

    // Update votes and compute funds burned
    const fundsBurned = await computeBurnedFunds(round, roundNumber)

    // Complete round calculations
    const proposalsFunded = await processFundingRoundComplete(round, roundNumber)

    // Update airtable
    const roundUpdate = [{
        id: round.id,
        fields: {
            'OCEAN Price': oceanPrice,
            'Proposals Granted': proposalsFunded,
            'OCEAN Burned': fundsBurned,
            Earmarks: JSON.stringify(earmarkStructure),
            'Funding Available USD': roundFundingAvailable * oceanPrice
        }
    }]
    await updateRoundRecord(roundUpdate)
}

const updateReports = async (round) => {
    // await syncAirtableActiveProposalVotes(curRoundNumber, curRoundBallotType)
    // await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
    /*
    // the following line will disable this test, should be commented in to make the test run
    if (curRound.get('Round') !== 1) return
    if (curRound.get('Round State') !== 'Voting') return
    const oceanPrice = await getTokenPrice() // get the latest Ocean price
    const earmarkStructure = await completeEarstructuresValues(
        curRound,
        oceanPrice,
        curRound.get('Basis Currency')
    ) // calculate the earmark values based on the updated Ocean price

    curRound['OCEAN Price'] = oceanPrice
    curRound.Earmarks = JSON.stringify(earmarkStructure)
    curRound['Funding Available USD'] =
    curRound.get('Funding Available') * oceanPrice

    // Complete round calculations
    const activeProposals = await getProposalsSelectQuery(
        `AND({Round} = "${curRound.get(
            'Round'
        )}", NOT({Proposal State} = "Withdrawn"), "true")`
    )

    clearFundedRecords(activeProposals)
    const downvotedProposals = getDownvotedProposals(activeProposals)
    const winningProposals = getWinningProposals(
        activeProposals,
        curRound.get('Round')
    )
    const finalResults = calculateFinalResults(winningProposals, curRound)
    const oceanFunded =
        finalResults.resultsByEarmark.usdEarmarked / curRound.get('OCEAN Price')
    oceanFunded.should.equal(
        curRound.get('Funding Available') -
        finalResults.resultsByEarmark.fundsLeftOcean
    )

    // write results to GSsheets
    const downvotedResults = await dumpResultsToGSheet(downvotedProposals)

    const partiallyFundedResults = await dumpResultsToGSheet(
        finalResults.partiallyFunded
    )
    const notFundedResults = await dumpResultsToGSheet(finalResults.notFunded)

    // Finally, write to gsheets
    const oAuth = await initOAuthToken()
    const fundsLeftRule = curRound.get('Funds Left')
    const sheetName = 'Round' + curRound.get('Round') + 'FinalResults'

    // Get the sheet, otherwise create it
    let sheet = await getValues(oAuth, sheetName, 'A1:B3')
    if (sheet === undefined) {
        sheet = await addSheet(oAuth, sheetName)
        Logger.log('Created new sheet [%s].', sheetName)
    }
    let gsheetRows = []
    // Flatten results onto gsheetRows
    gsheetRows = await dumpWiningProposalsByEarmarksToGSheet(
        finalResults.resultsByEarmark,
        gsheetRows
    )
    partiallyFundedResults.splice(0, 0, ['Partially Funded'])
    partiallyFundedResults.push([''])
    notFundedResults.splice(0, 0, ['Proposals that could not be funded'])
    notFundedResults.push([''])
    downvotedResults.splice(0, 0, ['Downvoted Proposals'])
    downvotedResults.push([''])
    gsheetRows = gsheetRows.concat(partiallyFundedResults)
    gsheetRows = gsheetRows.concat(notFundedResults)
    gsheetRows = gsheetRows.concat(downvotedResults)

    // 2x Rows => Header & Summed results
    gsheetRows.push([''])
    gsheetRows.push(['Summed round results'])
    const oceanUSD = curRound.get('OCEAN Price')
    const foundsLeftRuleString =
        fundsLeftRule === 'Burn' ? 'Burned' : 'Recycled'
    const usdResultsTexts = []
    const oceanResultsTexts = []
    const usdResultsValues = []
    const oceanResultsValues = []
    finalResults.resultsByEarmark.earmarks.forEach((earmark) => {
        usdResultsTexts.push(`${earmark} USD ${foundsLeftRuleString}`)
        oceanResultsTexts.push(`${earmark} OCEAN ${foundsLeftRuleString}`)
        const usdFundsLeft = finalResults.resultsByEarmark[earmark].fundsLeft
        usdResultsValues.push(finalResults.resultsByEarmark[earmark].fundsLeft)
        oceanResultsValues.push(usdFundsLeft / oceanPrice)
    })

    // Total USD&OCEAN burned/recycled
    usdResultsTexts.push(`Total USD ${foundsLeftRuleString}`)
    oceanResultsTexts.push(`Total OCEAN ${foundsLeftRuleString}`)
    usdResultsValues.push(finalResults.resultsByEarmark.fundsRecycled)
    oceanResultsValues.push(
        finalResults.resultsByEarmark.fundsRecycled / oceanUSD
    )

    // Total USD&OCEAN granted
    usdResultsTexts.push(`Total USD Granted`)
    oceanResultsTexts.push(`Total OCEAN Granted`)
    usdResultsValues.push(finalResults.resultsByEarmark.usdEarmarked)
    oceanResultsValues.push(
        finalResults.resultsByEarmark.usdEarmarked / oceanUSD
    )

    gsheetRows.push(usdResultsTexts)
    gsheetRows.push(usdResultsValues)
    gsheetRows.push(oceanResultsTexts)
    gsheetRows.push(oceanResultsValues)
    gsheetRows.push([])

    await updateValues(
        oAuth,
        sheetName,
        'A1:I' + (gsheetRows.length + 1),
        gsheetRows
    )
    */
}

const startSubmissionPeriod = async (round) => {
    // Start the current round
    const roundUpdate = [
        {
            id: round.id,
            fields: {
                'Round State': RoundState.Started
            }
        }
    ]
    await updateRoundRecord(roundUpdate)
}

const updateSubmissionPeriod = async (round) => {
    let roundNumber = round.get('Round')
    await prepareNewProposals(round, roundNumber)
}

const startDueDilligencePeriod = async (round) => {
    let roundNumber = round.get('Round')
    let roundBasisCurrency = round.get('Basis Currency')

    await prepareNewProposals(round, roundNumber)

    const allProposals = await getProposalsSelectQuery(
        `{Round} = ${roundNumber}`
    )

    await createRoundResultsGSheet(roundNumber)

    const roundUpdate = [
        {
            id: round.id,
            fields: {
                'Round State': RoundState.DueDiligence,
                'Proposals': allProposals.length,
            }
        }
    ]
    await updateRoundRecord(roundUpdate)

    updateFunding(round)
}

const startVotingPeriod = async (round) => {
    Logger.log('Start Voting period.')

    // Submit to snapshot + Enter voting state
    if (curRoundBallotType === BallotType.Granular) {
        await submitProposalsToSnaphotGranular(curRoundNumber, curRoundVoteType)
    } else if (curRoundBallotType === BallotType.Batch) {
        await submitProposalsToSnaphotBatch(curRoundNumber, curRoundVoteType)
    }

    const roundUpdate = [
        {
            id: round.id,
            fields: {
                'Round State': RoundState.Voting
            }
        }
    ]
    await updateRoundRecord(roundUpdate)
}

const updateVotingPeriod = (round) => {
    updateFunding(round)
    updateVotes(round)
    updateWinners(round)
    updateReports(round)
}

const endVotingPeriod = async (round) => {
    updateVotingPeriod(round)

    // Start the next round
    const roundUpdate = [
        {
            id: round.id,
            fields: {
                'Round State': RoundState.Ended,
            }
        }
    ]
    await updateRoundRecord(roundUpdate)
}

// Split up functionality
// Make it easy to debug/trigger events
const main = async () => {
    const curRound = await getCurrentRound()
    let curRoundNumber
    let curRoundState
    let curRoundStartDate
    let curRoundProposalsDueBy
    let curRoundVoteStart
    let curRoundVoteEnd

    if (curRound !== undefined) {
        curRoundNumber = curRound.get('Round')
        curRoundState = curRound.get('Round State')
        curRoundStartDate = curRound.get('Start Date')
        curRoundProposalsDueBy = moment(curRound.get('Proposals Due By')).utc().toISOString()
        curRoundVoteStart = curRound.get('Voting Starts')
        curRoundVoteEnd = curRound.get('Voting Ends')

        // TODO-RA: This function will take longer and longer to process
        await processAirtableProposalStandings(curRoundNumber) // process proposal standings
        await checkAndGenerateNextRoundOpsSchedule(curRoundNumber)
    }

    const lastRoundNumber = parseInt(curRoundNumber, 10) - 1
    let lastRound = await getRoundsSelectQuery(`{Round} = ${lastRoundNumber}`)
    let lastRoundState
    let lastRoundVoteEnd

    if (lastRound !== undefined && lastRound.length > 0) {
        ;[lastRound] = lastRound
        lastRoundState = lastRound.get('Round State')
        lastRoundVoteEnd = lastRound.get('Voting Ends')
    }

    const now = moment().utc().toISOString()

    switch(curRoundState) {
        case undefined:
            if (lastRoundState === RoundState.Voting && now >= lastRoundVoteEnd) {
                updateVotingPeriod(lastRound)
                endVotingPeriod(lastRound)
                startSubmissionPeriod(curRound)
            } else if (now >= curRoundStartDate)
                startSubmissionPeriod(curRound)
            break
        case RoundState.Started:
            if (now < curRoundProposalsDueBy)
                updateSubmissionPeriod(curRound)
            else if (now >= curRoundProposalsDueBy)
                startDueDilligencePeriod(curRound)
            break
        case RoundState.DueDiligence:
            if( now >= curRoundVoteStart )
                startVotingPeriod(curRound)
            break
        case RoundState.Voting:
            if( now < curRoundVoteEnd )
                updateVotingPeriod(curRound)
            break
    }
}

main()
