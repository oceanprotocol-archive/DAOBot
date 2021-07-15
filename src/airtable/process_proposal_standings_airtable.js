global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsByState, updateProposalRecords} = require('./airtable_utils')

var currentRound = 8

// Let's track the state of various proposals
var allProposals = {}

const Standings = {
    Good: 'Good',
    Progress: 'In Progress',
    Poor: 'Poor'
};

const getProjectStanding = (round, incomplete) => {
    if( round === "Test" ) round = 1

    if( incomplete === false ) return Standings.Good
    else if( currentRound - round >= 3 && incomplete === true ) return Standings.Poor
    else if( currentRound - round >= 1 && incomplete === true ) return Standings.Progress
}

// Splits deliverables rich text into a list
// Drops every line that it can't find a checklist
const splitDeliverableChecklist = (deliverableChecklist) => {
    let deliverables = []
    deliverables = deliverableChecklist.split('\n')
    return deliverables.filter(function(deliverable)
    {
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

const getIncompleteProjects = async () => {
    allProposals = await getProposalsByState(
        // `OR({Proposal State} = "Funded", {Proposal State} = "Granted", "true")`,
        "{Project Name} = 'Data Union App'",
        sortQuery=[{field: 'Round',direction: 'asc' }]
    )

    let incompleteProjects = {}
    await Promise.all(allProposals.map(async (proposal) => {
        try {
            let record = {
                id: proposal.id,
                fields: {}
            }
            let projectName = proposal.get('Project Name')
            let proposalURL = proposal.get('Proposal URL')
            let round = proposal.get('Round')
            let deliverableChecklist = proposal.get('Deliverable Checklist')
            let deliverables = splitDeliverableChecklist(deliverableChecklist)
            let incomplete = hasIncompleteDeliverables(deliverables)

            // Fields that will be passed to further logic
            record.fields = {
                'Project Standing': getProjectStanding(round, incomplete),
                'Proposal URL': proposalURL,
                'Outstanding URL': ""
            }

            // Finally, track incomplete proposals
            if( incomplete === true || incompleteProjects[projectName] !== undefined ) {
                if(incompleteProjects[projectName] === undefined) incompleteProjects[projectName] = []
                incompleteProjects[projectName].push(record)
            }
        } catch (err) {
            console.log(err)
        }
    }))

    return incompleteProjects
}

// https://coderwall.com/p/flonoa/simple-string-format-in-javascript
String.prototype.format = function() {
    a = this;
    for (k in arguments) {
        a = a.replace("{" + k + "}", arguments[k])
    }
    return a
}

const updateProposalStates = async (incompleteProjects) => {
    for (const [key, value] of Object.entries(incompleteProjects)) {
        let outstandingURL = ""
        value.map( (proposal) => {
            if( proposal.fields['Project Standing'] === Standings.Poor ) {
                // RA: replace String.prototype.format above if required
                outstandingURL += "- {0}\n".format(proposal.fields['Proposal URL'])
                proposal.fields['Outstanding URL'] = outstandingURL
            } else if( proposal.fields['Project Standing'] !== Standings.Poor && outstandingURL.length > 0 ) {
                proposal.fields['Project Standing'] = Standings.Poor
                proposal.fields['Outstanding URL'] = outstandingURL
            }

            // we drop the Proposal URL from being sent back up to Airtable to avoid any issues
            delete proposal.fields['Proposal URL']
        })
    }
    return incompleteProjects
}

const main = async () => {
    let incompleteProjects = await getIncompleteProjects()
    console.log('\n======== Incomplete Projects Found\n', JSON.stringify(incompleteProjects))

    let reportedProposalStates = await updateProposalStates(incompleteProjects)
    console.log('\n======== Incomplete Projects\n', JSON.stringify(incompleteProjects))
    console.log('\n======== Reported Project & Proposal States\n', JSON.stringify(reportedProposalStates))

    let rows = []
    for (const [key, value] of Object.entries(incompleteProjects)) {
        rows = rows.concat(value)
    }

    await updateProposalRecords(rows)
    console.log('\n[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), Object.entries(rows).length)
}

main()
