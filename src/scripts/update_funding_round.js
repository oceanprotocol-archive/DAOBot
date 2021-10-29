global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const moment = require('moment')
const {getProposalsSelectQuery, getRoundsSelectQuery, updateRoundRecord} = require('../airtable/airtable_utils')
const {RoundState, getCurrentRound} = require('../airtable/rounds/funding_rounds')
const {processAirtableNewProposals} = require('../airtable/process_airtable_new_proposals')
const {processFundingRoundComplete} = require('../airtable/process_airtable_funding_round_complete')
const {prepareProposalsForSnapshot} = require('../snapshot/prepare_snapshot_received_proposals_airtable')
const {submitProposalsToSnapshot} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')
const {syncAirtableActiveProposalVotes} = require('../airtable/sync_airtable_active_proposal_votes_snapshot')
const {syncGSheetsActiveProposalVotes} = require('../gsheets/sync_gsheets_active_proposal_votes_snapshot')
const {sleep} = require('../functions/utils')
const {getTokenPrice} = require('../functions/coingecko')

const prepareNewProposals = async (curRound, curRoundNumber) => {
    // Prepare proposals for Snapshot (Check token balance, calc snapshot height)
    await processAirtableNewProposals(curRoundNumber)

    // Review all standings for Snapshot
    sleep(1000)
    await prepareProposalsForSnapshot(curRound)
}

// Split up functionality
// Make it easy to debug/trigger events
// DONE - End voting periods
// DONE - Kickoff new round
// DONE - Update existing round
const main = async () => {
    const curRound = await getCurrentRound()
    let curRoundNumber = undefined
    let curRoundState = undefined
    let curRoundStartDate = undefined
    let curRoundProposalsDueBy = undefined
    let curRoundProposalsDueBy_plus15 = undefined
    let curRoundVoteStart = undefined
    let curRoundVoteEnd = undefined

    if( curRound !== undefined ) {
        curRoundNumber = curRound.get('Round')
        curRoundState = curRound.get('Round State')
        curRoundStartDate = curRound.get('Start Date')
        curRoundProposalsDueBy = moment(curRound.get('Proposals Due By')).utc().toISOString()
        curRoundProposalsDueBy_plus15 = moment(curRound.get('Proposals Due By')).add(15, 'minutes').utc().toISOString()
        curRoundVoteStart = curRound.get('Voting Starts')
        curRoundVoteEnd = curRound.get('Voting Ends')
    }

    const lastRoundNumber = parseInt(curRoundNumber, 10) - 1
    let lastRound = await getRoundsSelectQuery(`{Round} = ${lastRoundNumber}`)
    let lastRoundState = undefined
    let lastRoundVoteEnd = undefined

    if( lastRound !== undefined && lastRound.length > 0 ) {
        lastRound = lastRound[0]
        lastRoundState = lastRound.get('Round State')
        lastRoundVoteEnd = lastRound.get('Voting Ends')
    }

    const now = moment().utc().toISOString()

    if (curRoundState === undefined) {
        // this is when the round is ending => switching to the next funding round
        if( lastRoundState === RoundState.Voting && now >= lastRoundVoteEnd ) {
            console.log("Start next round.")

            // Update votes
            await syncAirtableActiveProposalVotes(lastRoundNumber)
            await syncGSheetsActiveProposalVotes(lastRoundNumber)

            // Complete round calculations
            const proposalsFunded = await processFundingRoundComplete(lastRound, lastRoundNumber)

            // Start the next round
            const roundUpdate = [{
                id: lastRound['id'],
                fields: {
                    'Round State': RoundState.Ended,
                }
            }, {
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.Started,
                    'Proposals Granted': proposalsFunded
                }
            }]
            await updateRoundRecord(roundUpdate)
        } else if( now >= curRoundStartDate ) {
            console.log("Start current round.")

            // Start the current round
            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.Started,
                }
            }]
            await updateRoundRecord(roundUpdate)
        }
    } else {
        // this is logic for the current funding round, and the states within it
        if(curRoundState === RoundState.Started && now < curRoundProposalsDueBy ) {
            console.log("Update active round.")
            await prepareNewProposals(curRound, curRoundNumber)
        }else if(curRoundState === RoundState.Started && now >= curRoundProposalsDueBy) {
            console.log("Start DD period.")

            await prepareNewProposals(curRound, curRoundNumber)

            let allProposals = await getProposalsSelectQuery(`{Round} = ${curRoundNumber}`)
            const tokenPrice = await getTokenPrice()
            const USDPrice = 1/tokenPrice
            const basisCurrency = curRound.get('Basis Currency')

            let maxGrant = 0
            let earmarked = 0
            let fundingAvailable = 0

            let maxGrantUSD = 0
            let earmarkedUSD = 0
            let fundingAvailableUSD = 0


            let roundUpdate = [{
                id: curRound['id'],
                fields: {}
            }]

            switch(basisCurrency) {
                case 'USD' :
                maxGrantUSD = curRound.get('Max Grant USD')
                earmarkedUSD = curRound.get('Earmarked USD')
                fundingAvailableUSD = curRound.get('Funding Available USD')

                maxGrant = maxGrantUSD/ tokenPrice
                earmarked = earmarkedUSD / tokenPrice
                fundingAvailable = fundingAvailableUSD / tokenPrice

                roundUpdate = [{
                    id: curRound['id'],
                    fields: {
                        'Round State': RoundState.DueDiligence,
                        'Proposals': allProposals.length,
                        'OCEAN Price': tokenPrice,
                        'Max Grant': maxGrant,
                        'Earmarked': earmarked,
                        'Funding Available': fundingAvailable,
                    }
                }]
                break

                case 'OCEAN': 
                const maxGrantOCEAN = curRound.get('Max Grant')
                const earmarkedOCEAN = curRound.get('Earmarked')
                const fundingAvailableOCEAN = curRound.get('Funding Available')

                maxGrantUSD = maxGrantOCEAN / USDPrice
                earmarkedUSD = earmarkedOCEAN / USDPrice
                fundingAvailableUSD = fundingAvailableOCEAN / USDPrice

                maxGrant = maxGrantOCEAN
                earmarked = earmarkedOCEAN
                fundingAvailable = fundingAvailableOCEAN 
                roundUpdate = [{
                    id: curRound['id'],
                    fields: {
                        'Round State': RoundState.DueDiligence,
                        'Proposals': allProposals.length,
                        'OCEAN Price': tokenPrice,
                        'Max Grant': maxGrant,
                        'Earmarked': earmarked,
                        'Funding Available': fundingAvailable,
                        'Max Grant USD': maxGrantUSD,
                        'Earmarked USD': earmarkedUSD,
                        'Funding Available USD': fundingAvailableUSD
                    }
                }]
                break

                default:
                    console.log('No Basis Currency was selected for this round.')
            }
            
            // Enter Due Diligence period
             
            console.log('ROUND UPDATE: ', roundUpdate)
            await updateRoundRecord(roundUpdate)
        }else if(curRoundState === RoundState.DueDiligence && now >= curRoundVoteStart) {
            console.log("Start Voting period.")

            // Submit to snapshot + Enter voting state
            await submitProposalsToSnapshot(curRoundNumber)

            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.Voting,
                }
            }]
            await updateRoundRecord(roundUpdate)
        }else if(curRoundState === RoundState.DueDiligence && now <= curRoundProposalsDueBy_plus15) {
            // 15 minute grace period from DD to allow Alex to update proposals
            console.log("Update Proposals - Grace Period.")

            await prepareNewProposals(curRound, curRoundNumber)

            let allProposals = await getProposalsSelectQuery(`{Round} = ${curRoundNumber}`)
            // Update proposal count
            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Proposals': allProposals.length,
                }
            }]
            await updateRoundRecord(roundUpdate)

        }else if(curRoundState === RoundState.Voting && now < curRoundVoteEnd) {
            console.log("Update vote count.")

            // Update votes
            await syncAirtableActiveProposalVotes(curRoundNumber)
            await syncGSheetsActiveProposalVotes(curRoundNumber)
        }
    }
}

main()
