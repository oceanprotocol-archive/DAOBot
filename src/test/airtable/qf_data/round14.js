const expectedResults = [
  {
    'Project Name': 'RugPullIndex',
    'OCEAN Requested': 7577,
    'OCEAN Granted': 7577,
    'USD Requested': 5000,
    'USD Granted': 5000
  },
  {
    'Project Name': 'DATALATTE',
    'OCEAN Requested': 30308,
    'OCEAN Granted': 4161,
    'USD Requested': 20000,
    'USD Granted': 2746
  },
  {
    'Project Name': 'Data Whale',
    'OCEAN Requested': 28773,
    'OCEAN Granted': 28773,
    'USD Requested': 18987,
    'USD Granted': 18987
  },
  {
    'Project Name': 'Defillama Integration',
    'OCEAN Requested': 2122,
    'OCEAN Granted': 2122,
    'USD Requested': 1400,
    'USD Granted': 1400
  },
  {
    'Project Name': 'Core Tech WG Rewards',
    'OCEAN Requested': 4546,
    'OCEAN Granted': 4546,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'Newsletter for the Spanish Community',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 6395,
    'USD Granted': 0
  },
  {
    'Project Name': 'FELToken',
    'OCEAN Requested': 15154,
    'OCEAN Granted': 4388,
    'USD Requested': 10000,
    'USD Granted': 2896
  },
  {
    'Project Name': 'Walt.id',
    'OCEAN Requested': 30308,
    'OCEAN Granted': 15744,
    'USD Requested': 20000,
    'USD Granted': 10390
  },
  {
    'Project Name': 'Ocean Missions',
    'OCEAN Requested': 7577,
    'OCEAN Granted': 3325,
    'USD Requested': 5000,
    'USD Granted': 2194
  },
  {
    'Project Name': 'VORN',
    'OCEAN Requested': 15154,
    'OCEAN Granted': 1984,
    'USD Requested': 10000,
    'USD Granted': 1309
  },
  {
    'Project Name': 'LYNX',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 14825,
    'USD Granted': 0
  },
  {
    'Project Name': 'Comments & Ratings integration',
    'OCEAN Requested': 3788,
    'OCEAN Granted': 3788,
    'USD Requested': 2500,
    'USD Granted': 2500
  },
  {
    'Project Name': 'VideoWiki',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 15000,
    'USD Granted': 0
  },
  {
    'Project Name': 'OceanDAO Analytics',
    'OCEAN Requested': 14396,
    'OCEAN Granted': 2481,
    'USD Requested': 9500,
    'USD Granted': 1637
  },
  {
    'Project Name': 'Decentralized Grant Orchestration Tool',
    'OCEAN Requested': 4546,
    'OCEAN Granted': 4546,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'Coral Market',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 20000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Cloutcoin',
    'OCEAN Requested': 4546,
    'OCEAN Granted': 4546,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'Evotegra',
    'OCEAN Requested': 14396,
    'OCEAN Granted': 4001,
    'USD Requested': 9500,
    'USD Granted': 2640
  },
  {
    'Project Name': 'DataX',
    'OCEAN Requested': 28413,
    'OCEAN Granted': 28413,
    'USD Requested': 18750,
    'USD Granted': 18750
  },
  {
    'Project Name': 'Ocean Pearl',
    'OCEAN Requested': 30308,
    'OCEAN Granted': 15070,
    'USD Requested': 20000,
    'USD Granted': 9944
  },
  {
    'Project Name': 'Indian Ocean program',
    'OCEAN Requested': 11214,
    'OCEAN Granted': 1603,
    'USD Requested': 7400,
    'USD Granted': 1058
  },
  {
    'Project Name': 'Ocean Protocol Turkey',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 3000,
    'USD Granted': 0
  },
  {
    'Project Name': 'Rent Smart',
    'OCEAN Requested': 4546,
    'OCEAN Granted': 4546,
    'USD Requested': 3000,
    'USD Granted': 3000
  },
  {
    'Project Name': 'mPowered',
    'OCEAN Requested': 30308,
    'OCEAN Granted': 30308,
    'USD Requested': 20000,
    'USD Granted': 20000
  },
  {
    'Project Name': 'Athena Equity',
    'OCEAN Requested': 0,
    'OCEAN Granted': 0,
    'USD Requested': 9600,
    'USD Granted': 0
  },
  {
    'Project Name': 'Ocean Ambassadors',
    'OCEAN Requested': 30308,
    'OCEAN Granted': 23704,
    'USD Requested': 20000,
    'USD Granted': 15642
  },
  {
    'Project Name': 'Datavest',
    'OCEAN Requested': 4375,
    'OCEAN Granted': 4375,
    'USD Requested': 2887,
    'USD Granted': 2887
  }
]

const proposal_csv = [
  ['RugPullIndex', 'General', 5000, 1472253, 812],
  ['DATALATTE', 'General', 20000, 141102, 812],
  ['Data Whale', 'General', 18987, 3465295, 812],
  ['Defillama Integration', 'New Entrants', 1400, 499586, 145],
  ['Core Tech WG Rewards', 'General', 3000, 635209, 0],
  ['Newsletter for the Spanish Community', 'General', 6395, 20580, 812],
  ['FELToken', 'General', 10000, 148746, 812],
  ['Walt.id', 'General', 20000, 531571, 812],
  ['Ocean Missions', 'General', 5000, 112088, 0],
  ['VORN', 'General', 10000, 67682, 812],
  ['LYNX', 'General', 14825, 252548, 226059],
  ['Comments & Ratings integration', 'Core Tech', 2500, 139867, 812],
  ['VideoWiki', 'General', 15000, 29503, 812],
  ['OceanDAO Analytics', 'General', 9500, 83636, 0],
  ['Decentralized Grant Orchestration Tool', 'New Entrants', 3000, 2544, 812],
  ['Coral Market', 'General', 20000, 6267, 125],
  ['Cloutcoin', 'New Entrants', 3000, 60097, 2917],
  ['Evotegra', 'General', 9500, 135680, 812],
  ['DataX', 'General', 18750, 5108138, 812],
  ['Ocean Pearl', 'General', 20000, 508021, 0],
  ['Indian Ocean program', 'General', 7400, 54036, 0],
  ['Ocean Protocol Turkey', 'General', 3000, 7468, 812],
  ['Rent Smart', 'New Entrants', 3000, 16169, 651],
  ['mPowered', 'Core Tech', 20000, 326043, 0],
  ['Athena Equity', 'General', 9600, 10271, 0],
  ['Ocean Ambassadors', 'General', 20000, 799099, 0],
  ['Datavest', 'New Entrants', 2887, 6727, 2917]
]

const fundingRound = {
  id: 'round_14',
  fields: {
    'OCEAN Price': 0.6599,
    Earmarks:
      '{"New Entrants":{"OCEAN":24000,"USD":15837.6},"New Outreach":{"OCEAN":12000,"USD":7918.8},"Core Tech":{"OCEAN":30000,"USD":19797},"General":{"OCEAN":134000,"USD":88426.6}}',
    'Funding Available OCEAN': 200000,
    'Funding Available USD': 131980,
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
