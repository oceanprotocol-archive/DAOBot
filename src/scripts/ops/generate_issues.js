const moment = require('moment')
const fetch = require('node-fetch')
const roundRawIssues = require('../../utils/ops/repeatable_tasks.json')
const Logger = require('../../utils/logger')
const {
  getRoundsSelectQuery,
  updateRoundRecord
} = require('../../airtable/airtable_utils')

const organisation = process.env.GITHUB_ORGANISATION || 'oceanprotocol'
const repo = process.env.GITHUB_REPOSITORY || 'oceandao'
const token = process.env.GITHUB_TOKEN
const buildType = process.env.BUILD_TYPE || 'DEV'

async function checkAndGenerateNextRoundOpsSchedule(currentRoundNumber) {
  // The function of generating the ops schedule runs only on PROD env
  if (buildType !== 'PROD') {
    return
  }
  const nextRoundNumber = parseInt(currentRoundNumber, 10) + 1
  let nextRound = await getRoundsSelectQuery(`{Round} = ${nextRoundNumber}`)

  if (nextRound !== undefined && nextRound.length > 0) {
    ;[nextRound] = nextRound
    const nextRoundNumber = nextRound.get('Round')
    const nextRoundStartDate = nextRound.get('Start Date')
    const nextRoundProposalsDueBy = moment(nextRound.get('Proposals Due By'))
      .utc()
      .toISOString()
    const nextRoundVoteStart = nextRound.get('Voting Starts')
    const nextRoundVoteEnd = nextRound.get('Voting Ends')
    const opsGenerated = nextRound.get('OPS')
    if (
      nextRoundNumber !== undefined &&
      nextRoundStartDate !== undefined &&
      nextRoundProposalsDueBy !== undefined &&
      nextRoundVoteStart !== undefined &&
      nextRoundVoteEnd !== undefined &&
      opsGenerated === undefined
    ) {
      try {
        // Generate the OPS schedule issues on github
        await generateRoundGithubIssues(
          nextRoundNumber,
          nextRoundStartDate,
          nextRoundProposalsDueBy,
          nextRoundVoteStart,
          nextRoundVoteEnd
        )
      } catch (error) {
        Logger.error(
          'There has been a problem with your fetch operation: ' + error.message
        )
      }
      // Update Airtable OPS field
      const roundUpdate = [{ id: nextRound.id, fields: { OPS: true } }]
      await updateRoundRecord(roundUpdate)
    }
  }
}

async function generateRoundGithubIssues(
  roundNumber,
  roundProposalStartDate,
  roundProposalEndDate,
  roundVotingStartDate,
  roundVotingEndDate
) {
  if (token === undefined) {
    Logger.error(`Github token missing`)
    return
  }
  const issues = loadRoundIssues(
    roundNumber,
    roundProposalStartDate,
    roundProposalEndDate,
    roundVotingStartDate,
    roundVotingEndDate
  )
  issues.forEach((issue) => {
    fetch(`https://api.github.com/repos/${organisation}/${repo}/issues`, {
      method: 'post',
      body: JSON.stringify(issue),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${token}`
      }
    })
      .then((res) => res.json())
      .then((json) => {
        var jsonString = JSON.stringify(json)
        var obj = JSON.parse(jsonString)

        if (obj.id != null) {
          Logger.log(`Issue created at ${obj.url}`)
        } else {
          Logger.error(`Something went wrong. Response: ${jsonString}`)
        }
      })
  })
  Logger.log('-----====== Generated OPS schedule issues =======-----')
}

function loadRoundIssues(
  roundNumber,
  roundProposalStartDate,
  roundProposalEndDate,
  roundVotingStartDate,
  roundVotingEndDate
) {
  const processedIssues = []
  roundRawIssues.forEach((issue) => {
    const pIssue = fillIssueWithRoundParameters(
      issue,
      roundNumber,
      roundProposalStartDate,
      roundProposalEndDate,
      roundVotingStartDate,
      roundVotingEndDate
    )
    processedIssues.push(pIssue)
  })
  return processedIssues
}

function fillIssueWithRoundParameters(
  issue,
  roundNumber,
  roundProposalStartDate,
  roundProposalEndDate,
  roundVotingStartDate,
  roundVotingEndDate
) {
  const portRoundLink = `https://port.oceanprotocol.com/c/oceandao/round-${roundNumber}`
  const processedIssue = JSON.parse(JSON.stringify(issue))
  let { title } = processedIssue
  let { body } = processedIssue

  const patterns = {
    '{{ROUND_NUMBER}}': roundNumber.toString(),
    '{{ROUND_PORT_LINK}}': portRoundLink,
    '{{ROUND_PROPOSALS_START_DATE}}': roundProposalStartDate,
    '{{ROUND_PROPOSALS_END_DATE}}': roundProposalEndDate,
    '{{ROUND_PROPOSALS_LAST_WEEK_DATE}}': moment(roundProposalEndDate)
      .subtract(7, 'days')
      .utc()
      .toISOString(),
    '{{ROUND_VOTING_START_DATE}}': roundVotingStartDate,
    '{{ROUND_VOTING_LAST_DAY_DATE}}': moment(roundVotingEndDate)
      .subtract(1, 'days')
      .utc()
      .toISOString(),
    '{{ROUND_VOTING_END_DATE}}': roundVotingEndDate
  }
  for (const [pattern, value] of Object.entries(patterns)) {
    title = replaceAll(title, pattern, value)
    body = replaceAll(body, pattern, value)
  }
  processedIssue.title = title
  processedIssue.body = body
  return processedIssue
}

function replaceAll(str, match, replacement) {
  return str.replace(new RegExp(match, 'g'), () => replacement)
}

module.exports = { checkAndGenerateNextRoundOpsSchedule }
