const { getProposalsSelectQuery } = require('../airtable_utils')
const { hasEnoughOceans } = require('../../snapshot/snapshot_utils')

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
  Funded: 'Funded'
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
  let newStanding = undefined

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

const getProposalState = (proposalState, hasEnoughOceans) => {
  if (hasEnoughOceans && proposalState === State.Rejected) {
    proposalState = State.Accepted
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
  let deliverableUpdate = new Date(lastDeliverableUpdate)
  let timeOutDate = new Date(
    deliverableUpdate.setMonth(deliverableUpdate.getMonth() + 3)
  )
  return Date.now() > timeOutDate
}

// Step 1 - Get all proposal standings
const getAllRoundProposals = async (maxRound, minRound = 1) => {
  let allProposals = []
  for (i = minRound; i <= maxRound; i++) {
    let roundProposals = await getProposalsSelectQuery(
      (selectionQuery = `{Round} = "${i}"`)
    )
    allProposals = allProposals.concat(roundProposals)
  }

  return allProposals
}

const getProposalRecord = async (proposal, allProposals) => {
  let proposalURL = proposal.get('Proposal URL')
  let areOceansEnough = await hasEnoughOceans(proposal.get('Wallet Address'))
  let proposalState = getProposalState(
    proposal.get('Proposal State'),
    areOceansEnough
  )
  let currentStanding = proposal.get('Proposal Standing')
  let deliverableChecklist = proposal.get('Deliverable Checklist') || []
  let deliverableUpdate = proposal.get('Last Deliverable Update')
  let refunded =
    proposal.get('Refund Transaction') !== undefined ||
    currentStanding === Standings.Refunded
  let disputed = proposal.get('Disputed Status')
  let funded = isFunded(proposalState)
  let timedOut =
    hasTimedOut(currentStanding, deliverableUpdate) &&
    currentStanding !== Standings.Unreported
  let deliverables = splitDeliverableChecklist(deliverableChecklist)
  let completed = areDeliverablesComplete(deliverables)
  let hasCompletedProposals = projectHasCompletedProposals(
    proposal,
    allProposals
  )
  let newStanding = getProjectStanding(
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
      'Outstanding Proposals': undefined
    }
  }
}

// Returns all Proposal Standings, indexed by Project Name
const processProposalStandings = async (allProposals) => {
  let proposalStandings = {}
  for (const proposal of allProposals) {
    try {
      let projectName = proposal.get('Project Name')
      let record = await getProposalRecord(proposal, allProposals)
      // Finally, track project standings
      if (proposalStandings[projectName] === undefined)
        proposalStandings[projectName] = []
      proposalStandings[projectName].push(record)
    } catch (err) {
      console.log(err)
    }
  }
  return proposalStandings
}

// Step 2 - Resolve historical standings
const processHistoricalStandings = async (proposalStandings) => {
  for (const [key, value] of Object.entries(proposalStandings)) {
    let outstandingURL = ''
    let lastStanding = undefined
    for (const proposal of value) {
      let areOceansEnough = await hasEnoughOceans(
        proposal.fields['Wallet Address']
      )
      proposal.fields['Outstanding Proposals'] = ''
      if (proposal.fields['Proposal Standing'] === Standings.NoOcean) {
        if (areOceansEnough) {
          proposal.fields['Proposal State'] = State.Accepted
          proposal.fields['Proposal Standing'] = !projectHasCompletedProposals(
            proposal,
            proposalStandings
          )
            ? Standings.NewProject
            : Standings.Completed
        }
      }

      // DISPUTES: If a proposal is under dispute, the project standing becomes poor
      // INCOMPLETION: If a proposal is incomplete/timedout, the project standing becomes poor
      if (
        lastStanding !== Standings.Incomplete &&
        lastStanding !== Standings.Dispute
      ) {
        if (proposal.fields['Deployment Ready'] === 'Yes')
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
      proposal.fields['Proposal Standing'] === Standings.Unreported ||
      proposal.fields['Proposal Standing'] === Standings.Incomplete ||
      proposal.fields['Proposal Standing'] === Standings.Dispute
    ) {
      return ProjectStandingsStatus.Bad
    }
  }
  return ProjectStandingsStatus.Good
}

// Step 3 - Report the latest (top of stack) proposal standing
const getProjectsLatestProposal = (proposalStandings) => {
  let latestProposals = {}
  for (const [key, value] of Object.entries(proposalStandings)) {
    latestProposals[key] = value[value.length - 1]
    if (getProjectStandingStatus(value) === ProjectStandingsStatus.Bad)
      latestProposals[key].fields['Proposal State'] = State.Rejected
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
    let latestProposal = latestProposals[key]
    if (latestProposal !== undefined) {
      if (value[0].fields['Proposal Standing'] !== Standings.NoOcean) {
        value[0].fields['Proposal Standing'] =
          latestProposal.fields['Proposal Standing']
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
  projectHasCompletedProposals
}
