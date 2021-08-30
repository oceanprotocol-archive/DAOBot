global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getRoundsSelectQuery, updateRoundRecord} = require('./airtable_utils')
const {RoundState, getCurrentRound} = require('./rounds/funding_rounds')
const {processFundingRoundComplete} = require('../airtable/process_airtable_funding_round_complete')
const {prepareProposalsForSnapshot} = require('../snapshot/prepare_snapshot_received_proposals_airtable')
const {submitProposalsToSnapshot} = require('../snapshot/submit_snapshot_accepted_proposals_airtable')
const {syncAirtableActiveProposalVotes} = require('../airtable/sync_airtable_active_proposal_votes_snapshot')
const {syncGSheetsActiveProposalVotes} = require('../gsheets/sync_gsheets_active_proposal_votes_snapshot')

const main = async () => {
    const curRound = await getCurrentRound()
    const curRoundNumber = curRound.get('Round')
    const curRoundState = curRound.get('Round State')
    const curRoundStartDate = curRound.get('Start Date')
    const curRoundProposalsDueBy = curRound.get('Proposals Due By')
    const curRoundVoteStart = curRound.get('Voting Starts')
    const curRoundVoteEnd = curRound.get('Voting End')

    const lastRoundNumber = parseInt(curRoundNumber, 10) - 1
    let lastRound = await getRoundsSelectQuery(`{Round} = ${lastRoundNumber}`)
    lastRound = lastRound[0]
    const lastRoundState = lastRound.get('Round State')
    const lastRoundVoteEnd = lastRound.get('Voting End')

    const now = new Date().toISOString().split('T')[0]

    if (curRoundState === undefined) {
        if( lastRoundState === RoundState.Voting && lastRoundVoteEnd <= now) {
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
