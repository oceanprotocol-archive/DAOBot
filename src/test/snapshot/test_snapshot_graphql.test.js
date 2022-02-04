/* eslint-env mocha */

global.fetch = require('cross-fetch')
const fetch = require('cross-fetch')
const Logger = require('../../utils/logger')
const dotenv = require('dotenv')
dotenv.config()

const should = require('chai').should()
const { assert } = require('chai')
const {
  getVoteCountStrategy,
  getVotesQuery,
  reduceVoterScores,
  getProposalVotesGQL,
  getVoterScores
} = require('../../snapshot/snapshot_utils')

afterAll(() => {
  jest.clearAllTimers()
})

const singleBatchVoting_blockHeight = 11457494
const singleBatchVoting_proposalIPFSHash =
  'QmPLfq9J2Mr4FDAWpYaBq2veYJpiKVgU6JkXYUvV8qa2FC'
const singleBatchVoting_voterValidation = {
  '0x9e95B6c35a43A61B06F19d21FBe008f17B1f5e44': 300.011809394178,
  '0x01e66950353400E93AEe7F041C0303103E2ef5Ab': 5271.99299856829,
  '0x362CfE20851584DF00a670b2c8460A3aafD35839': 3268.11491548,
  '0x1Daf0b27e0F54a235abb5D52D276033394Eb8F49': 567.687949458862,
  '0xcC7E9b8331bea863a158589E8EBCF118C72d0683': 7084.81312310333,
  '0xf3a7ACf685c737B632Ffe4265BB9094C25cF8Ac4': 536.381784547345,
  '0xbbd33AFa85539fa65cc08A2e61a001876D2f13FE': 3960.24130430685,
  '0x3DA6cb84752975352711ACAb5613B4E23e04fbfc': 24510.21392,
  '0xcBdD51CF4e679542de0AC059Ae7399d798870F5F': 29999.97808381,
  '0xAFBA2f63810e1Be2F56e95b77fD20f62a3Aef46a': 2124.79335553507,
  '0xA41960A39265e936d73F76581475F5517f8F259D': 4554.57098909636,
  '0x12843126A739EE01dbDa27102c66ae20689506B9': 114.865934408993,
  '0x1911176664F147DCb30DA4a4AA6ef6c6849e613f': 4446.74229105112,
  '0xB121b3DdaA9af45Df9878C855079F8A78eea9772': 25934.1,
  '0x2102fbdb989Ad103DFd0D110E639A8abe0e148fF': 0.526796426156998,
  '0x5De4EA2F4fDe1823ea0432FbeB7E8E7a69f8987C': 5340.74981521659,
  '0x07796f0FECABF25A8516d99b0669375246b10C2c': 3117.59415244387,
  '0xCe7BE31f48205C48A91A84E777a66252Bba87F0b': 6238.16305545634,
  '0x15b5359fd05A37ba6546AaCabe92D9354aD18D07': 2230,
  '0x655eFe6Eb2021b8CEfE22794d90293aeC37bb325': 6435,
  '0xF40b005FFE2Db0197b8c301e1C966C2cb3B59A08': 5000,
  '0xBEc2E3DcC0F554072474A24376419F5d3454b70F': 4724.99216156473,
  '0x06Fbe5d776905ea91899b273e4b663ADF58597eB': 10022.7463466783,
  '0x3c104180D537550d2cC2fe6de12d1A6c6B29A036': 2003408.22666516,
  '0xebDcbE0f258B7F8Ebb7d3F5E57faE8C2204a5E64': 8862.4631086049,
  '0xb1234459671Bc3C844b7887574748be5bFf8b55F': 2491.46248790243,
  '0x5D2B315C465e133a346C960F46f5AA1ED88a3179': 13840.7083829441,
  '0xf84a022c73F3547932bdb3Cf4a356315fDc76748': 11780,
  '0x45E48C0a6Fe8b759652624451C83387130C58367': 20801.2882742,
  '0x01b8744f70cE3386aac11365516B231A78004198': 20388.8505952274,
  '0xf773829a6cFF2a51B8fC4E0D146faE34182bf119': 20000,
  '0x5281aD053cC8906d08E9520318A76db767CEeB4b': 20000,
  '0xF26dAAEc5d04BEa5cADB01f93D060b668b96a00b': 6938.96369662857,
  '0xB804cb279F84292df5e8D78a6B2Ff315aD3E8B3c': 5043.69297320161,
  '0xE2D0d856Ecfaf305BAee76ddAf76444AD3b8684c': 3743.288215579,
  '0xa60556e3bF6424488072Fb09A20Ecb23dd6D609E': 2500,
  '0x6217D92CdbbB56046669cd9F86a916447849fd96': 456.402581666758,
  '0x3457124819696E79A3ECa0D08655B287C4F92136': 3357.49087268322,
  '0x67B69C822553FE57d8B7E354af4f540c4e8963c9': 41365.77006754,
  '0x7Dc445E2B251e82bd45A4401e72Cf60b6B4a13aB': 3999.05121585417,
  '0xB40156F51103EbaA842590cE51DD2cD0a9E83cDa': 12861.2690011467,
  '0xEa9235312333aEbFA8C8cA76c77574755b5C00ca': 8343.73946422736,
  '0xc42193d87DD67c3639ED1cEF53c409c37775F7C4': 15000.0247040314,
  '0x24D768d1fFadea536f293354553d360c7E16a8E0': 60063.990396301,
  '0x3D57251EF3c56992e76dEb521e21614F67e2cde9': 153.182370888357,
  '0x8dB040D2A95c76805f7F24B146f273ADdbB86ed1': 1082.5648046135,
  '0x33f0E20f104bC092AD43E1fcA864310C4c0189E4': 312.568574271048,
  '0xB63503dA3bfAB5626e2A91c4cD94fB59679f6876': 69297.1412506261,
  '0x64f1fA767dC5f050431Bd1d1d3e72Ea0aD865a06': 38408.4263790967,
  '0xE0093f7A481f1545d4A656726735E544Eb98eD93': 400000.000000004,
  '0x4D4290CBA904aBb4dFbc1568766bCD88e67Be391': 5078,
  '0xba70544Ca4feD37A78Caa653e1cdD3A97d71605C': 20511.2319091916,
  '0xCeaAD86848Dc118337b97eD7a0Fdba36Da6f03D4': 2963.56394793344,
  '0xf29cA9E016BD479603c3470284Eb7f6090344a8C': 70000,
  '0xC767B8d677bEB0A91bB511f20D533cA7Dd524494': 5000,
  '0x09E72574c5ab7891f9478d210ee0E6fc5e7FE486': 20000,
  '0x27B3035ab7F71d711dE25f114768F5F64B61857B': 44349.8,
  '0x34335050Aa618DA5F5187E7644f0b86a015E55d3': 36965.2577361334,
  '0x359a76dB7aFDAd46f0e2C6699eC768c1064C86Ca': 1939.77982052474,
  '0xFE53E594f981e234FCc5e33d3C37943C81766485': 83.6620548441032,
  '0x5F071f2CE06084811be5B2EF2e9D2773f53d32CB': 7209.12155135,
  '0x91d7Ff5660435a218BfB2DBEe4C1Ec865892b2E2': 106.276729215543,
  '0xCd3f010432c427D043AF133b5AE9ee22B1ECEd9B': 1000.83455397674,
  '0xd647b65fF1e4b25E3d2Dc86553A42c2675072A1a': 16500,
  '0x5cFDBd9150596b790AAe28e003EFfac9f29081F9': 5000,
  '0x12BD31628075C20919BA838b89F414241b8c4869': 23804.9,
  '0xaaC3438D37Da2FA2cE9A91c43834757314A2211b': 1042.4945485487,
  '0xF3E6e119972D9FBC06D34919a5EeCE4Ab5E47975': 100,
  '0x0B4a3351096b93672EFe48058A2De00E520F50f9': 1471.0523646851,
  '0x206120ebC24119b650B58df6Fc8559C8418A9e83': 488.176503231012,
  '0xF0e5094e51CDD81eBD68dD3F19AA580E2396A94D': 10792.9526767501,
  '0x85799fF1c86f89FE9fB07773d1d240763b6039Ce': 201.612019392581,
  '0x1cA48a32482eF29708e95F248E8a613f05782ED3': 16149.2983099485,
  '0x9b315a6B563687357FaF7493700C3EA406f5d55c': 139.249169580784,
  '0x2D3fb3096F020029A49A45c88253A4CD0BC2503F': 1532.23026721296,
  '0xB3D31eCf4C702Dc516c7a7e67F385560eE04A9C3': 15018.9080305644
}

const granularVoting_blockHeight = 12968040
const granularVoting_proposalIPFSHash =
  'QmWQQqJbdLYTW5sU3Khif1gxmeEXoujRzwzHP5uJiPwX9h'
const granularVoting_voterValidation = {
  '0x48b576c87e788a762D6f95A456f2A39113b46950': 20.2657445,
  '0x227FD2fD881Cc6c99DFCcc0FB40f2B1dc2f3F36E': 3793.338596,
  '0xbbd33AFa85539fa65cc08A2e61a001876D2f13FE': 42957.92109,
  '0x8Fcf1CA67248A96e63A63Ea125e1fD91D47da4f5': 1250,
  '0x0bc9CD548cc04Bfcf8ef2Fca50c13b9b4F62f6D4': 1250,
  '0xBF6DEDC1bB233e7E8E8f085227eAA1d611103A68': 1250,
  '0x008ed443F31a4b3aEe02fbFe61c7572dDaf3A679': 1100.2054,
  '0x2BcA3836741FE09f690ca7F1EDfCED65968D57C3': 33532.8,
  '0x61Ae4E8691335569776eEAd72D16f4f002E64a56': 1979.856468,
  '0x7a791fDA775B399f4A78f68a0b66498e6bcD3492': 0.0999,
  '0x87E4B99cE07073594AdDA44338705BA1Ab674cbD': 34.50403844,
  '0x105DfEd176B4c5Ba488Ee5F4362638Ab0216b8c4': 90681.41938,
  '0xF4B41aD3165d64AAb755F0f325bAF67F84bE28E5': 270.8918581,
  '0x01e66950353400E93AEe7F041C0303103E2ef5Ab': 22695.49488,
  '0x362CfE20851584DF00a670b2c8460A3aafD35839': 30000,
  '0xd71B984f8028af956fD5dAcE23Dd4f90475a82CC': 49999.73335,
  '0xF49A4ba03f69eEf2366303e64Fc7b3a33d3f0043': 25503.25545,
  '0x1a0c2621E983CA01c2ccd1e2898E65e5a0775c54': 19986.05027,
  '0xB39EC688A27B14436e9F15A693Da8605A3D0269D': 350000.0002,
  '0xCbD14C1a2593Eeeef38AC8d3d9E3df6aa405b4eC': 100000,
  '0xCbD2c001A4450b4dAD7920951bcFd7a328fEAEa6': 450000,
  '0x67B69C822553FE57d8B7E354af4f540c4e8963c9': 26365.77007,
  '0xE0dc24A3d7478eB840dC63baa20fcB06cdB123BE': 386496.3534
}

const uni_sushi_bancor_blockNumber = 13060882
const uni_sushi_bancor_proposalIPFSHash =
  'QmQgfxvLqz88pL3ByK6U82bxezCU8MAiCSgxtTTCoR3fWm'
const uni_sushi_bancor_voterValidation = {
  '0x48b576c87e788a762D6f95A456f2A39113b46950': 20.2334355075387,
  '0x002570980aA53893C6981765698b6eBAB8aE7EA1': 24318.582,
  '0x655eFe6Eb2021b8CEfE22794d90293aeC37bb325': 300329.407284156,
  '0x61B15998893cC746B46C08FEdEE13a0d1b33bBa9': 73013.1442325089, // This number is not matching to voting results => 73013.1442325089
  '0x14af5647Ca3a36CaD8fa8a920A8C8ff2aC558E4e': 2975.14216681051,
  '0x5066Fbe092caee0d19Ddd0B3302eA4e925726F80': 76740.0837596464,
  '0x5D2B315C465e133a346C960F46f5AA1ED88a3179': 53757.9847857811,
  '0xbbd33AFa85539fa65cc08A2e61a001876D2f13FE': 37755.4469543468,
  '0x227FD2fD881Cc6c99DFCcc0FB40f2B1dc2f3F36E': 3793.33859637885
}

const spring_dao_quadratic_blockNumber = 13347979
const spring_dao_quadratic_proposalIPFSHash =
  'QmX1H9SiZnM7MvaxzSKNwXKtt9p95RfiWDTKAQLNWnFS1q'

// Tests against Snapshot GraphQL endpoint
describe('Snapshot GraphQL test', () => {
  it('Validates votes from proposal', async () => {
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        query: getVotesQuery(singleBatchVoting_proposalIPFSHash)
      })
    }

    var votes = []
    let resp = await fetch('https://hub.snapshot.org/graphql', options)
    resp = await resp.json()
    ;({ votes } = resp.data)
    expect(votes.constructor).toBe(Array)
    expect(votes.length > 80).toBe(true)
  })

  it.skip('Validates scores from Single-Batch Voting', async () => {
    const strategy = getVoteCountStrategy(1)

    let votes = []
    await getProposalVotesGQL(singleBatchVoting_proposalIPFSHash).then(
      (result) => {
        ;({ votes } = result.data)
      }
    )
    should.equal(votes.length, 89)

    const voters = []
    for (var i = 0; i < votes.length; ++i) {
      voters.push(votes[i].voter)
    }

    const voterScores = await getVoterScores(
      strategy,
      voters,
      singleBatchVoting_blockHeight
    )
    const reducedVoterScores = reduceVoterScores(strategy, votes, voterScores)

    reducedVoterScores.map((x) => {
      const voterAddress = Object.keys(x)[0]
      const validationValue = singleBatchVoting_voterValidation[voterAddress]
      if (validationValue !== undefined) {
        should.equal(
          x[voterAddress].balance.toFixed(2),
          validationValue.toFixed(2)
        )
      } else {
        Logger.log(`Voter [${voterAddress}] score is not found in snapshot`)
      }
    })
    Logger.log(voterScores)
  }) // .timeout(5000);

  it('Validates scores from Y/N granular voting', async () => {
    const strategy = getVoteCountStrategy(8)

    let votes = []
    await getProposalVotesGQL(granularVoting_proposalIPFSHash).then(
      (result) => {
        ;({ votes } = result.data)
      }
    )
    should.equal(votes.length, 23)

    const voters = []
    for (var i = 0; i < votes.length; ++i) {
      voters.push(votes[i].voter)
    }

    const voterScores = await getVoterScores(
      strategy,
      voters,
      granularVoting_blockHeight
    )
    const reducedVoterScores = reduceVoterScores(strategy, votes, voterScores)

    reducedVoterScores.map((x) => {
      const voterAddress = Object.keys(x)[0]
      const validationValue = granularVoting_voterValidation[voterAddress]
      if (validationValue !== undefined) {
        should.equal(
          x[voterAddress].balance.toFixed(2),
          validationValue.toFixed(2)
        )
      } else {
        Logger.log(`Voter [${voterAddress}] score is not found in snapshot`)
      }
    })
    Logger.log(voterScores)
  }) // .timeout(5000);

  it('Validates scores from UniV2/Sushi/Bancor', async () => {
    const strategy = getVoteCountStrategy(9)

    let votes = []
    await getProposalVotesGQL(uni_sushi_bancor_proposalIPFSHash).then(
      (result) => {
        ;({ votes } = result.data)
      }
    )
    should.equal(votes.length, 9)

    const voters = []
    for (var i = 0; i < votes.length; ++i) {
      voters.push(votes[i].voter)
    }

    const voterScores = await getVoterScores(
      strategy,
      voters,
      uni_sushi_bancor_blockNumber
    )
    const reducedVoterScores = reduceVoterScores(strategy, votes, voterScores)

    Logger.log(voterScores)
    reducedVoterScores.map((x) => {
      const voterAddress = Object.keys(x)[0]
      const validationValue = uni_sushi_bancor_voterValidation[voterAddress]
      if (validationValue !== undefined) {
        if (voterAddress === '0x61B15998893cC746B46C08FEdEE13a0d1b33bBa9') {
          Logger.log(`Calculated score ${x[voterAddress].balance.toFixed(2)}`)
          Logger.log(`Expected score ${validationValue.toFixed(2)}`)
          assert.fail(
            'Snapshot score is not the same as expected => https://snapshot.org/#/officialoceandao.eth/proposal/QmQgfxvLqz88pL3ByK6U82bxezCU8MAiCSgxtTTCoR3fWm'
          )
        } else {
          should.equal(
            x[voterAddress].balance.toFixed(2),
            validationValue.toFixed(2)
          )
        }
      } else {
        Logger.log(`Voter [${voterAddress}] score is not found in snapshot`)
      }
    })
  })

  it('Validates scores from SPRING quadratic voting', async () => {
    const strategy = [
      {
        name: 'erc20-balance-of',
        params: {
          symbol: 'SPRNG',
          address: '0x6D40A673446B2D00D1f9E85251209C638049ba22',
          decimals: 2
        }
      }
    ]

    let votes = []
    await getProposalVotesGQL(spring_dao_quadratic_proposalIPFSHash).then(
      (result) => {
        ;({ votes } = result.data)
      }
    )
    should.equal(votes.length, 1)

    const voters = []
    for (var i = 0; i < votes.length; ++i) {
      voters.push(votes[i].voter)
    }

    const voterScores = await getVoterScores(
      strategy,
      voters,
      spring_dao_quadratic_blockNumber
    )
    const reducedVoterScores = reduceVoterScores(strategy, votes, voterScores)

    Logger.log(reducedVoterScores)
  })
})
