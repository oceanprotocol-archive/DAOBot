const expectedResults = [
  {
    'Project Name': 'Ocean is NEAR',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 7063,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'FELToken',
    'OCEAN Requested': 23543,
    'OCEAN Granted': 12447,
    'USD Requested': 10000,
    'USD Granted': 5287
  },
  {
    'Project Name': 'Newsletter for the Spanish Community',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 6209,
    'USD Granted': 0
  },
  {
    'Project Name': 'Ocean South Africa',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'DeadmanDAO Web3 Hacker Network',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Knowan',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 7063,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'Data Whale',
    'OCEAN Requested': 23225,
    'OCEAN Granted': 23225,
    'USD Requested': 9865,
    'USD Granted': 9865
  },
  {
    'Project Name': 'DATALATTE',
    'OCEAN Requested': 47087,
    'OCEAN Granted': 10197,
    'USD Requested': 20000,
    'USD Granted': 4331
  },
  {
    'Project Name': 'ExamGuide',
    'OCEAN Requested': 6592,
    'OCEAN Granted': 6592,
    'USD Requested': 2800,
    'USD Granted': 2800
  },
  {
    'Project Name': 'WeDataNation',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 7063,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'Walt.id',
    'OCEAN Requested': 31313,
    'OCEAN Granted': 8219,
    'USD Requested': 13300,
    'USD Granted': 3491
  },
  {
    'Project Name': 'Dev4Block',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 7063,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'OceanProtocol Non-Custodial Loan Infrastructure',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 2870,
    'USD Granted': 0
  },
  {
    'Project Name': 'nCight',
    'OCEAN Requested': 21295,
    'OCEAN Granted': 5234,
    'USD Requested': 9045,
    'USD Granted': 2223
  },
  {
    'Project Name': 'Autobots',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'DAO Contributor Health Assessment Development',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 4629,
    'USD Requested': 3000,
    'USD Granted': 1966
  },
  {
    'Project Name': 'Datatera',
    'OCEAN Requested': 7063,
    'OCEAN Granted': 3731,
    'USD Requested': 3000,
    'USD Granted': 1585
  },
  {
    'Project Name': 'Onboard - web3, in your hands',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'PGWG Rewards',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'VORN',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 10000,
    'USD Granted': 0
  },
  {
    'Project Name': 'VideoWiki',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 20000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Data Onshore',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 12000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Ocean Pearl',
    'OCEAN Requested': 47087,
    'OCEAN Granted': 22796,
    'USD Requested': 20000,
    'USD Granted': 9683
  },
  {
    'Project Name': 'FitCoral',
    'OCEAN Requested': 14126,
    'OCEAN Granted': 10563,
    'USD Requested': 6000,
    'USD Granted': 4487
  },
  {
    'Project Name': 'Algovera',
    'OCEAN Requested': 47087,
    'OCEAN Granted': 47087,
    'USD Requested': 20000,
    'USD Granted': 20000
  },
  {
    'Project Name': 'Posthuman AI',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 12000,
    'USD Granted': 0
  },
  {
    'Project Name': 'DataX',
    'OCEAN Requested': 44615,
    'OCEAN Granted': 43490,
    'USD Requested': 18950,
    'USD Granted': 18472
  },
  {
    'Project Name': 'OCEAN DIGEST',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 2500,
    'USD Granted': 0
  },
  {
    'Project Name': 'Ocean Missions',
    'OCEAN Requested': 18065,
    'OCEAN Granted': 8539,
    'USD Requested': 7673,
    'USD Granted': 3627
  },
  {
    'Project Name': 'Athena Equity',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 10000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Xdata',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  }
]
const proposal_csv = [
  ['Ocean is NEAR', 'New Entrants', 3000, 62504, 0],
  ['FELToken', 'General', 10000, 291673, 0],
  ['Newsletter for the Spanish Community', 'General', 6209, 660, 0],
  ['Ocean South Africa', 'New Outreach', 3000, 923, 65],
  ['DeadmanDAO Web3 Hacker Network', 'New Entrants', 3000, 357, 0],
  ['Knowan', 'New Outreach', 3000, 11918, 0],
  ['Data Whale', 'General', 9865, 997046, 0],
  ['DATALATTE', 'General', 20000, 238949, 0],
  ['ExamGuide', 'New Entrants', 2800, 12995, 0],
  ['WeDataNation', 'New Entrants', 3000, 23260, 0],
  ['Walt.id', 'General', 13300, 192593, 0],
  ['Dev4Block', 'New Outreach', 3000, 7682, 0],
  [
    'OceanProtocol Non-Custodial Loan Infrastructure',
    'New Entrants',
    2870,
    100,
    52
  ],
  ['nCight', 'General', 9045, 122639, 0],
  ['Autobots', 'New Entrants', 3000, 1270, 2928],
  [
    'DAO Contributor Health Assessment Development',
    'New Entrants',
    3000,
    8672,
    0
  ],
  ['Datatera', 'New Entrants', 3000, 6989, 0],
  ['Onboard - web3, in your hands', 'New Outreach', 3000, 109, 0],
  ['PGWG Rewards', 'General', 3000, 31282, 0],
  ['VORN', 'General', 10000, 10408, 0],
  ['VideoWiki', 'General', 20000, 20495, 65],
  ['Data Onshore', 'General', 12000, 476, 0],
  ['Ocean Pearl', 'General', 20000, 534186, 0],
  ['FitCoral', 'General', 6000, 247525, 0],
  ['Algovera', 'Core Tech', 20000, 1342314, 0],
  ['Posthuman AI', 'General', 12000, 13278, 526],
  ['DataX', 'General', 18950, 1019093, 0],
  ['OCEAN DIGEST', 'New Outreach', 2500, 2360, 0],
  ['Ocean Missions', 'General', 7673, 200085, 0],
  ['Athena Equity', 'General', 10000, 11216, 0],
  ['Xdata', 'New Entrants', 3000, 48, 4690]
]

const fundingRound = {
  id: 'round_15',
  fields: {
    'OCEAN Price': 0.4247495,
    Earmarks:
      '{"New Entrants":{"OCEAN":28200,"USD":11977.935},"New Outreach":{"OCEAN":14100,"USD":5988.967},"Core Tech":{"OCEAN":35250,"USD":14972.418},"General":{"OCEAN":157450,"USD":66876.802}}',
    'Funding Available OCEAN': 235000,
    'Funding Available USD': 99816,
    'Basis Token': 'OCEAN',
    'Funds Left': 'Recycle'
  },
  get: function (key) {
    return this.fields[key]
  }
}

module.exports = {
  proposal_csv,
  expectedResults,
  fundingRound
}
