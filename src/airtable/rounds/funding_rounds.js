const moment = require('moment')
const { getRoundsSelectQuery } = require('../airtable_utils')
const Logger = require('../../utils/logger')

// Let's track the state of various proposals
const RoundState = {
  Started: 'Started',
  DueDiligence: 'Due Diligence',
  Voting: 'Voting',
  Ended: 'Ended'
}

const Earmarks = {
  NEW_OUTREACH: 'New Outreach',
  NEW_ENTRANTS: 'New Entrants',
  CORE_TECH: 'Core Tech',
  GENERAL: 'General',
  GRANT_2ND3RD: '2nd/3rd Grant'
}

const getFundingRound = async (roundNum) => {
  try {
    const roundParameters = await getRoundsSelectQuery(
      `{Round} = "${roundNum}"`
    )
    return roundParameters[0]
  } catch (err) {
    Logger.error(err)
  }
}

const completeEarstructuresValues = (curRound, tokenPrice, basisCurrency) => {
  const earmarks = JSON.parse(curRound.get('Earmarks'))
  switch (basisCurrency) {
    case 'USD':
      for (const earmark in earmarks) {
        earmarks[earmark].OCEAN = parseFloat(
          Number.parseFloat(earmarks[earmark].USD / tokenPrice).toFixed(3)
        )
      }
      break
    case 'OCEAN':
      for (const earmark in earmarks) {
        earmarks[earmark].USD = parseFloat(
          Number.parseFloat(earmarks[earmark].OCEAN * tokenPrice).toFixed(3)
        )
      }
      break
    default:
      Logger.log('Basis currency value is wrong')
  }
  return earmarks
}

const filterCurrentRound = (roundsArr) => {
  try {
    const timeNow = new Date(Date.now()).getTime()
    const currentRound = roundsArr.filter(function (round) {
      const startDate = new Date(round.get('Start Date'))
      const endDate = new Date(round.get('Voting Ends'))
      return startDate.getTime() < timeNow && timeNow < endDate.getTime()
    })
    return currentRound[0]
  } catch (err) {
    Logger.error(err)
  }
}

const getCurrentRound = async () => {
  const nowDateString = moment().utc().toISOString()
  const roundParameters = await getRoundsSelectQuery(
    `AND({Start Date} <= "${nowDateString}", {Voting Ends} >= "${nowDateString}", "true")`
  )
  return roundParameters[0]
}

const getWinningProposals = (proposals, curFundingRound) => {
  const winners = proposals.filter(
    (p) => p.get('Voted Yes') > p.get('Voted No')
  )

  // TODO - RA: Improve strategy/count configurations/versioning per funding round
  if (curFundingRound <= 8) {
    // This is the winner Y/N ranking sort formula for R8 and before
    return winners.sort((a, b) => {
      return b.get('Voted Yes') - a.get('Voted Yes')
    })
  } else {
    // This is the winner Y/N ranking sort formula for R9 and onwards
    return winners.sort((a, b) => {
      return (
        b.get('Voted Yes') -
        b.get('Voted No') -
        (a.get('Voted Yes') - a.get('Voted No'))
      )
    })
  }
}

const getDownvotedProposals = (proposals) => {
  const downvotedProposals = proposals.filter(
    (p) => p.get('Voted Yes') <= p.get('Voted No')
  )
  downvotedProposals.map((p) => {
    p.fields['OCEAN Requested'] = 0
    p.fields['USD Granted'] = 0
    p.fields['OCEAN Granted'] = 0
    p.fields['Proposal State'] = 'Down Voted'
  })
  return downvotedProposals
}
const calculateWinningProposalsForEarmark = (
  proposals,
  fundsAvailableUSD,
  oceanPrice,
  earmark = ''
) => {
  proposals.sort((a, b) =>
    a.get('Voted Yes') - a.get('Voted No') <
    b.get('Voted Yes') - b.get('Voted No')
      ? 1
      : -1
  ) // Sort by Y/N ranking - highest to lowest

  const basisCurrency = proposals[0].get('Basis Currency')

  const totalPool =
    basisCurrency === 'USD' ? fundsAvailableUSD : fundsAvailableUSD / oceanPrice

  proposals.map((x) => {
    x.fields.weight = x.get('Voted Yes') - x.get('Voted No')
    x.fields.maxFund =
      x.get('Basis Currency') === 'USD'
        ? x.get('USD Requested')
        : x.get('USD Requested') / oceanPrice

    x.fields.funded = 0

    x.fields.totalFund =
      (x.get('Basis Currency') === 'USD'
        ? x.get('USD Granted')
        : x.get('OCEAN Granted')) ?? 0

    x.isFunded = () => x.fields.maxFund === x.fields.totalFund + x.fields.funded
    x.fundAmount = () => x.fields.funded + x.fields.totalFund
  })

  const maxTries = 100000
  let tries = 0
  while (proposals.reduce((a, b) => a + b.fields.funded, 0) < totalPool) {
    tries++
    if (tries > maxTries) {
      break
    }
    const projectsWithoutFunding = proposals.filter((x) => !x.isFunded())
    if (projectsWithoutFunding.length === 0) break
    const sumWeights = projectsWithoutFunding.reduce(
      (a, b) => a + b.fields.weight,
      0
    )
    const fundedTillNow = proposals.reduce((a, b) => a + b.fields.funded, 0)
    const multiplierOcean = (totalPool - fundedTillNow) / sumWeights

    let funded = 0
    proposals.map((x) => {
      if (
        x.fields.weight * multiplierOcean + x.fundAmount() >=
          x.fields.maxFund &&
        !x.isFunded()
      ) {
        x.fields.funded = x.fields.maxFund - x.fields.totalFund
        funded++
      }
    })
    if (!proposals.some((x) => !x.isFunded())) break // If all projects are funded, break && jit, this might be redundant
    if (funded === 0) {
      // One last time
      const projectsWithoutFundingAndNotGranted = proposals.filter(
        (x) => !x.isFunded()
      )

      const sumWeights = projectsWithoutFundingAndNotGranted.reduce(
        (a, b) => a + b.fields.weight,
        0
      )
      const fundedTillNow = proposals.reduce((a, b) => a + b.fields.funded, 0)
      const multiplierOceanNew = (totalPool - fundedTillNow) / sumWeights

      proposals.map((x) => {
        if (!x.isFunded()) {
          x.fields.funded = Math.min(
            x.fields.maxFund - x.fundAmount(),
            x.fields.weight * multiplierOceanNew
          )
        }
      })
      break
    }
  }

  const winningProposals = proposals.filter((x) => x.isFunded())

  const fundsLeft =
    totalPool - proposals.reduce((a, b) => a + b.fields.funded, 0)

  for (const p of proposals) {
    p.fields['USD Requested'] = p.get('USD Requested')
    p.fields['OCEAN Requested'] = p.get('USD Requested') / oceanPrice
    if (basisCurrency === 'USD') {
      p.fields['USD Granted'] = p.fundAmount()
      p.fields['OCEAN Granted'] = p.fundAmount() / oceanPrice
    } else {
      p.fields['USD Granted'] = p.fundAmount() * oceanPrice
      p.fields['OCEAN Granted'] = p.fundAmount()
    }
    p.fields['Proposal State'] = 'Granted'

    console.log(
      `${p.get('Project Name')},${p.fields.funded * oceanPrice},${
        p.fields.totalFund * oceanPrice
      },${p.fields.maxFund * oceanPrice},${earmark}`
    )

    delete p.fields.funded
    delete p.fields.weight
    delete p.fields.maxFund
    delete p.fields.totalFund
    delete p.isFunded
    delete p.fundAmount
  }

  const fundsLeftUsd =
    basisCurrency === 'USD' ? fundsLeft : fundsLeft * oceanPrice
  const fundsLeftOcean =
    basisCurrency === 'USD' ? fundsLeft / oceanPrice : fundsLeft
  return {
    winningProposals: winningProposals,
    fundsLeft: fundsLeftUsd,
    fundsLeftOcean: fundsLeftOcean
  }
}
// Top level function
const calculateWinningAllProposals = (proposals, fundingRound, oceanPrice) => {
  const earmarksJson = JSON.parse(fundingRound.get('Earmarks'))
    ? JSON.parse(fundingRound.get('Earmarks'))
    : {}
  const fundsLeftAction = fundingRound.get('Funds Left')
  const allWinningProposals = [] // every proposal that won funding
  const earmarkedWinnerIds = [] // every proposal that won, indexed by proposal_id
  const resultsByEarmark = {} // all winning proposals, indexed by earmark
  const earmarks = []
  let fundsLeft = 0 // cache - tracks how much funds are left over to be burned/assigned to general
  let fundsLeftOcean = 0 // cache - tracks how much funds are left over to be burned/assigned to general
  let fundsRecycled = 0 // summary - total funds recycled
  let fundsRecycledOcean = 0 // summary - total funds recycled

  // iterate over all earmerks
  for (const earmark in earmarksJson) {
    let currentUsdEarmarked = 0 // how much USD is set aside for this earmark

    earmarks.push(earmark)

    // get all the proposals for this earmark
    let earmarkProposals = proposals.filter(
      (proposal) => proposal.get('Earmarks') === earmark
    )

    // if general category,
    if (earmark === 'General') {
      // retrieve all proposals that were not funded and append to the proposals in this earmark
      const earmarkedProposalNotFunded = proposals.filter(
        (p) =>
          earmarkedWinnerIds.lastIndexOf(p.id) === -1 &&
          p.get('Earmarks') !== earmark
      )
      earmarkProposals = earmarkProposals.concat(earmarkedProposalNotFunded)

      // if funds are to be recycled, let's then take whatever fundsLeft and add
      if (fundsLeftAction === 'Recycle') {
        currentUsdEarmarked = earmarksJson[earmark].USD + fundsLeft
        fundsLeft = 0
        fundsLeftOcean = 0
      } else {
        currentUsdEarmarked = earmarksJson[earmark].USD
      }
    } else {
      currentUsdEarmarked = earmarksJson[earmark].USD
    }

    // if we don't have any proposals inside of this earmark
    if (earmarkProposals.length === 0) {
      fundsLeft += earmarksJson[earmark].USD
      fundsLeftOcean += earmarksJson[earmark].USD / oceanPrice
      fundsRecycled += earmarksJson[earmark].USD
      fundsRecycledOcean += earmarksJson[earmark].USD / oceanPrice
      resultsByEarmark[earmark] = {
        winningProposals: [],
        fundsLeft: earmarksJson[earmark].USD,
        fundsLeftOcean: earmarksJson[earmark].USD / oceanPrice,
        fundsRecycledOcean: earmarksJson[earmark].USD / oceanPrice
      }
    } else {
      const winningProposals = calculateWinningProposalsForEarmark(
        earmarkProposals,
        currentUsdEarmarked,
        oceanPrice,
        earmark
      )
      resultsByEarmark[earmark] = winningProposals
      winningProposals.winningProposals.forEach((proposal) => {
        allWinningProposals.push(proposal)
      })
      fundsLeft += winningProposals.fundsLeft
      fundsLeftOcean += winningProposals.fundsLeftOcean
      fundsRecycled += winningProposals.fundsLeft
      fundsRecycledOcean += winningProposals.fundsLeftOcean
      winningProposals.winningProposals
        .map((x) => x.id)
        .forEach((proposalId) => {
          earmarkedWinnerIds.push(proposalId)
        })
    }
  }

  resultsByEarmark.winnerIds = earmarkedWinnerIds
  resultsByEarmark.usdEarmarked = proposals.reduce(
    (a, b) => a + b.get('USD Granted'),
    0
  )
  resultsByEarmark.earmarks = earmarks
  resultsByEarmark.winningProposals = allWinningProposals
  resultsByEarmark.fundsLeft = fundsLeft
  resultsByEarmark.fundsRecycled = fundsRecycled
  resultsByEarmark.fundsLeftOcean = fundsLeftOcean
  resultsByEarmark.fundsRecycledOcean = fundsRecycledOcean
  const notGrantedProposals = proposals.filter((x) => {
    return x.get('Minimum USD Requested') > x.get('USD Granted')
  })
  if (notGrantedProposals.length === 0) return resultsByEarmark

  const totalUsdReqButMin = notGrantedProposals.reduce(
    (acc, curr) => acc + curr.get('USD Granted'),
    0
  )
  const proposalsNeverGonnaBeFunded = notGrantedProposals.filter(
    (x) =>
      x.get('USD Granted') + totalUsdReqButMin < x.get('Minimum USD Requested')
  )

  const proposalLostWithLeastVotes = notGrantedProposals.reduce((a, b) => {
    return a.fields['Voted Yes'] < b.fields['Voted No'] ? a : b
  })

  if (proposalsNeverGonnaBeFunded.length > 0) {
    console.log(
      'Dropping:',
      proposalsNeverGonnaBeFunded.map((x) => {
        console.log(
          x.get('Project Name'),
          x.get('USD Granted'),
          x.get('Minimum USD Requested')
        )
      })
    )
    proposalsNeverGonnaBeFunded.forEach((proposal) => {
      proposal.fields['USD Granted'] = 0
      proposal.fields['OCEAN Granted'] = 0
      proposal.fields['Proposal State'] = 'Not Granted'
    })

    proposals = proposals.filter(
      (x) =>
        proposalsNeverGonnaBeFunded.map((z) => z.id).includes(x.id) === false
    )
  } else {
    console.log('Dropping:', proposalLostWithLeastVotes.get('Project Name'))
    proposalLostWithLeastVotes.fields['USD Granted'] = 0
    proposalLostWithLeastVotes.fields['OCEAN Granted'] = 0
    proposalLostWithLeastVotes.fields['Proposal State'] = 'Not Granted'

    proposals = proposals.filter((x) => x.id !== proposalLostWithLeastVotes.id)
  }
  proposals.forEach((proposal) => {
    proposal.fields['USD Granted'] = 0
    proposal.fields['OCEAN Granted'] = 0
    proposal.fields['Proposal State'] = 'Not Granted'
  })
  return calculateWinningAllProposals(proposals, fundingRound, oceanPrice)
}

const calculateFinalResults = (proposals, fundingRound) => {
  let resultsByEarmark = {}
  const oceanPrice = fundingRound.get('OCEAN Price')

  resultsByEarmark = calculateWinningAllProposals(
    proposals,
    fundingRound,
    oceanPrice
  )

  const remainder = proposals.filter(
    (p) => resultsByEarmark.winnerIds.lastIndexOf(p.id) === -1
  )
  const partiallyFunded = remainder.filter((p) => p.get('USD Granted') > 0)
  const notFunded = remainder.filter(
    (p) => p.get('USD Granted') === undefined || p.get('USD Granted') === 0
  )
  notFunded.map((p) => {
    p.fields['OCEAN Requested'] = 0
    p.fields['USD Granted'] = 0
    p.fields['OCEAN Granted'] = 0
    p.fields['Proposal State'] = 'Not Granted'
  })

  return {
    resultsByEarmark: resultsByEarmark,
    partiallyFunded: partiallyFunded,
    notFunded: notFunded
  }
}

const dumpResultsToGSheet = async (results) => {
  // Flatten proposals into gsheet dump
  var flatObj = Object.entries(results).map((res) => {
    try {
      const proposal = res[1]
      const pctYes =
        proposal.get('Voted Yes') /
        (proposal.get('Voted Yes') + proposal.get('Voted No'))
      const greaterThan50Yes = pctYes >= 0.5
      return [
        proposal.get('Project Name'),
        proposal.get('Earmarks'),
        proposal.get('Voted Yes'),
        proposal.get('Voted No'),
        pctYes,
        greaterThan50Yes,
        proposal.get('USD Requested'),
        proposal.get('OCEAN Requested'),
        proposal.get('OCEAN Granted')
      ]
    } catch (err) {
      Logger.error(err)
    }
  })

  // Dump flattened data from snapshot to sheet
  flatObj.splice(0, 0, [
    'Project Name',
    'Earmarks',
    'Yes Votes',
    'No Votes',
    'Pct Yes',
    '>50% Yes?',
    'USD Requested',
    'OCEAN Requested',
    'OCEAN Granted'
  ])
  return flatObj
}

module.exports = {
  RoundState,
  getFundingRound,
  getCurrentRound,
  filterCurrentRound,
  getWinningProposals,
  getDownvotedProposals,
  calculateWinningProposalsForEarmark,
  calculateWinningAllProposals,
  calculateFinalResults,
  dumpResultsToGSheet,
  completeEarstructuresValues,
  Earmarks
}
