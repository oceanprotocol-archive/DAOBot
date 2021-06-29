const {getProposalsByState, updateProposalRecords} = require('./airtable_utils')
const {buildProposalPayload, local_broadcast_proposal} = require('../snapshot/snapshot_utils')
const {web3} = require('../functions/web3')

const dotenv = require('dotenv');
dotenv.config();

const pk = process.env.ETH_PRIVATE_KEY || 'your_key_here';
const account = web3.eth.accounts.privateKeyToAccount(pk)
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

var acceptedProposals = {}
var submittedProposals = []

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
}

const validateAccceptedProposal = (proposal) => {
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
        acceptedProposals = await getProposalsByState('IF({Proposal State} = "Accepted", "true")')

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
        if( acceptedProposals.length > 0 )
            console.log('[WARNING] Could not submit [%s] proposals. Please check logs.', acceptedProposals.length)
        if( acceptedProposals.length === 0 && submittedProposals.length === 0 )
            console.log(`[SUCCESS] NO proposals to process`)
    } catch(err) {
        console.log(err)
    }
}

main()
