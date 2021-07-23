global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords} = require('../airtable_utils')

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

// Project standing has a basic set of rules/priorities.
// TODO - Reimplement in https://xstate.js.org/docs/ if gets more complex
const getProjectStanding = (deliverableChecklist, incomplete, timedOut, refunded) => {
    let newStanding = undefined

    if( refunded === true ) newStanding = Standings.Refunded
    else if( incomplete === true && timedOut === true ) newStanding = Standings.Incomplete
    else if( deliverableChecklist.length > 0 ) newStanding = incomplete === true ? Standings.Progress : Standings.Completed
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

const hasIncompleteDeliverables = (deliverables) => {
    let incompleteDeliverables = false

    if(deliverables.length === 0)  incompleteDeliverables = true
    else {
        deliverables.map((deliverable) => {
            if (deliverable.indexOf('[x]') !== 0) incompleteDeliverables = true
        })
    }

    return incompleteDeliverables
}

const hasTimedOut = (currentStanding, lastDeliverableUpdate) => {
    let deliverableUpdate = new Date(lastDeliverableUpdate)
    let timeOutDate = new Date(deliverableUpdate.setMonth(deliverableUpdate.getMonth() + 3))
    return currentStanding !== Standings.Unreported && Date.now() > timeOutDate
}

// Step 1 - Get all proposal standings
const getAllProposals = async (currentRound) => {
    let allProposals = []
    for (i=1; i<currentRound; i++) {
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
    let timedOut = hasTimedOut(currentStanding, deliverableUpdate)
    let deliverables = splitDeliverableChecklist(deliverableChecklist)
    let incomplete = hasIncompleteDeliverables(deliverables)
    let newStanding = getProjectStanding(deliverables, incomplete, timedOut, refunded)

    return {
        id: proposal.id,
        fields: {
            'Proposal Standing': newStanding, // || currentStanding,
            'Disputed Status': disputed,
            'Proposal URL': proposalURL,
            'Outstanding Proposals': ""
        }
    }
}

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

// https://coderwall.com/p/flonoa/simple-string-format-in-javascript
String.prototype.format = function() {
    a = this;
    for (k in arguments) {
        a = a.replace("{" + k + "}", arguments[k])
    }
    return a
}

// Step 2 - Resolve historical standings
const processHistoricalStandings = (proposalStandings) => {
    for (const [key, value] of Object.entries(proposalStandings)) {
        let outstandingURL = ""
        let lastStanding = undefined
        value.map( (proposal) => {
            // If lastStanding was good, check for current proposal standing being bad
            if( lastStanding !== Standings.Incomplete || lastStanding !== Standings.Dispute ) {
                if (proposal.fields['Proposal Standing'] === Standings.Incomplete ) lastStanding = Standings.Incomplete
                else if ( proposal.fields['Disputed Status'] === Disputed.Ongoing ) lastStanding = Standings.Dispute
            }

            // If any proposal is outstanding, set the whole project state
            if( proposal.fields['Proposal Standing'] === Standings.Incomplete || proposal.fields['Disputed Status'] === Disputed.Ongoing ) {
                // RA: replace String.prototype.format above if required
                outstandingURL += "- {0}\n".format(proposal.fields['Proposal URL'])
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

module.exports = {Standings, Disputed, getAllProposals, getProposalRecord, processProposalStandings, processHistoricalStandings, };
