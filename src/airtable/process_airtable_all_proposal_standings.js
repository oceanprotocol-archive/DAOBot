global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const {getProposalsSelectQuery, updateProposalRecords} = require('./airtable_utils')

var currentRound = 8

// Let's track the state of various proposals
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

const getProjectStandings = async () => {
    let projectStandings = {}
    for (i=1; i<currentRound; i++) {
        let roundProposals = await getProposalsSelectQuery(selectionQuery = `AND({Round} = "${i}", NOT({Proposal State} = "Rejected"), "true")`)
        await Promise.all(roundProposals.map(async (proposal) => {
            try {
                let record = {
                    id: proposal.id,
                    fields: {}
                }
                let projectName = proposal.get('Project Name')
                let proposalURL = proposal.get('Proposal URL')
                let round = proposal.get('Round')
                let deliverableChecklist = proposal.get('Deliverable Checklist') || []
                let deliverables = splitDeliverableChecklist(deliverableChecklist)
                let incomplete = hasIncompleteDeliverables(deliverables)

                // Fields that will be passed to further logic
                record.fields = {
                    'Project Standing': getProjectStanding(round, incomplete),
                    'Proposal URL': proposalURL,
                    'Outstanding Proposals': ""
                }

                // Finally, track project standings
                if (projectStandings[projectName] === undefined) projectStandings[projectName] = []
                projectStandings[projectName].push(record)
            } catch (err) {
                console.log(err)
            }
        }))
    }

    return projectStandings
}

// https://coderwall.com/p/flonoa/simple-string-format-in-javascript
String.prototype.format = function() {
    a = this;
    for (k in arguments) {
        a = a.replace("{" + k + "}", arguments[k])
    }
    return a
}

const updateProposalStandings = async (projectStandings) => {
    for (const [key, value] of Object.entries(projectStandings)) {
        let outstandingURL = ""
        value.map( (proposal) => {
            if( proposal.fields['Project Standing'] === Standings.Poor ) {
                // RA: replace String.prototype.format above if required
                outstandingURL += "- {0}\n".format(proposal.fields['Proposal URL'])
                proposal.fields['Outstanding Proposals'] = outstandingURL
            } else if( proposal.fields['Project Standing'] !== Standings.Poor && outstandingURL.length > 0 ) {
                proposal.fields['Project Standing'] = Standings.Poor
                proposal.fields['Outstanding Proposals'] = outstandingURL
            }

            // we drop the Proposal URL from being sent back up to Airtable to avoid any issues
            delete proposal.fields['Proposal URL']
        })
    }
}

const main = async () => {
    let projectStandings = await getProjectStandings()
    console.log('\n======== Project Standings Found\n', JSON.stringify(projectStandings))

    await updateProposalStandings(projectStandings)
    console.log('\n======== Reported Proposal Standings\n', JSON.stringify(projectStandings))

    let rows = []
    for (const [key, value] of Object.entries(projectStandings)) {
        rows = rows.concat(value)
    }

    await updateProposalRecords(rows)
    console.log('\n[%s]\nUpdated [%s] rows to Airtable', (new Date()).toString(), Object.entries(rows).length)
}

main()
