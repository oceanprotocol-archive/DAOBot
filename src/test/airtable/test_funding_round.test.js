/* eslint-env mocha */

global.fetch = require('cross-fetch')
const dotenv = require('dotenv')
dotenv.config()
const should = require('chai').should()

const {
  RoundState,
  getCurrentRound,
} = require('../../airtable/rounds/funding_rounds')

const {
  deleteProposalRecords,
  getProposals,
  getTableFields,
  addRecordsToAirtable,
  updateRoundRecord
} = require('../../airtable/airtable_utils')
const main = require('../../scripts/update_funding_round')
const {
  syncAirtableActiveProposalVotes
} = require('../../airtable/sync_airtable_active_proposal_votes_snapshot')
const {
  processFundingRoundComplete
} = require('../../airtable/process_airtable_funding_round_complete')
const { BallotType } = require('../../snapshot/snapshot_utils')
const { expect } = require('chai')

function addDaysToDate(days){
  var res = new Date();
  res.setDate(res.getDate() + days);
  console.log(res.toISOString())
  return res.toISOString();
}

function subtractsDaysFromDate(days){
  var res = new Date();
  res.setDate(res.getDate() - days);
  console.log(res.toISOString())
  return res.toISOString();
}

const newProposals = [
  {
    "fields": {
      "Project Name": "Decentralized File Rating",
      "Round": "1",
      "Voting Ends": "2021-12-21T23:59:00.000Z",
      "Proposal State": "Accepted",
      "Vote URL": "https://vote.oceanprotocol.com/#/officialoceandao.eth/proposal/QmPLfq9J2Mr4FDAWpYaBq2veYJpiKVgU6JkXYUvV8qa2FC",
      "Fundamental Metric": "Market Monthly Revenue",
      "Wallet Address": "0x31A7f70b8812daEf0A6C7F19575DB09f726F0DD1",
      "Voting Starts": "2020-12-15T11:00:00.000Z",
      "Proposal URL": "https://port.oceanprotocol.com/t/proposal-dfr-decentralized-file-rating-by-oceancap/313",
      "Grant Category": "Build & Integrate",
      "One Liner": " Oceancap is aiming towards a decentralized file rating mechanism on the official Ocean Market.",
      "OCEAN Granted": 13000,
      "Voted Yes": 116244.4532456375,
      "Voted No": 0,
      "Snapshot Batch Index": 7,
      "Snapshot Block": 11457494,
      "Grant Timeline": 3,
      "Grant Deliverables": "- blog posts will be published at: [https://medium.com/@oceancap.service 3](https://medium.com/@oceancap.service)\n- DFR will be integrated into the Oc...",
      "ipfsHash": "QmPLfq9J2Mr4FDAWpYaBq2veYJpiKVgU6JkXYUvV8qa2FC",
      "Overview": "With our DFR solution we are aiming towards a mechanism where users are able to give a file rating after they have bought it. Later on we are integrat...",
      "Payment Wallets": "0x31A7f70b8812daEf0A6C7F19575DB09f726F0DD1",
      "Login Email": [
        "recHra3jlFwwg66Lp"
      ],
      "Project Subtitle": "Decentralized File Rating",
      "Earmarks": "General",
      "Proposal Standing": "New Project",
      "Outstanding Proposals": "\n",
      "UUID": "0bdb7de9-64a6-40ab-a519-c1dffb372fe5",
      "Basis Currency": "USD",
      "Reason Rejected": " "
    }
  },
  {
    "fields": {
      "Project Name": "Ocean Pool Alerts",
      "Round": "1",
      "Voting Ends": "2021-12-21T23:59:00.000Z",
      "Proposal State": "Rejected",
      "Vote URL": "https://vote.oceanprotocol.com/#/officialoceandao.eth/proposal/QmPLfq9J2Mr4FDAWpYaBq2veYJpiKVgU6JkXYUvV8qa2FC",
      "Fundamental Metric": "TVL",
      "Wallet Address": "0x5281aD053cC8906d08E9520318A76db767CEeB4b",
      "Voting Starts": "2020-12-15T11:00:00.000Z",
      "Proposal URL": "https://port.oceanprotocol.com/t/proposal-ocean-pool-alerts/314",
      "Grant Category": "Build & Integrate",
      "One Liner": "I want to build a solution to notify the Ocean community of important alerts Ocean data pools while creating equal staking opportunity for all Ocean c...",
      "OCEAN Granted": 13000,
      "Voted Yes": 121129.8,
      "Voted No": 0,
      "Snapshot Batch Index": 8,
      "Snapshot Block": 11457494,
      "Grant Timeline": 3,
      "Grant Deliverables": "There will be 3 deliverables at the end of this phase.\n1. Twitter bot - This will be the user interface. Ocean community can just follow bot and subsc...",
      "ipfsHash": "QmPLfq9J2Mr4FDAWpYaBq2veYJpiKVgU6JkXYUvV8qa2FC",
      "Overview": "Since the inception of Ocean v3 and Ocean Market, we have seen lots of data being published and data pools created. Such phenomenon has created lucrat...",
      "Payment Wallets": "0x5281aD053cC8906d08E9520318A76db767CEeB4b",
      "Login Email": [
        "rec8lYPg6ygthMKAt"
      ],
      "Project Subtitle": "Ocean Pool Alerts",
      "Earmarks": "General",
      "Proposal Standing": "No Ocean",
      "Outstanding Proposals": "\n",
      "UUID": "45f39df7-ecc3-4af3-afe7-178936daddc1",
      "Basis Currency": "USD",
      "Reason Rejected": " "
    }
  }
]

const newFundingRounds = [
  {
    "fields": {
      "Name": "Round 1",
      "Max Grant": 13000,
      "Earmarks": "{\n\"New Entrants\":{\"OCEAN\":0,\"USD\":0}, \"General\": {\"OCEAN\": 65000,\"USD\": 0}\n}",
      "Proposals Granted": 5,
      "Funding Available": 65000,
      "Start Date": "2021-12-10T23:59:00.000Z",
      "Proposals Due By": "2021-12-14T23:59:00.000Z",
      "Voting Starts": "2021-12-16T23:59:00.000Z",
      "Voting Ends": "2021-12-21T23:59:00.000Z",
      "Proposals": 9,
      "Round": "1",
      "Round State": RoundState.Voting,
      "Vote Type": "single-choice",
      "Ballot Type": "Batch",
      "Basis Currency": "OCEAN"
    }
  },
  {
    "fields": {
      "Name": "Round 2",
      "Max Grant": 10000,
      "Earmarks": "{\n\"New Entrants\":{\"OCEAN\":0,\"USD\":0},\n\"General\": {\"OCEAN\": 90000,\"USD\": 0}\n}",
      "Proposals Granted": 9,
      "Funding Available": 90000,
      "Start Date": addDaysToDate(0),
      "Proposals Due By": addDaysToDate(2),
      "Voting Starts": addDaysToDate(4),
      "Voting Ends": addDaysToDate(6),
      "Proposals": 16,
      "Round": "2",
      "Round State": undefined,
      "Vote Type": "single-choice",
      "Ballot Type": "Batch",
      "Basis Currency": "OCEAN"
    }
  }
]

// Tests Skip. Use them to verify that data is getting syncd/dumped properly.
describe('Start Funding Round', function () {
  process.env.AIRTABLE_BASEID = "appe3NtI7wcUn7qqq"
  
  it('Removes all proposals and creates new ones', async function () {
    const proposals = await getTableFields('Proposals',"appe3NtI7wcUn7qqq",'All Proposals')
    await deleteProposalRecords(proposals, 'Proposals')
    await addRecordsToAirtable(newProposals,'Proposals')
  })

  it('Removes all funding rounds and creates new ones', async function () {
    const fundingRounds = await getTableFields('Funding Rounds',"appe3NtI7wcUn7qqq",'Rounds')
    await deleteProposalRecords(fundingRounds, 'Funding Rounds')
    await addRecordsToAirtable(newFundingRounds,'Funding Rounds')
  })

  it('Tests that last round is finnished and next round is started', async function (){
    await main()
    const curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'],RoundState.Started)
  })

  it('Tests that started round is going into DD period', async function (){
    let curRound = await getCurrentRound()
    const roundUpdate = {records: [
      {
        id: curRound.id,
        fields: {
          'Proposals Due By': subtractsDaysFromDate(1)
        }
      }
    ]}
    await updateRoundRecord(roundUpdate)
    await main()
    curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'],RoundState.DueDiligence)
  })

  it('Tests that current round is going into Voting state', async function (){
    curRound = await getCurrentRound()
    const roundUpdate = {records: [
      {
        id: curRound.id,
        fields: {
          'Voting Starts': subtractsDaysFromDate(1)
        }
      }
    ]}
    await updateRoundRecord(roundUpdate)
    await main()
    curRound = await getCurrentRound()
    should.equal(curRound.fields['Round State'],RoundState.Voting)
  })
})
