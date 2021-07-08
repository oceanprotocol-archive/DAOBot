const dotenv = require('dotenv');
dotenv.config();

const {getProposalsByState, updateProposalRecords} = require('../airtable/airtable_utils')
const {buildProposalPayload, local_broadcast_proposal} = require('./snapshot_utils')
const {assert} = require('../functions/utils')
const {web3} = require('../functions/web3')

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here';
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

var acceptedProposals = {}
var submittedProposals = []

const validateAccceptedProposal = (proposal) => {
    assert(proposal.get('One Liner') !== undefined, '[%s][%s]: Invalid <One Liner>', proposal.id, proposal.get('Name'))
    assert(proposal.get('Proposal URL') !== undefined, '[%s][%s]: Invalid <Proposal URL>', proposal.id, proposal.get('Name'))
    assert(proposal.get('Grant Deliverables') !== undefined, '[%s][%s]: Invalid <Grant Deliverables>', proposal.id, proposal.get('Name'))
    assert(proposal.get('Voting Starts') !== undefined, '[%s][%s]: Invalid <Voting Starts>', proposal.id, proposal.get('Name'))
    assert(proposal.get('Voting Ends') !== undefined, '[%s][%s]: Invalid <Voting Ends>', proposal.id, proposal.get('Name'))
    assert(proposal.get('Snapshot Block') !== undefined, '[%s][%s]: Invalid <Snapshot Block>', proposal.id, proposal.get('Name'))
}

// All required fields should have already been validated by the online Form
// Build payload for proposal, and submit it
const main = async () => {
    try {
        // TODO - Parameterize (Docker) + CI/CD Deploy Button + PEBKAC
        acceptedProposals = await getProposalsByState('AND({Round} = "Test", {Proposal State} = "Accepted", "true")')

        // Assert quality
        await Promise.all(acceptedProposals.map(async (proposal) => {
            try {
                validateAccceptedProposal(proposal)

                const payload = buildProposalPayload(proposal)
                const result = await local_broadcast_proposal(web3, account, payload)

                if (result !== undefined) {
                    console.log(result)
                    submittedProposals.push({
                        id: proposal.id,
                        fields: {
                            'ipfsHash': result.ipfsHash,
                            'Vote URL': `https://vote.oceanprotocol.com/#/officialoceandao.eth/proposal/${result.ipfsHash}`,
                            'Proposal State': 'Running'
                        }
                    })
                }
            } catch (err) {
                console.log(err)
            }
        }))

        if( submittedProposals.length > 0 ) {
            await updateProposalRecords(submittedProposals)
            console.log('[SUCCESS] Submitted [%s] proposals to Snapshot.', submittedProposals.length)
        }
        if( acceptedProposals.length !== submittedProposals.length )
            console.log('[WARNING] Accepted [%s] proposals, but only submitted [%s]. Please check logs.', acceptedProposals.length, submittedProposals.length)
    } catch(err) {
        console.log(err)
    }
}

main()
