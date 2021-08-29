global['fetch'] = require('cross-fetch');
const dotenv = require('dotenv');
dotenv.config();

const should = require('chai').should();
const {getVoteCountStrategy, getVotesQuery, getProposalVotesGQL, getVoterScores} = require('../../snapshot/snapshot_utils');

const blockNumber = 12968040;

const proposalIPFSHash_1 = "QmYnGX6pKjrazF4EuJBYV2ecAkPG2WrbW2gYqKncFdEEM8"
const voterValidation_1 = {
    "0x48b576c87e788a762D6f95A456f2A39113b46950":20.2657445,
    "0x227FD2fD881Cc6c99DFCcc0FB40f2B1dc2f3F36E":3793.338596,
    "0xbbd33AFa85539fa65cc08A2e61a001876D2f13FE":42957.92109,
    "0x8Fcf1CA67248A96e63A63Ea125e1fD91D47da4f5":1250,
    "0x0bc9CD548cc04Bfcf8ef2Fca50c13b9b4F62f6D4":1250,
    "0xBF6DEDC1bB233e7E8E8f085227eAA1d611103A68":1250,
    "0x008ed443F31a4b3aEe02fbFe61c7572dDaf3A679":1100.2054,
    "0x42a19cd756651A488f1899157c45Af929bf3695F":32000,
    "0x3D5a3052fF5A3C65f5c300cF7bAA4C08617509B9":3914.17353,
    "0x105DfEd176B4c5Ba488Ee5F4362638Ab0216b8c4":90681.41938,
    "0xF4B41aD3165d64AAb755F0f325bAF67F84bE28E5":270.8918581,
    "0xd71B984f8028af956fD5dAcE23Dd4f90475a82CC":49999.73335,
    "0xB121b3DdaA9af45Df9878C855079F8A78eea9772":11434.1,
    "0xb821A211957E317aF957b28e7292b27a8f9A3b73":6029.718686,
    "0xD0a2813A5d4fB68e2192d04fF9e1c6A72A9285e8":67679,
    "0xFc1a540517fB09d967B5fb22c63F975B1e729D4C":15.58437472,
    "0xcA3b7E1312Ad020C058eF4942e3f33fFe6fD7b5c":13764.18574,
    "0x15b5359fd05A37ba6546AaCabe92D9354aD18D07":208.2273024,
    "0xF40b005FFE2Db0197b8c301e1C966C2cb3B59A08":500,
    "0xF9ac73f30dBe52c10e3d5950db66357f9d0be44D":500,
    "0xCe7BE31f48205C48A91A84E777a66252Bba87F0b":238097.5246,
    "0xd36021060157B1Ba387630C91bE45A087CF9AC58":100000,
    "0x26E4674c09CBbf0b367aae65d8d08b112E307A53":490000,
    "0x7032C3E45d14FbdC93Df98b6e871b3FE4Dae7827":100000
}

const proposalIPFSHash_2 = "QmWQQqJbdLYTW5sU3Khif1gxmeEXoujRzwzHP5uJiPwX9h"
const voterValidation_2 = {
    "0x48b576c87e788a762D6f95A456f2A39113b46950":20.2657445,
    "0x227FD2fD881Cc6c99DFCcc0FB40f2B1dc2f3F36E":3793.338596,
    "0xbbd33AFa85539fa65cc08A2e61a001876D2f13FE":42957.92109,
    "0x8Fcf1CA67248A96e63A63Ea125e1fD91D47da4f5":1250,
    "0x0bc9CD548cc04Bfcf8ef2Fca50c13b9b4F62f6D4":1250,
    "0xBF6DEDC1bB233e7E8E8f085227eAA1d611103A68":1250,
    "0x008ed443F31a4b3aEe02fbFe61c7572dDaf3A679":1100.2054,
    "0x2BcA3836741FE09f690ca7F1EDfCED65968D57C3":33532.8,
    "0x61Ae4E8691335569776eEAd72D16f4f002E64a56":1979.856468,
    "0x7a791fDA775B399f4A78f68a0b66498e6bcD3492":0.0999,
    "0x87E4B99cE07073594AdDA44338705BA1Ab674cbD":34.50403844,
    "0x105DfEd176B4c5Ba488Ee5F4362638Ab0216b8c4":90681.41938,
    "0xF4B41aD3165d64AAb755F0f325bAF67F84bE28E5":270.8918581,
    "0x01e66950353400E93AEe7F041C0303103E2ef5Ab":22695.49488,
    "0x362CfE20851584DF00a670b2c8460A3aafD35839":30000,
    "0xd71B984f8028af956fD5dAcE23Dd4f90475a82CC":49999.73335,
    "0xF49A4ba03f69eEf2366303e64Fc7b3a33d3f0043":25503.25545,
    "0x1a0c2621E983CA01c2ccd1e2898E65e5a0775c54":19986.05027,
    "0xB39EC688A27B14436e9F15A693Da8605A3D0269D":350000.0002,
    "0xCbD14C1a2593Eeeef38AC8d3d9E3df6aa405b4eC":100000,
    "0xCbD2c001A4450b4dAD7920951bcFd7a328fEAEa6":450000,
    "0x67B69C822553FE57d8B7E354af4f540c4e8963c9":26365.77007,
    "0xE0dc24A3d7478eB840dC63baa20fcB06cdB123BE":386496.3534
}

// Tests against Snapshot GraphQL endpoint
describe('Snapshot GraphQL test', () => {
    it('Validates votes from proposal', async () => {
        const options = {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                query: getVotesQuery(proposalIPFSHash_1)
            })
        };

        var votes = []
        return fetch("https://hub.snapshot.org/graphql", options)
            .then((resp) => resp.json())
            .then((resp) => {
                votes = resp.data.votes;
                should.equal(votes.length, 24)
            })
            .catch((e) => {
                console.log(e)
            });
    });

    it('Validates scores from proposal & voters 1', async () => {
        var votes = []
        let response = await getProposalVotesGQL(proposalIPFSHash_1)
        response = await response.json()
        votes = response.data.votes
        should.equal(votes.length, 24)

        const voters = votes.map((x) => {
            return x['voter']
        })
        const strategy = getVoteCountStrategy(8)

        const voterScores = await getVoterScores(strategy, voters, blockNumber)
        let flatVoterScores = Object.assign({}, voterScores[0], voterScores[1])

        for (const [key, value] of Object.entries(flatVoterScores)) {
            let validationValue = voterValidation_1[key]
            should.equal(value, validationValue)
        }
        console.log(voterScores)
    });

    it('Validates scores from proposal & voters 2', async () => {
        var votes = []
        let response = await getProposalVotesGQL(proposalIPFSHash_2)
        response = await response.json()
        votes = response.data.votes
        should.equal(votes.length, 23)

        const voters = votes.map((x) => {
            return x['voter']
        })
        const strategy = getVoteCountStrategy(8)

        const voterScores = await getVoterScores(strategy, voters, blockNumber)
        let flatVoterScores = Object.assign({}, voterScores[0], voterScores[1])

        for (const [key, value] of Object.entries(flatVoterScores)) {
            let validationValue = voterValidation_2[key]
            should.equal(value, validationValue)
        }
        console.log(voterScores)
    });
});
