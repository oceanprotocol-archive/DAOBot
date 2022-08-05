const axios = require('axios')
const { bufferToHex } = require('ethereumjs-util')
const { version } = require('@snapshot-labs/snapshot.js/src/constants.json')
const fetch = require('cross-fetch')
const snapshot = require('@snapshot-labs/snapshot.js')
const { ethers } = require('ethers')
const hubUrl = process.env.SNAPSHOT_HUB_URL || 'https://testnet.snapshot.org'
const network = '1'
const provider = snapshot.utils.getProvider(network)
const Logger = require('../utils/logger')
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_key_here'
// Consts
const OCEAN_ERC20_0x = '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
const OCEAN_Polygon_0x = '0x282d8efCe846A88B159800bd4130ad77443Fa1A1'
const OCEAN_BSC_0x = '0xdce07662ca8ebc241316a15b611c89711414dd1a'
const networks = [
  {
    address: OCEAN_ERC20_0x,
    provider: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
  },
  {
    address: OCEAN_Polygon_0x,
    provider: process.env.POLYGON_RPC_URL || `https://polygon-rpc.com`
  },
  {
    address: OCEAN_BSC_0x,
    provider: process.env.BSC_RPC_URL || `https://bsc-dataseed.binance.org/`
  }
]

const OCEAN_ERC20_ABI = require('../utils/oceanERC20ABI.json')
const MIN_OCEAN_REQUIRED = 500.0

const getWalletBalance = async (wallet0x, required) => {
  let totalBalance = 0

  for (const network of networks) {
    const provider = new ethers.providers.JsonRpcProvider(network.provider)
    const contract = new ethers.Contract(
      network.address,
      OCEAN_ERC20_ABI.abi,
      provider
    )
    const balance = await contract.balanceOf(wallet0x)
    totalBalance += parseFloat(ethers.utils.formatEther(balance))
    if (totalBalance >= required) return true
  }

  return false
}

const hasEnoughOceans = async (wallet_address) => {
  if (!wallet_address) return false
  return await getWalletBalance(wallet_address, MIN_OCEAN_REQUIRED)
}

const strategy = {
  test_strategy_spring: [
    {
      name: 'erc20-balance-of',
      params: {
        symbol: 'SPRNG',
        address: '0x6D40A673446B2D00D1f9E85251209C638049ba22',
        decimals: 2
      }
    }
  ],
  strategy_v0_1: [
    {
      name: 'erc20-balance-of',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    }
  ],
  strategy_v0_2: [
    {
      name: 'ocean-marketplace',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    },
    {
      name: 'erc20-balance-of',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    }
  ],
  strategy_v0_3: [
    {
      name: 'erc20-balance-of',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    },
    {
      name: 'ocean-marketplace',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    },
    {
      name: 'sushiswap',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    },
    {
      name: 'uniswap',
      params: {
        symbol: 'OCEAN',
        address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
        decimals: 18
      }
    },
    {
      name: 'contract-call',
      params: {
        address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
        args: [
          '%{address}',
          '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
          '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
        ],
        decimals: 18,
        symbol: 'OCEAN',
        methodABI: {
          inputs: [
            {
              internalType: 'address',
              name: 'provider',
              type: 'address'
            },
            {
              internalType: 'address',
              name: 'poolToken',
              type: 'address'
            },
            {
              internalType: 'address',
              name: 'reserveToken',
              type: 'address'
            }
          ],
          name: 'totalProviderAmount',
          outputs: [
            {
              internalType: 'uint256',
              name: '',
              type: 'uint256'
            }
          ],
          stateMutability: 'view',
          type: 'function'
        }
      }
    }
  ],
  strategy_qv_v1: [
    {
      name: 'ocean-dao-brightid',
      params: {
        brightIdMultiplier: 4,
        notVerifiedMultiplier: 1,
        brightIdNetwork: '1',
        registry: '0xc37F8341Ac6e4a94538302bCd4d49Cf0852D30C0',
        symbol: 'OCEAN',
        strategies: {
          1: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cd07ab37855c090aaf366e4ce1b9f48',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'sushiswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'uniswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'contract-call',
              params: {
                address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
                args: [
                  '%{address}',
                  '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
                  '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
                ],
                decimals: 18,
                symbol: 'OCEAN',
                methodABI: {
                  inputs: [
                    {
                      internalType: 'address',
                      name: 'provider',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'poolToken',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'reserveToken',
                      type: 'address'
                    }
                  ],
                  name: 'totalProviderAmount',
                  outputs: [
                    {
                      internalType: 'uint256',
                      name: '',
                      type: 'uint256'
                    }
                  ],
                  stateMutability: 'view',
                  type: 'function'
                }
              }
            }
          ]
        }
      }
    }
  ],
  strategy_qv_v2: [
    {
      name: 'ocean-dao-brightid',
      params: {
        brightIdMultiplier: 4,
        notVerifiedMultiplier: 1,
        brightIdNetwork: '1',
        registry: '0xc37F8341Ac6e4a94538302bCd4d49Cf0852D30C0',
        symbol: 'OCEAN',
        strategies: {
          1: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cd07ab37855c090aaf366e4ce1b9f48',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'sushiswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'uniswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'contract-call',
              params: {
                address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
                args: [
                  '%{address}',
                  '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
                  '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
                ],
                decimals: 18,
                symbol: 'OCEAN',
                methodABI: {
                  inputs: [
                    {
                      internalType: 'address',
                      name: 'provider',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'poolToken',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'reserveToken',
                      type: 'address'
                    }
                  ],
                  name: 'totalProviderAmount',
                  outputs: [
                    {
                      internalType: 'uint256',
                      name: '',
                      type: 'uint256'
                    }
                  ],
                  stateMutability: 'view',
                  type: 'function'
                }
              }
            }
          ],
          137: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
                decimals: 18
              }
            }
          ],
          56: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0xdce07662ca8ebc241316a15b611c89711414dd1a',
                decimals: 18
              }
            }
          ]
        }
      }
    }
  ],
  strategy_qf_marketplace_v4: [
    {
      name: 'ocean-dao-brightid',
      params: {
        brightIdMultiplier: 4,
        notVerifiedMultiplier: 1,
        brightIdNetwork: '1',
        registry: '0xc37F8341Ac6e4a94538302bCd4d49Cf0852D30C0',
        symbol: 'OCEAN',
        delegationSpace: 'officialoceandao.eth',
        strategies: {
          1: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cd07ab37855c090aaf366e4ce1b9f48',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace-v4',
              params: {
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
              }
            },
            {
              name: 'sushiswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'uniswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'contract-call',
              params: {
                address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
                args: [
                  '%{address}',
                  '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
                  '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
                ],
                decimals: 18,
                symbol: 'OCEAN',
                methodABI: {
                  inputs: [
                    {
                      internalType: 'address',
                      name: 'provider',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'poolToken',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'reserveToken',
                      type: 'address'
                    }
                  ],
                  name: 'totalProviderAmount',
                  outputs: [
                    {
                      internalType: 'uint256',
                      name: '',
                      type: 'uint256'
                    }
                  ],
                  stateMutability: 'view',
                  type: 'function'
                }
              }
            },
            {
              name: 'h2o',
              params: {
                symbol: 'OCEAN',
                collateralTypeId: 'OCEAN-A'
              }
            }
          ],
          56: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0xdce07662ca8ebc241316a15b611c89711414dd1a',
                decimals: 18
              }
            }
          ],
          137: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace-v4',
              params: {
                address: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1'
              }
            }
          ],
          246: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x593122AAE80A6Fc3183b2AC0c4ab3336dEbeE528',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace-v4',
              params: {
                address: '0x593122AAE80A6Fc3183b2AC0c4ab3336dEbeE528'
              }
            }
          ],
          1285: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE',
                decimals: 18
              }
            },
            {
              name: 'ocean-marketplace-v4',
              params: {
                address: '0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE'
              }
            }
          ]
        }
      }
    }
  ],
  strategy_qf_v4_no_marketplace: [
    {
      name: 'ocean-dao-brightid',
      params: {
        brightIdMultiplier: 4,
        notVerifiedMultiplier: 1,
        brightIdNetwork: '1',
        registry: '0xc37F8341Ac6e4a94538302bCd4d49Cf0852D30C0',
        symbol: 'OCEAN',
        delegationSpace: 'officialoceandao.eth',
        strategies: {
          1: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cd07ab37855c090aaf366e4ce1b9f48',
                decimals: 18
              }
            },
            {
              name: 'sushiswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'uniswap',
              params: {
                symbol: 'OCEAN',
                address: '0x967da4048cD07aB37855c090aAF366e4ce1b9F48',
                decimals: 18
              }
            },
            {
              name: 'contract-call',
              params: {
                address: '0x9712Bb50DC6Efb8a3d7D12cEA500a50967d2d471',
                args: [
                  '%{address}',
                  '0xCDfF066eDf8a770E9b6A7aE12F7CFD3DbA0011B5',
                  '0x967da4048cD07aB37855c090aAF366e4ce1b9F48'
                ],
                decimals: 18,
                symbol: 'OCEAN',
                methodABI: {
                  inputs: [
                    {
                      internalType: 'address',
                      name: 'provider',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'poolToken',
                      type: 'address'
                    },
                    {
                      internalType: 'address',
                      name: 'reserveToken',
                      type: 'address'
                    }
                  ],
                  name: 'totalProviderAmount',
                  outputs: [
                    {
                      internalType: 'uint256',
                      name: '',
                      type: 'uint256'
                    }
                  ],
                  stateMutability: 'view',
                  type: 'function'
                }
              }
            },
            {
              name: 'h2o',
              params: {
                symbol: 'OCEAN',
                collateralTypeId: 'OCEAN-A'
              }
            }
          ],
          56: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0xdce07662ca8ebc241316a15b611c89711414dd1a',
                decimals: 18
              }
            }
          ],
          137: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
                decimals: 18
              }
            }
          ],
          246: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x593122AAE80A6Fc3183b2AC0c4ab3336dEbeE528',
                decimals: 18
              }
            }
          ],
          1285: [
            {
              name: 'erc20-balance-of',
              params: {
                symbol: 'OCEAN',
                address: '0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE',
                decimals: 18
              }
            }
          ]
        }
      }
    }
  ]
}

const VoteType = {
  SingleChoice: 'single-choice',
  Quadratic: 'quadratic',
  Weighted: 'weighted'
}

const BallotType = {
  Batch: 'Batch',
  Granular: 'Granular'
}

const getVoteCountStrategy = (roundNumber) => {
  const defaultStrategy = process.env.SNAPSHOT_STRATEGY
  if (defaultStrategy !== undefined) {
    return strategy[process.env.SNAPSHOT_STRATEGY]
  }

  if (roundNumber < 5) return strategy.strategy_v0_1
  if (roundNumber < 9) return strategy.strategy_v0_2
  if (roundNumber < 14) return strategy.strategy_v0_3
  if (roundNumber < 15) return strategy.strategy_qv_v1
  if (roundNumber < 19) return strategy.strategy_qv_v2
  if (roundNumber < 20) return strategy.strategy_qf_marketplace_v4
  return strategy.strategy_qf_v4_no_marketplace
}

const getVotesQuery = (ifpshash) => `query Votes {
  votes (
    first: 10000,
    where: {
      proposal: "${ifpshash}"
    }
  ) {
    voter
    choice
    created
  }
}`

const getProposalVotes = async (ipfsHash) => {
  const proposalUrl =
    `${hubUrl}/api/${process.env.SNAPSHOT_SPACE}/proposal/` + ipfsHash
  return await axios.get(proposalUrl)
}

const getProposalVotesGQL = async (ipfsHash) => {
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      query: getVotesQuery(ipfsHash)
    })
  }
  const response = await fetch(`${hubUrl}/graphql`, options)

  // If a user allocates all his voting power just to 1 proposal,
  // on the snapshot response for that wallet, the choices array
  // is somthing like: {"41":1e+41}".
  // So we need to transform that 1e+41 into a natural number
  // to correcly calculate the votes count and the sum of allocated tokens
  const result = await response.json()
  for (const [, vote] of Object.entries(result.data?.votes)) {
    for (const [choiceIndex, voteCount] of Object.entries(vote.choice)) {
      if (voteCount === 1e41) vote.choice[choiceIndex] = 1
    }
  }

  return result
}

const getVoterScores = async (strategy, voters, blockHeight) => {
  return snapshot.utils
    .getScores(
      process.env.SNAPSHOT_SPACE,
      strategy,
      network,
      provider,
      voters,
      blockHeight
    )
    .then((scores) => {
      return scores
    })
}

// Returns reduced voter score based on multiple strategies => {voter:{choice:int,balance:int}}
const reduceVoterScores = (strategy, proposalVotes, voterScores) => {
  return Object.entries(proposalVotes).map((voter) => {
    let strategyScore = 0
    const newVoter = voter[1].voter
    for (let i = 0; i < strategy.length; i++) {
      const curStratScore = voterScores[i][newVoter]
      if (curStratScore !== undefined) strategyScore += curStratScore
    }
    return {
      address: newVoter,
      choice: voter[1].choice,
      created: voter[1].created,
      balance: strategyScore
    }
  })
}

// Returns reduced proposal summary based on many voters => {1:int,2:int}
const reduceProposalScores = (ballotType, voterScores) => {
  // ! USE calculateMatch for QF
  const scores = ballotType === BallotType.Granular ? { 1: 0, 2: 0 } : {}

  Object.entries(voterScores).reduce((total, cur) => {
    const voterAllChoices = cur[1].choice
    const voterTotalBalance = cur[1].balance

    if (ballotType === BallotType.Granular) {
      if (scores[voterAllChoices] === undefined) scores[voterAllChoices] = 0
      scores[voterAllChoices] += voterTotalBalance
    } else {
      let voterVotesCount = 0
      for (const [, vote] of Object.entries(voterAllChoices)) {
        voterVotesCount += vote
      }

      for (const [proposalIndex, proposalVotes] of Object.entries(
        voterAllChoices
      )) {
        if (scores[proposalIndex] === undefined) scores[proposalIndex] = 0
        scores[proposalIndex] +=
          voterVotesCount > 0 && voterTotalBalance > 0 && proposalVotes > 0
            ? (voterTotalBalance / voterVotesCount) * proposalVotes
            : 0
      }
    }
  }, {})

  return scores
}

// Calculate match for each grant
const calculateMatch = (reducedVoterScores) => {
  const granularVotes = {}
  reducedVoterScores.map((x) => {
    const sumChoices = Object.values(x.choice).reduce((a, b) => a + b)
    // Distribute balance per choice voted on
    for (const [key, value] of Object.entries(x.choice)) {
      if (granularVotes[key] === undefined) granularVotes[key] = []
      granularVotes[key].push(x.balance * (value / sumChoices))
    }
  })

  const choiceSums = {}
  let totalVotes = 0
  let summed = 0
  for (const [key, value] of Object.entries(granularVotes)) {
    choiceSums[key] = value.map(Math.sqrt).reduce((a, b) => a + b) ** 2
    summed += value.reduce((a, b) => a + b)
    totalVotes += choiceSums[key]
  }

  const divisor = summed / totalVotes

  for (const grant of Object.keys(choiceSums)) {
    choiceSums[grant] *= divisor
  }
  return choiceSums
}

// Configure the ballot for a single proposal
const buildGranularProposalPayload = (proposal, roundNumber, voteType) => {
  const strategy = getVoteCountStrategy(roundNumber)
  const startTs = Date.parse(proposal.get('Voting Starts')) / 1000
  const endTs = Date.parse(proposal.get('Voting Ends')) / 1000
  const blockHeight = proposal.get('Snapshot Block')
  const body = `${proposal.get('One Liner')}

## Full Proposal
${proposal.get('Proposal URL')}

## Grant Deliverables
${proposal.get('Grant Deliverables')}

### Engage in community conversation, questions and feedback
https://discord.gg/TnXjkR5

## Cast your vote below!`

  return {
    end: endTs,
    body: body,
    name: proposal.get('Project Name'),
    type: voteType,
    start: startTs,
    choices: ['Yes', 'No'],
    metadata: {
      network: 1,
      strategies: strategy
    },
    snapshot: blockHeight
  }
}

// Configure the ballot for multiple proposals
const buildBatchProposalPayload = (
  proposals,
  choices,
  roundNumber,
  voteType
) => {
  const strategy = getVoteCountStrategy(roundNumber)

  const startTs = Date.parse(proposals[0].get('Voting Starts')) / 1000
  const endTs = Date.parse(proposals[0].get('Voting Ends')) / 1000
  const blockHeight = proposals[0].get('Snapshot Block')

  let body = `## Proposals:`

  proposals.forEach((x) => {
    body += `
${x.get('Project Name')} - [Click Here](${x.get('Proposal URL')})
`
  })

  body += `
### Engage in community conversation, questions and feedback
[Join our discord](https://discord.gg/TnXjkR5)

### Cast your vote below!`

  return {
    end: endTs,
    body: body,
    name: `OceanDAO Round${roundNumber}`,
    type: voteType,
    start: startTs,
    choices: choices,
    metadata: {
      network: 1,
      strategies: strategy
    },
    snapshot: blockHeight
  }
}

const send = async (url, init) => {
  return new Promise((resolve) => {
    fetch(url, init)
      .then((res) => {
        if (res.ok) return resolve(res.json())
        throw res
      })
      .catch((e) => {
        Logger.error(e)
      })
  })
}

const local_broadcast_proposal = async (
  web3,
  account,
  payload,
  pSpace = null,
  pUrl = null
) => {
  try {
    var msg = {
      address: account.address,
      msg: JSON.stringify({
        version: version,
        timestamp: (Date.now() / 1e3).toFixed(),
        space: pSpace === null ? process.env.SNAPSHOT_SPACE : pSpace,
        type: 'proposal',
        payload
      })
    }

    var encodedMsg = bufferToHex(Buffer.from(msg.msg, 'utf8'))
    msg.sig = await web3.eth.sign(encodedMsg, msg.address)

    const url = pUrl === null ? `${hubUrl}/api/message` : `${pUrl}/api/message`
    const init = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(msg)
    }
    return send(url, init)
  } catch (err) {
    Logger.error('ERROR: Broadcast Proposal: ', err)
  }
}

// 1. Get current block height => https://etherscan.io/blocks
// 2. Get the unix second timestamp in seconds for the target date => https://www.epochconverter.com/
// 3. Get the average block time in seconds => https://bitinfocharts.com/ethereum/
const calcTargetBlockHeight = (
  currentBlockHeight,
  targetUnixTimestamp,
  avgBlockTime
) => {
  const blockNumber = currentBlockHeight
  const targetTimestamp = targetUnixTimestamp
  const curTimestamp = Date.now() / 1000

  return Math.floor(
    blockNumber + (targetTimestamp - curTimestamp) / avgBlockTime
  )
}

module.exports = {
  strategy,
  getVoteCountStrategy,
  getVotesQuery,
  getProposalVotes,
  getProposalVotesGQL,
  getVoterScores,
  reduceVoterScores,
  reduceProposalScores,
  buildGranularProposalPayload,
  buildBatchProposalPayload,
  local_broadcast_proposal,
  calcTargetBlockHeight,
  hasEnoughOceans,
  calculateMatch,
  VoteType,
  BallotType
}
