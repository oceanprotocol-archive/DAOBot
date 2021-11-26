/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()

const should = require('chai').should()
const { expect } = require('chai')

const moment = require('moment')
const {
  getRoundsSelectQuery,
  getProposalsSelectQuery
} = require('../../airtable/airtable_utils')
const { getCurrentRound } = require('../../airtable/rounds/funding_rounds')
const {
  processAirtableNewProposals
} = require('../../airtable/process_airtable_new_proposals')
const {
  prepareProposalsForSnapshot
} = require('../../snapshot/prepare_snapshot_received_proposals_airtable')
const {
  submitProposalsToSnaphotGranular
} = require('../../snapshot/submit_snapshot_accepted_proposals_airtable')
const { sleep } = require('../../functions/utils')

// To run these tests, you should setup the DB beforehand
// Requirement:
// - 1 funding round where the "Start Date" < now < "Voting Ends"
// - 1 proposal in DB w/o "Round" or "Proposal State" params
// 1. In DB - Delete a proposal "Round" + "Propoal State" params.
describe('Functionally test updateFundingRound', function () {
  it('Validates moment + 15m', async function () {
    const round = await getRoundsSelectQuery(`{Round} = "1"`)
    const roundDueBy = moment(round[0].fields['Proposals Due By'])
    const roundDueBy_plus15 = moment(round[0].fields['Proposals Due By']).add(
      15,
      'minutes'
    )

    should.equal(roundDueBy.utc().toISOString(), '2020-12-14T23:59:00.000Z')
    should.equal(
      roundDueBy_plus15.utc().toISOString(),
      '2020-12-15T00:14:00.000Z'
    )
  })

  it('Validates basis currency chosen', async function () {
    const currentRound = await getCurrentRound()
    if (currentRound !== undefined) {
      const basisCurrency = currentRound.get('Basis Currency')
      should.not.equal(basisCurrency, undefined)
    }
  })

  it.skip('Validates proposals that are not been initialized.', async function () {
    const inactiveProposals = await getProposalsSelectQuery(
      `AND({Round} = "", {Proposal State} = "", "true")`
    )
    expect(inactiveProposals.length).to.be.greaterThan(0)
  })

  it.skip('Initializes proposals for this round.', async function () {
    let inactiveProposals = await getProposalsSelectQuery(
      `AND({Round} = "", {Proposal State} = "", "true")`
    )

    if (inactiveProposals.length > 0) {
      const currentRound = await getCurrentRound()
      if (currentRound !== undefined) {
        const curRoundNumber = currentRound.get('Round')
        await processAirtableNewProposals(curRoundNumber)

        await sleep(500)
        inactiveProposals = await getProposalsSelectQuery(
          `AND({Round} = "", {Proposal State} = "", "true")`
        )
        should.equal(inactiveProposals.length, 0)
      }
    }
  }) // .timeout(5000);

  it('Processes proposals for snapshot.', async function () {
    const currentRound = await getCurrentRound()
    if (currentRound !== undefined) {
      await prepareProposalsForSnapshot(currentRound)
      if(currentRound.get('Round State') !== 'Voting') return

      await sleep(500)
      const curRoundNumber = currentRound.get('Round')
      const acceptedProposals = await getProposalsSelectQuery(
        `AND({Round} = "${curRoundNumber}", {Proposal State} = "Accepted", "true")`
      )
      expect(acceptedProposals.length).to.be.greaterThan(0)
    }
  }) // .timeout(5000);

  it.skip('Deploys proposals to snapshot into multiple ballots.', async function () {
    const currentRound = await getCurrentRound()
    if (currentRound !== undefined) {
      // Submit to snapshot + Enter voting state
      const curRoundNumber = currentRound.get('Round')
      await submitProposalsToSnaphotGranular(curRoundNumber)

      await sleep(500)
      const acceptedProposals = await getProposalsSelectQuery(
        `AND({Round} = "${curRoundNumber}", {Proposal State} = "Running", "true")`
      )
      expect(acceptedProposals.length).to.be.greaterThan(0)
    }
  }) // .timeout(90000);
})
