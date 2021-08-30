global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const moment = require('moment')
const {getRoundsSelectQuery, updateRoundRecord} = require('../airtable/airtable_utils')
const {RoundState, getCurrentRound} = require('../airtable/rounds/funding_rounds')
const {processFundingRoundComplete} = require('../airtable/process_airtable_funding_round_complete')
const {prepareProposalsForSnapshot} = require('../snapshot/prepare_snapshot_received_proposals_airtable')
const {submitProposalsToSnapshot} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')
const {syncAirtableActiveProposalVotes} = require('../airtable/sync_airtable_active_proposal_votes_snapshot')
const {syncGSheetsActiveProposalVotes} = require('../gsheets/sync_gsheets_active_proposal_votes_snapshot')

const main = async () => {
    const curRound = await getCurrentRound()
    let curRoundNumber = undefined
    let curRoundState = undefined
    let curRoundStartDate = undefined
    let curRoundProposalsDueBy = undefined
    let curRoundVoteStart = undefined
    let curRoundVoteEnd = undefined

    if( curRound !== undefined ) {
        curRoundNumber = curRound.get('Round')
        curRoundState = curRound.get('Round State')
        curRoundStartDate = curRound.get('Start Date')
        curRoundProposalsDueBy = curRound.get('Proposals Due By')
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
        if( lastRoundState === RoundState.Voting && lastRoundVoteEnd <= now ) {
            console.log("Start next round.")

            // Update votes
            syncAirtableActiveProposalVotes(curRoundNumber)
            syncGSheetsActiveProposalVotes(curRoundNumber)

            // Complete round calculations
            processFundingRoundComplete(curRoundNumber)

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
                }
            }]
            updateRoundRecord(roundUpdate)
        } else if( curRoundStartDate <= now ) {
            console.log("Start current round.")

            // Start the current round
            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.Started,
                }
            }]
            updateRoundRecord(roundUpdate)
        }
    } else {
        if(curRoundState === RoundState.Started && curRoundProposalsDueBy < now) {
            console.log("Update active round.")

            // Preapre proposals for Snapshot (Check token balance, calc snapshot height)
            prepareProposalsForSnapshot(curRound)
        }else if(curRoundState === RoundState.Started && curRoundProposalsDueBy >= now) {
            console.log("Start DD period.")

            // Prepare proposals for Snapshot (Check token balance, calc snapshot height)
            prepareProposalsForSnapshot(curRound)

            // Enter Due Diligence period
            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.DueDiligence,
                }
            }]
            updateRoundRecord(roundUpdate)
        }else if(curRoundState === RoundState.DueDiligence && curRoundVoteStart >= now) {
            console.log("Start Voting period.")

            // Submit to snapshot + Enter voting state
            submitProposalsToSnapshot(curRoundNumber)

            const roundUpdate = [{
                id: curRound['id'],
                fields: {
                    'Round State': RoundState.Voting,
                }
            }]
            updateRoundRecord(roundUpdate)
        }else if(curRoundState === RoundState.Voting && curRoundVoteEnd > now) {
            console.log("Update vote count.")

            // Update votes
            syncAirtableActiveProposalVotes(curRoundNumber)
            syncGSheetsActiveProposalVotes(curRoundNumber)
        }
    }
}

main()
