const { getProposalsSelectQuery } = require('../airtable_utils')
const { hasEnoughOceans } = require('../../snapshot/snapshot_utils')
const Logger = require('../../utils/logger')
const { levels } = require('../project_summary')
const { verifyEmail } = require('../../functions/utils')

// Proposal States
const State = {
  Undefined: undefined,
  Received: 'Received',
  Rejected: 'Rejected',
  Accepted: 'Accepted',
  Running: 'Running',
  Ended: 'Ended',
  NotGranted: 'Not Granted',
  DownVoted: 'Down Voted',
  Granted: 'Granted',
  Funded: 'Funded',
  Withdrawn: 'Withdrawn'
}

// Project Standings
const Standings = {
  Undefined: undefined,
  NewProject: 'New Project',
  NoOcean: 'No Ocean',
  Unreported: 'Unreported',
  Completed: 'Completed',
  Progress: 'In Progress',
  Dispute: 'In Dispute',
  Incomplete: 'Incomplete & Inactive',
  Refunded: 'Funds Returned'
}

const Disputed = {
  Undefined: undefined,
  Ongoing: 'Ongoing',
  Resolved: 'Resolved'
}

const ProjectStandingsStatus = {
  Good: 'Good',
  Bad: 'Bad'
}

// Project standing has a basic set of rules/priorities.
// TODO - Reimplement in https://xstate.js.org/docs/ if gets more complex
const getProjectStanding = (
  proposalState,
  deliverableChecklist,
  completed,
  timedOut,
  refunded,
  funded,
  areOceansEnough,
  hasCompletedProposal
) => {
  let newStanding

  if (
    (proposalState === State.Received || proposalState === State.Rejected) &&
    areOceansEnough === false
  )
    newStanding = Standings.NoOcean
  else if (funded === false && !hasCompletedProposal)
    newStanding = Standings.NewProject
  else if (refunded === true) newStanding = Standings.Refunded
  else if (completed === false && timedOut === true)
    newStanding = Standings.Incomplete
  else if (deliverableChecklist.length > 0)
    newStanding = completed === true ? Standings.Completed : Standings.Progress
  else newStanding = Standings.Unreported

  return newStanding
}

const getProposalState = (
  proposalState,
  hasEnoughOceans,
  ethTransactionExists = false
) => {
  // TODO find a better logic for this
  if (
    hasEnoughOceans &&
    (proposalState === State.Rejected || proposalState === State.Undefined)
  ) {
    proposalState = State.Accepted
  } else if (proposalState === State.Undefined) {
    proposalState = State.Rejected
  }

  if (
    (proposalState === State.Accepted || proposalState === State.Granted) &&
    ethTransactionExists
  ) {
    proposalState = State.Funded
  }

  return proposalState
}

// Splits deliverables rich text into a list
// Drops every line that it can't find a checklist
const splitDeliverableChecklist = (deliverableChecklist) => {
  let deliverables = []

  if (deliverableChecklist.length === 0) return deliverables

  deliverables = deliverableChecklist.split('\n')
  return deliverables.filter(function (deliverable) {
    return (
      deliverable.indexOf('[]') === 0 ||
      deliverable.indexOf('[ ]') === 0 ||
      deliverable.indexOf('[x]') === 0
    )
  })
}

const areDeliverablesComplete = (deliverables) => {
  let completed = true

  if (deliverables.length === 0) completed = false
  else {
    deliverables.map((deliverable) => {
      if (deliverable.indexOf('[x]') !== 0) completed = false
    })
  }

  return completed
}

const isFunded = (proposalState) => {
  return proposalState === State.Granted || proposalState === State.Funded
}

const hasTimedOut = (currentStanding, lastDeliverableUpdate) => {
  const deliverableUpdate = new Date(lastDeliverableUpdate)
  const timeOutDate = new Date(
    deliverableUpdate.setMonth(deliverableUpdate.getMonth() + 3)
  )
  return Date.now() > timeOutDate
}

// Step 1 - Get all proposal standings
const getAllRoundProposals = async (maxRound, minRound = 1) => {
  let allProposals = []
  for (let i = minRound; i <= maxRound; i++) {
    const roundProposals = await getProposalsSelectQuery(`{Round} = "${i}"`)
    allProposals = allProposals.concat(roundProposals)
  }

  return allProposals
}

const validateProposal = (proposal, level) => {
  if (proposal.get('Round') < 13) return true
  const isn = (x) => x == null || x === ''
  if (proposal.get('USD Requested') > level.ceiling)
    return 'Invalid USD Requested'

  if (isn(proposal.get('One Liner'))) return 'Missing One Liner'
  if (isn(proposal.get('Proposal URL'))) return 'Missing Proposal URL'
  if (isn(proposal.get('Grant Deliverables')))
    return 'Missing Grant Deliverables'
  // if (isn(proposal.get('Voting Starts'))) return 'Missing Voting Starts'
  // if (isn(proposal.get('Voting Ends'))) return 'Missing Voting Ends'
  // if (isn(proposal.get('Snapshot Block'))) return 'Missing Snapshot Block'
  if (isn(proposal.get('Project Lead Full Name')))
    return 'Missing Project Lead Full Name'
  if (isn(proposal.get('Country of Recipient')))
    return 'Missing Country of Recipient'

  if (isn(proposal.get('Project Email Address'))) return 'Missing Login Email'
  if (verifyEmail(proposal.get('Project Email Address')) === false)
    return 'Invalid Login Email'

  return true
}

const getProposalRecord = async (proposal, allProposals) => {
  const completedProposals = allProposals.filter(
    (x) =>
      x.get('Proposal Standing') === Standings.Completed &&
      x.get('Project Name') === proposal.get('Project Name')
  ).length
  const level = levels(completedProposals)
  const proposalURL = proposal.get('Proposal URL')
  const areOceansEnough = await hasEnoughOceans(proposal.get('Wallet Address'))
  const ethTransactionExists =
    proposal.get('ETH Transaction') !== undefined &&
    proposal.get('ETH Transaction') !== null &&
    proposal.get('ETH Transaction') !== ''
  let proposalState = getProposalState(
    proposal.get('Proposal State'),
    areOceansEnough,
    ethTransactionExists
  )
  const validProposal = validateProposal(proposal, level)
  if (validProposal !== true) proposalState = State.Rejected // Set the proposal state to rejected if the proposal is not valid

  const currentStanding = proposal.get('Proposal Standing')
  const deliverableChecklist = proposal.get('Deliverable Checklist') || []
  const deliverableUpdate = proposal.get('Last Deliverable Update')
  const refunded =
    proposal.get('Refund Transaction') !== undefined ||
    currentStanding === Standings.Refunded
  const disputed = proposal.get('Disputed Status')
  const funded = isFunded(proposalState)
  const timedOut =
    hasTimedOut(currentStanding, deliverableUpdate) &&
    currentStanding !== Standings.Unreported
  const deliverables = splitDeliverableChecklist(deliverableChecklist)
  const completed = areDeliverablesComplete(deliverables)
  const hasCompletedProposals = projectHasCompletedProposals(
    proposal,
    allProposals
  )
  const newStanding = getProjectStanding(
    proposalState,
    deliverables,
    completed,
    timedOut,
    refunded,
    funded,
    areOceansEnough,
    hasCompletedProposals
  )

  return {
    id: proposal.id,
    fields: {
      'Proposal URL': proposalURL,
      'Proposal State': proposalState,
      'Proposal Standing': newStanding,
      'Disputed Status': disputed,
      'Outstanding Proposals': undefined,
      'Reason Rejected': validProposal === true ? undefined : validProposal
    }
  }
}

// Returns all Proposal Standings, indexed by Project Name
const processProposalStandings = async (
  allProposals,
  previousProposals = []
) => {
  const proposalStandings = {}
  for (const proposal of allProposals) {
    try {
      const projectName = proposal.get('Project Name')
      const record = await getProposalRecord(
        proposal,
        allProposals.concat(previousProposals)
      )
      // Finally, track project standings
      if (proposalStandings[projectName] === undefined)
        proposalStandings[projectName] = []
      proposalStandings[projectName].push(record)
    } catch (err) {
      Logger.error(err)
    }
  }
  return proposalStandings
}

// Step 2 - Resolve historical standings
const processHistoricalStandings = async (proposalStandings) => {
  for (const [, value] of Object.entries(proposalStandings)) {
    let outstandingURL = ''
    let lastStanding
    for (const proposal of value) {
      proposal.fields['Outstanding Proposals'] = ''

      // DISPUTES: If a proposal is under dispute, the project standing becomes poor
      // INCOMPLETION: If a proposal is incomplete/timedout, the project standing becomes poor
      if (
        lastStanding !== Standings.Incomplete &&
        lastStanding !== Standings.Dispute
      ) {
        if (
          proposal.fields['Deployment Ready'] === 'Yes' &&
          proposal.fields['Proposal Standing'] !== Standings.Completed
        )
          proposal.fields['Proposal Standing'] = Standings.Progress
        if (proposal.fields['Proposal Standing'] === Standings.Incomplete)
          lastStanding = Standings.Incomplete
        else if (proposal.fields['Disputed Status'] === Disputed.Ongoing)
          lastStanding = Standings.Dispute
        else if (proposal.fields['Proposal Standing'] !== null)
          lastStanding = proposal.fields['Proposal Standing']
      }

      // OUTSTANDING PROPOSAL URLS:
      // Collect the URL of proposals that are in poor condition.
      // Report the URL of all proposals that are in poor condition.
      if (
        proposal.fields['Proposal Standing'] === Standings.Incomplete ||
        proposal.fields['Disputed Status'] === Disputed.Ongoing
      ) {
        outstandingURL += '- ' + proposal.fields['Proposal URL'] + '\n'
        proposal.fields['Outstanding Proposals'] = outstandingURL
        proposal.fields['Proposal Standing'] = lastStanding
      } else if (
        proposal.fields['Proposal Standing'] !== Standings.Incomplete &&
        proposal.fields['Disputed Status'] !== Disputed.Ongoing &&
        outstandingURL.length > 0
      ) {
        proposal.fields['Outstanding Proposals'] = outstandingURL
        proposal.fields['Proposal Standing'] = lastStanding
      } else if (proposal.fields['Proposal Standing'] === null) {
        proposal.fields['Proposal Standing'] = lastStanding
      }
    }
  }
}

const getProjectStandingStatus = (proposalStandings) => {
  for (const proposal of proposalStandings) {
    if (
      isFunded(proposal.fields['Proposal State']) &&
      (proposal.fields['Proposal Standing'] === Standings.Unreported ||
        proposal.fields['Proposal Standing'] === Standings.Incomplete ||
        proposal.fields['Proposal Standing'] === Standings.Dispute)
    ) {
      return ProjectStandingsStatus.Bad
    }
  }
  return ProjectStandingsStatus.Good
}

// Step 3 - Report the latest (top of stack) proposal standing
const getProjectsLatestProposal = (proposalStandings) => {
  const latestProposals = {}
  for (const [key, value] of Object.entries(proposalStandings)) {
    latestProposals[key] = value[value.length - 1]
    if (getProjectStandingStatus(value) === ProjectStandingsStatus.Bad)
      latestProposals[key].fields['Bad Status'] = true
  }

  return latestProposals
}

const projectHasCompletedProposals = (proposal, allProposals) => {
  let completedProposals = 0
  allProposals.forEach((currentProposal) => {
    if (
      currentProposal.fields['Project Name'] ===
        proposal.fields['Project Name'] &&
      currentProposal.fields['Proposal Standing'] === Standings.Completed
    ) {
      completedProposals += 1
    }
  })
  return completedProposals !== 0
}

// Update the Current Round's proposal records, to reflect the overall Project Standing.
const updateCurrentRoundStandings = (
  currentRoundProposals,
  latestProposals
) => {
  for (const [key, value] of Object.entries(currentRoundProposals)) {
    const latestProposal = latestProposals[key]
    if (latestProposal !== undefined) {
      if (latestProposal.fields['Bad Status'] === true) {
        value[0].fields['Proposal Standing'] =
          latestProposal.fields['Proposal Standing']
        value[0].fields['Proposal State'] = State.Rejected
        value[0].fields['Outstanding Proposals'] =
          latestProposal.fields['Outstanding Proposals']
      }
    }
  }
}

module.exports = {
  State,
  Standings,
  Disputed,
  getAllRoundProposals,
  getProposalRecord,
  processProposalStandings,
  processHistoricalStandings,
  getProjectsLatestProposal,
  updateCurrentRoundStandings,
  projectHasCompletedProposals,
  getProposalState
}
