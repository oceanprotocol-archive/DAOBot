const {getProposalsSelectQuery} = require('../airtable_utils')

// Let's track the state of various proposals
const Standings = {
    Unreported: 'Unreported',
    Completed: 'Completed',
    Progress: 'In Progress',
    Dispute: 'In Dispute',
    Incomplete: 'Incomplete & Inactive',
    Refunded: 'Funds Returned'
};

const Disputed = {
    Ongoing: 'Ongoing',
    Resolved: 'Resolved'
}

const Earmarks = {
    NewEntrants: 'New Entrants',
    Outreach: 'Outreach'
}

// Project standing has a basic set of rules/priorities.
// TODO - Reimplement in https://xstate.js.org/docs/ if gets more complex
const getProjectStanding = (deliverableChecklist, completed, timedOut, refunded) => {
    let newStanding = undefined

    if( refunded === true ) newStanding = Standings.Refunded
    else if( completed === false && timedOut === true ) newStanding = Standings.Incomplete
    else if( deliverableChecklist.length > 0 ) newStanding = completed === true ? Standings.Completed : Standings.Progress
    else newStanding = Standings.Unreported

    return newStanding
}

// Splits deliverables rich text into a list
// Drops every line that it can't find a checklist
const splitDeliverableChecklist = (deliverableChecklist) => {
    let deliverables = []

    if( deliverableChecklist.length === 0 ) return deliverables

    deliverables = deliverableChecklist.split('\n')
    return deliverables.filter(function (deliverable) {
        return deliverable.indexOf('[]') === 0 || deliverable.indexOf('[ ]') === 0 || deliverable.indexOf('[x]') === 0
    });
}

const areDeliverablesComplete = (deliverables) => {
    let completed = true

    if(deliverables.length === 0)  completed = false
    else {
        deliverables.map((deliverable) => {
            if (deliverable.indexOf('[x]') !== 0) completed = false
        })
    }

    return completed
}

const hasTimedOut = (currentStanding, lastDeliverableUpdate) => {
    let deliverableUpdate = new Date(lastDeliverableUpdate)
    let timeOutDate = new Date(deliverableUpdate.setMonth(deliverableUpdate.getMonth() + 3))
    return Date.now() > timeOutDate
}

// Step 1 - Get all proposal standings
const getAllRoundProposals = async (maxRound, minRound=1) => {
    let allProposals = []
    for (i=minRound; i<=maxRound; i++) {
        let roundProposals = await getProposalsSelectQuery(selectionQuery = `{Round} = "${i}"`)
        allProposals = allProposals.concat(roundProposals)
    }

    return allProposals
}

const getProposalRecord = (proposal) => {
    let proposalURL = proposal.get('Proposal URL')
    let proposalState = proposal.get('Proposal State')
    let currentStanding = proposal.get('Proposal Standing')
    let deliverableChecklist = proposal.get('Deliverable Checklist') || []
    let deliverableUpdate = proposal.get('Last Deliverable Update')
    let refunded = proposal.get('Refund Transaction') !== undefined || currentStanding === Standings.Refunded
    let disputed = proposal.get('Disputed Status')
    let timedOut = hasTimedOut(currentStanding, deliverableUpdate) && currentStanding !== Standings.Unreported
    let deliverables = splitDeliverableChecklist(deliverableChecklist)
    let completed = areDeliverablesComplete(deliverables)
    let newStanding = getProjectStanding(deliverables, completed, timedOut, refunded)

    return {
        id: proposal.id,
        fields: {
            'Proposal State': proposalState,
            'Proposal Standing': newStanding,
            'Disputed Status': disputed,
            'Proposal URL': proposalURL,
            'Outstanding Proposals': "",

        }
    }
}

// Returns all Proposal Standings, indexed by Project Name
const processProposalStandings = (allProposals) => {
    let proposalStandings = {}
    Promise.all(allProposals.map( (proposal) => {
        try {
            let projectName = proposal.get('Project Name')
            let record = getProposalRecord(proposal)

            // Finally, track project standings
            if (proposalStandings[projectName] === undefined) proposalStandings[projectName] = []
            proposalStandings[projectName].push(record)
        } catch (err) {
            console.log(err)
        }
    }))

    return proposalStandings
}

// Step 2 - Resolve historical standings
const processHistoricalStandings = (proposalStandings) => {
    for (const [key, value] of Object.entries(proposalStandings)) {
        let outstandingURL = ""
        let lastStanding = undefined
        value.map( (proposal) => {
            // DISPUTES: If a proposal is under dispute, the project standing becomes poor
            // INCOMPLETION: If a proposal is incomplete/timedout, the project standing becomes poor
            if( lastStanding !== Standings.Incomplete || lastStanding !== Standings.Dispute ) {
                if (proposal.fields['Proposal Standing'] === Standings.Incomplete ) lastStanding = Standings.Incomplete
                else if ( proposal.fields['Disputed Status'] === Disputed.Ongoing ) lastStanding = Standings.Dispute
            }

            // OUTSTANDING PROPOSAL URLS:
            // Collect the URL of proposals that are in poor condition.
            // Report the URL of all proposals that are in poor condition.
            if( proposal.fields['Proposal Standing'] === Standings.Incomplete || proposal.fields['Disputed Status'] === Disputed.Ongoing ) {
                outstandingURL += "- " + proposal.fields['Proposal URL'] + "\n"
                proposal.fields['Outstanding Proposals'] = outstandingURL
                proposal.fields['Proposal Standing'] = lastStanding
            } else if( proposal.fields['Proposal Standing'] !== Standings.Incomplete && proposal.fields['Disputed Status'] !== Disputed.Ongoing && outstandingURL.length > 0 ) {
                proposal.fields['Outstanding Proposals'] = outstandingURL
                proposal.fields['Proposal Standing'] = lastStanding
            }

            // we drop the Proposal URL from being sent back up to Airtable to avoid any issues
            delete proposal.fields['Proposal URL']
        })
    }
}

// Step 3 - Report the latest (top of stack) proposal standing
const getProjectsLatestProposal = (proposalStandings) => {
    let latestProposals = {}
    for (const [key, value] of Object.entries(proposalStandings)) {
        latestProposals[key] = value[value.length-1]
    }

    return latestProposals
}

// Update the Current Round's proposal records, to reflect the overall Project Standing.
const updateCurrentRoundStandings = (currentRoundProposals, latestProposals) => {
    for (const [key, value] of Object.entries(currentRoundProposals)) {
        let latestProposal = latestProposals[key]
        if (latestProposal !== undefined) {
            value[0].fields['Proposal Standing'] = latestProposal.fields['Proposal Standing']
        value[0].fields['Outstanding Proposals'] = latestProposal.fields['Outstanding Proposals']
        } else {
            value[0].fields['Proposal Standing'] = undefined
            value[0].fields['Outstanding Proposals'] = undefined
        }
    }
}

module.exports = {Standings, Disputed, getAllRoundProposals, getProposalRecord, processProposalStandings, processHistoricalStandings, getProjectsLatestProposal, updateCurrentRoundStandings};
