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

const updateFundingAvailable = async (round) => {
    let roundBasisCurrency = round.get('Basis Currency')

    const tokenPrice = await getTokenPrice()
    const basisCurrency = roundBasisCurrency

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

    await updateRoundRecord(roundUpdate)
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
    await syncGSheetsActiveProposalVotes(curRoundNumber, curRoundBallotType)
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

    updateFundingAvailable(round)
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
}

const endVotingPeriod = async (round) => {
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
