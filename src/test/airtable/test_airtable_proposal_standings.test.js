global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const should = require('chai').should()
const { expect } = require('chai')
const {
  State,
  Standings,
  Disputed,
  getProposalRecord,
  getProjectsLatestProposal,
  processProposalStandings,
  processHistoricalStandings,
  updateCurrentRoundStandings
} = require('../../airtable/proposals/proposal_standings')
const {
  WALLET_ADDRESS_WITH_ENOUGH_OCEANS,
  WALLET_ADDRESS_WITH_NOT_ENOUGH_OCEANS
} = require('../config')

var currentProposals
var allProposals = []

beforeEach(async function () {
  currentProposals = [
    {
      id: 'proposal_5',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': undefined,
        'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'May 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_1_new_existing_entrant',
      fields: {
        'Project Name': 'New Existing Entrant',
        'Proposal URL': 'www.new-existing-entrant.com',
        'Proposal State': undefined,
        'Proposal Standing': undefined,
        'Deliverable Checklist': undefined,
        'Last Deliverable Update': undefined,
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_1_new_entrant',
      fields: {
        'Project Name': 'New Entrant',
        'Proposal URL': 'www.new-entrant.com',
        'Proposal State': undefined,
        'Proposal Standing': undefined,
        'Deliverable Checklist': undefined,
        'Last Deliverable Update': undefined,
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    }
  ]

  allProposals = [
    {
      id: 'proposal_1',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': undefined,
        'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Jan 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_2',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': undefined,
        'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Feb 01, 2021',
        'Refund Transaction': '0xRefundTx',
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_3',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': undefined,
        'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Mar 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_4',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Rejected,
        'Proposal Standing': Standings.NoOcean,
        'Deliverable Checklist': '[] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Mar 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_NOT_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_5',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': Standings.Completed,
        'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Jan 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_6',
      fields: {
        'Project Name': 'test',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': Standings.Unreported,
        'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Apr 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_7',
      fields: {
        'Project Name': 'test_5',
        'Proposal URL': 'www.testurl.com',
        'Proposal State': State.Funded,
        'Proposal Standing': Standings.Unreported,
        'Deliverable Checklist': undefined,
        'Last Deliverable Update': 'Apr 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    },
    {
      id: 'proposal_8',
      fields: {
        'Project Name': 'test_5',
        'Proposal URL': 'www.testurl_8.com',
        'Proposal State': State.Undefined,
        'Proposal Standing': Standings.Undefined,
        'Deliverable Checklist': '[x] D1\n[x] D2\n[x] D3',
        'Last Deliverable Update': 'Apr 01, 2021',
        'Refund Transaction': undefined,
        'Disputed Status': undefined,
        'Deployment Ready': 'Yes',
        'Wallet Address': WALLET_ADDRESS_WITH_ENOUGH_OCEANS
      },
      get: function (key) {
        return this.fields[key]
      }
    }
  ]
})

describe('Calculating Proposal Standings', function () {
  it('Validates all initial proposal standings', async function () {
    let record = await getProposalRecord(allProposals[0], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Incomplete)

    record = await getProposalRecord(allProposals[1], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Refunded)

    record = await getProposalRecord(allProposals[2], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Incomplete)

    record = await getProposalRecord(allProposals[3], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.NoOcean)
  })

  it('Validates Incomplete becomes Complete', async function () {
    let record = await getProposalRecord(allProposals[0], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Incomplete)

    allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    record = await getProposalRecord(allProposals[0], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Completed)
  })

  it('Validates Refunded proposals remains Refunded', async function () {
    let record = await getProposalRecord(allProposals[1], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Refunded)

    allProposals[1].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    record = await getProposalRecord(allProposals[1], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Refunded)
  })

  it('Validates Incomplete proposals become Completed', async function () {
    let record = await getProposalRecord(allProposals[2], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Incomplete)

    allProposals[2].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    record = await getProposalRecord(allProposals[2], allProposals)
    should.equal(record.fields['Proposal Standing'], Standings.Completed)
  })
})

describe('Process Project Standings', function () {
  it('All proposalStandings are Completed or Refunded', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })

    // Process proposals and historical standings
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Verify every proposal in history is completed or refunded
    const projectName = allProposals[0].get('Project Name')
    proposalStandings[projectName].forEach((x) => {
      expect(x.fields['Proposal Standing']).to.be.oneOf([
        Standings.Completed,
        Standings.Refunded,
        Standings.NoOcean
      ])
    })

    // expect last elements Proposal Standing to be `Standings.Completed`
    expect(
      proposalStandings[projectName].find((x) => x.id === 'proposal_6').fields[
        'Proposal Standing'
      ]
    ).to.equal(Standings.Completed)
  })

  it('If proposalStanding is Incomplete then remainder of projectStanding is Incomplete', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Validate that all proposals are Incomplete
    const projectName = allProposals[0].get('Project Name')
    proposalStandings[projectName].forEach((x) => {
      should.equal(x.fields['Proposal Standing'], Standings.Incomplete)
    })
  })

  it('Validate [latestProposal] is head of indexed proposals ', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Validate that all proposals are Incomplete
    const projectName = allProposals[0].get('Project Name')
    proposalStandings[projectName].forEach((x) => {
      should.equal(x.fields['Proposal Standing'], Standings.Incomplete)
    })

    // Step 3 - Report the latest (top of stack) proposal standing
    // Retrieve the last proposals from projectStandings
    const latestProposals = getProjectsLatestProposal(proposalStandings)

    let lastProjectId = allProposals
      .filter((x) => x.get('Project Name') === projectName)
      .slice(-1)[0].id
    should.equal(latestProposals[projectName].id, lastProjectId)
  })

  it('Validate [currentProposalStanding] maps to head of indexed proposals', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Step 3 - Report the latest (top of stack) proposal standing from each project
    // latestProposal should equal head of each project
    const latestProposals = getProjectsLatestProposal(proposalStandings)

    for (let [projectName, value] of Object.entries(latestProposals)) {
      let lastProjectId = allProposals
        .filter((x) => x.get('Project Name') === projectName)
        .slice(-1)[0].id
      should.equal(value.id, lastProjectId)
    }

    const currentProposalStandings = await processProposalStandings(
      currentProposals
    )
    updateCurrentRoundStandings(currentProposalStandings, latestProposals)
    should.equal(
      currentProposalStandings.test[0].fields['Proposal Standing'],
      latestProposals.test.fields['Proposal Standing']
    )
    should.equal(
      currentProposalStandings.test[0].fields['Proposal Standing'],
      Standings.Incomplete
    )
  })

  it('Validate [currentProposalStanding] New Entrants, and Unmatched have standing=New Project', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Deliverable Checklist'] = '[] D1\n[x] D2\n[x] D3'

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Step 3 - Report the latest (top of stack) proposal standing from each project
    // latestProposal should equal head of each project
    const latestProposals = getProjectsLatestProposal(proposalStandings)
    for (let [projectName, value] of Object.entries(latestProposals)) {
      console.log(projectName, value, latestProposals)
      let lastProjectId = allProposals
        .filter((x) => x.get('Project Name') === projectName)
        .slice(-1)[0].id
      should.equal(value.id, lastProjectId)
    }

    const currentProposalStandings = await processProposalStandings(
      currentProposals
    )
    updateCurrentRoundStandings(currentProposalStandings, latestProposals)
    should.equal(
      currentProposalStandings.test[0].fields['Proposal Standing'],
      latestProposals.test.fields['Proposal Standing']
    )
    should.equal(
      currentProposalStandings.test[0].fields['Proposal Standing'],
      Standings.Incomplete
    )

    should.equal(
      currentProposalStandings['New Existing Entrant'][0].fields[
        'Proposal Standing'
      ],
      Standings.NewProject
    )
    should.equal(
      currentProposalStandings['New Existing Entrant'][0].fields[
        'Proposal State'
      ],
      State.Accepted
    )
    should.equal(
      currentProposalStandings['New Entrant'][0].fields['Proposal Standing'],
      Standings.NewProject
    )
    should.equal(
      currentProposalStandings['New Entrant'][0].fields['Proposal State'],
      State.Accepted
    )
  })

  it('Validates [Bad Project State] is cleaned up', async function () {
    // Initialize Proposal[1] to not be refunded
    // Process all proposals
    allProposals[1].fields['Refund Transaction'] = undefined

    let proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Validate proposals are incomplete and bad URLs are reporting properly
    should.equal(
      proposalStandings.test[0].fields['Proposal Standing'],
      Standings.Incomplete
    )
    should.equal(
      proposalStandings.test[1].fields['Proposal Standing'],
      Standings.Incomplete
    )

    let badUrl0 = proposalStandings.test[0].fields['Outstanding Proposals']
    let badUrl1 = proposalStandings.test[1].fields['Outstanding Proposals']
    let badUrl0Count = badUrl0.split('\n')
    let badUrl1Count = badUrl1.split('\n')
    should.equal(badUrl0Count.length, 2)
    should.equal(badUrl1Count.length, 2)

    // Update initial proposal to be completed
    allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

    // Process standings again
    proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Validate first proposal is completed, and [Oustanding URLs] is correct.
    should.equal(
      proposalStandings.test[0].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[1].fields['Proposal Standing'],
      Standings.Completed
    )

    badUrl0 = proposalStandings.test[0].fields['Outstanding Proposals']
    badUrl1 = proposalStandings.test[1].fields['Outstanding Proposals']
    badUrl0Count = badUrl0.split('\n')
    should.equal(badUrl0Count.length, 1)

    badUrl1Count = badUrl1.split('\n')
    should.equal(badUrl1Count.length, 1)
  })

  it('Validates [Ongoing Disputed Proposals] are a bad state. Not Eligible for grants.', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Disputed Status'] = Disputed.Ongoing

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    for (let i = 1; i < proposalStandings.length; i++) {
      should.equal(
        proposalStandings.test[i].fields['Proposal Standing'],
        Standings.Dispute
      )
    }
  })

  it('Validates [Completed Disputes] is a good state.', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })
    // Set the very first proposal to not be completed
    allProposals[0].fields['Disputed Status'] = Disputed.Resolved

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    for (let i = 1; i < proposalStandings.length; i++) {
      should.equal(
        proposalStandings.test[i].fields['Proposal Standing'],
        Standings.Completed
      )
    }
  })

  it('Validates projects not funded, receive New Project.', async function () {
    // Set the very first proposal to not be completed
    allProposals[1].fields['Proposal State'] = State.NotGranted
    allProposals[1].fields['Project Name'] = 'test1'

    allProposals[5].fields['Proposal State'] = State.NotGranted
    allProposals[5].fields['Project Name'] = 'test2'

    // Zero every completion
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = undefined
    })

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    should.equal(
      proposalStandings.test1[0].fields['Proposal Standing'],
      Standings.NewProject
    )
    should.equal(
      proposalStandings.test2[0].fields['Proposal Standing'],
      Standings.NewProject
    )
  })

  it('Validates downvoted/declined projects without standing receive previous standings.', async function () {
    // Set the very first proposal to not be completed
    allProposals[0].fields['Proposal State'] = State.Funded
    allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

    allProposals[1].fields['Proposal State'] = State.Funded
    allProposals[1].fields['Refund Transaction'] = undefined
    allProposals[1].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

    allProposals[2].fields['Proposal State'] = State.Funded
    allProposals[2].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'

    allProposals[3].fields['Proposal State'] = State.DownVoted
    allProposals[3].fields['Deliverable Checklist'] = undefined

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    should.equal(
      proposalStandings.test[0].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[1].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[2].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[3].fields['Proposal Standing'],
      Standings.Incomplete
    )
  })

  it('Validates State.Received proposals report Standing.NoOcean.', async function () {
    // Complete every proposal
    allProposals.forEach((x) => {
      x.fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    })

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    // Step 3 - Report the latest (top of stack) proposal standing from each project
    // latestProposal should equal head of each project
    const latestProposals = getProjectsLatestProposal(proposalStandings)

    currentProposals[0].fields['Proposal State'] = State.Rejected
    currentProposals[0].fields['Wallet Address'] =
      WALLET_ADDRESS_WITH_NOT_ENOUGH_OCEANS

    const currentProposalStandings = await processProposalStandings(
      currentProposals
    )
    updateCurrentRoundStandings(currentProposalStandings, latestProposals)

    should.equal(
      currentProposalStandings.test[0].fields['Proposal Standing'],
      Standings.NoOcean
    )
  })

  it('Validate "No Ocean" property of "Proposal Standings" reported correctly', async function () {
    // Set the very first proposal to not be completed
    allProposals[0].fields['Proposal Standings'] = Standings.NoOcean
    allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    allProposals[0].fields['Proposal State'] = State.Rejected
    allProposals[0].fields['Wallet Address'] = WALLET_ADDRESS_WITH_ENOUGH_OCEANS
    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)

    should.equal(
      proposalStandings.test[0].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[0].fields['Proposal State'],
      State.Accepted
    )
  })

  it('Validate all project proposal standings are in a good standing state', async function () {
    //  Set the first proposal to be 'Unreported'
    allProposals[0].fields['Proposal Standing'] = Standings.Unreported
    allProposals[0].fields['Last Deliverable Update'] = 'May 01, 2021'

    //  Set the third proposal to be 'Incomplete'
    allProposals[2].fields['Proposal Standing'] = Standings.Incomplete

    // Process all proposals
    const proposalStandings = await processProposalStandings(allProposals)
    await processHistoricalStandings(proposalStandings)
    const latestProposal = getProjectsLatestProposal(proposalStandings)

    should.equal(latestProposal.test.fields['Bad Status'], true)
  })

  it('Validate "No Ocean" property of "Proposal Standings" does not propagate to next round', async function () {
    // Process all proposals
    allProposals[0].fields.Earmarks = 'New Entrants'
    allProposals[0].fields['Deliverable Checklist'] = '[x] D1\n[x] D2\n[x] D3'
    allProposals[0].fields['Proposal State'] = State.Rejected
    allProposals[0].fields['Proposal Standing'] = Standings.NoOcean
    allProposals[0].fields['Wallet Address'] = WALLET_ADDRESS_WITH_ENOUGH_OCEANS

    allProposals[2].fields.Earmarks = 'New Entrants'
    allProposals[2].fields['Deliverable Checklist'] = ''
    allProposals[2].fields['Proposal State'] = State.Rejected
    allProposals[2].fields['Proposal Standing'] = Standings.NoOcean
    allProposals[2].fields['Wallet Address'] = WALLET_ADDRESS_WITH_ENOUGH_OCEANS

    const proposalStandings = await processProposalStandings(allProposals)

    await processHistoricalStandings(proposalStandings)

    should.equal(
      proposalStandings.test[0].fields['Proposal Standing'],
      Standings.Completed
    )
    should.equal(
      proposalStandings.test[2].fields['Proposal Standing'],
      Standings.Incomplete
    )
  })
})
