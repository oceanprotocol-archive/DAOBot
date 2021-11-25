const moment = require('moment')
const fetch = require('node-fetch')
const roundRawIssues = require('../../utils/ops/repeatable_tasks.json');

const organisation = process.env.GITHUB_ORGANISATION || 'oceanprotocol';
const repo = process.env.GITHUB_REPOSITORY || 'oceandao';
const token = process.env.GITHUB_TOKEN;

async function generateRoundGithubIssues(roundNumber, roundFundingAvailable, roundProposalStartDate, roundProposalEndDate, roundVotingStartDate, roundVotingEndDate) {
    if (token === undefined) {
        console.log(`Github token missing`)
        return
    }
    try {
        let issues = loadRoundIssues(roundNumber, roundFundingAvailable, roundProposalStartDate, roundProposalEndDate, roundVotingStartDate, roundVotingEndDate)  
        issues.forEach(issue => {
        fetch(`https://api.github.com/repos/${organisation}/${repo}/issues`, {
            method: 'post',
            body: JSON.stringify(issue),
            headers: {'Content-Type': 'application/json', 'Authorization': `token ${token}`}
        })
        .then(res => res.json())
            .then(json => {
                var jsonString = JSON.stringify(json)
                var obj = JSON.parse(jsonString)
                
                if (obj.id != null) {
                    console.log(`Issue created at ${obj.url}`)
                }
                else {
                    console.log(`Something went wrong. Response: ${jsonString}`)
                }
            });
        })
    } catch(error) {
        console.log('There has been a problem with your fetch operation: ' + error.message)
    }
    console.log('-----====== Generated OPS schedule issues =======-----')
}

function loadRoundIssues(roundNumber, roundFundingAvailable, roundProposalStartDate, roundProposalEndDate, roundVotingStartDate, roundVotingEndDate) {
    let processedIssues = []
    roundRawIssues.forEach(issue => {
        let pIssue = fillIssueWithRoundParameters(issue, roundNumber, roundFundingAvailable, roundProposalStartDate, roundProposalEndDate, roundVotingStartDate, roundVotingEndDate)
        processedIssues.push(pIssue)
    })
    return processedIssues
}

function fillIssueWithRoundParameters(issue, roundNumber, roundFundingAvailable, roundProposalStartDate, roundProposalEndDate, roundVotingStartDate, roundVotingEndDate) {
    let portRoundLink = `https://port.oceanprotocol.com/c/oceandao/round-${roundNumber}`
    let processedIssue = JSON.parse(JSON.stringify(issue));
    let title = processedIssue['title']
    let body = processedIssue['body']

    let patterns = {'{{ROUND_NUMBER}}' : roundNumber.toString(), 
                    '{{ROUND_FUNDING_AVAILABLE}}' : roundFundingAvailable.toString(),
                    '{{ROUND_PORT_LINK}}' : portRoundLink,
                    '{{ROUND_PROPOSALS_START_DATE}}': roundProposalStartDate,
                    '{{ROUND_PROPOSALS_END_DATE}}' : roundProposalEndDate,
                    '{{ROUND_PROPOSALS_LAST_WEEK_DATE}}' :  moment(roundProposalEndDate).subtract(7, 'days').utc().toISOString(),
                    '{{ROUND_VOTING_START_DATE}}' : roundVotingStartDate,
                    '{{ROUND_VOTING_LAST_DAY_DATE}}' : moment(roundVotingEndDate).subtract(1, 'days').utc().toISOString(),
                    '{{ROUND_VOTING_END_DATE}}' : roundVotingEndDate}
    for ([pattern, value] of Object.entries(patterns)) {
        title = title.replaceAll(pattern, value)  
        body = body.replaceAll(pattern, value)  
    }
    processedIssue['title'] = title
    processedIssue['body'] = body
    return processedIssue
}

module.exports = {generateRoundGithubIssues};