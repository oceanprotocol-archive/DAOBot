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
  NEW_GENERAL: 'New General',
  CORE_TECH: 'Core Tech',
  GENERAL: 'General'
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
    (p) => p.get('Voted Yes') < p.get('Voted No')
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
  oceanPrice
) => {
  const winningProposals = []
  let fundsLeft = fundsAvailableUSD
  for (const p of proposals) {
    if (fundsLeft > 0) {
      let usdRequested = 0
      let oceanRequested = 0
      const basisCurrency = p.get('Basis Currency')
      if (basisCurrency === 'OCEAN') {
        usdRequested = p.get('OCEAN Requested') * oceanPrice
        oceanRequested = p.get('OCEAN Requested')
      } else {
        usdRequested = p.get('USD Requested')
        oceanRequested = Math.ceil(usdRequested / oceanPrice)
      }

      const grantCarry = p.get('USD Granted') || 0
      let usdGranted =
        fundsLeft - (usdRequested - grantCarry) > 0
          ? usdRequested - grantCarry
          : fundsLeft
      const oceanGranted = Math.ceil((usdGranted + grantCarry) / oceanPrice)
      usdGranted = oceanGranted * oceanPrice

      p.fields['OCEAN Requested'] = oceanRequested
      p.fields['USD Requested'] = usdRequested
      p.fields['USD Granted'] = usdGranted + grantCarry
      p.fields['OCEAN Granted'] = oceanGranted
      p.fields['Proposal State'] = 'Granted'
      fundsLeft -= usdGranted

      // If we reached the total, then it won via this grant pot
      if (usdRequested <= usdGranted + grantCarry) winningProposals.push(p)
    } else {
      break
    }
  }

  return {
    winningProposals: winningProposals,
    fundsLeft: fundsLeft
  }
}

const calculateWinningAllProposals = (proposals, fundingRound, oceanPrice) => {
  const earmarksJson = JSON.parse(fundingRound.get('Earmarks'))
    ? JSON.parse(fundingRound.get('Earmarks'))
    : {}
  const fundsLeftAction = fundingRound.get('Funds Left')  
  const earmarkedWinnerIds = []
  let currentUsdEarmarked = 0
  const earmarkedResults = {}
  let fundsLeft = 0
  const allWinningProposals = []
  let usdEarmarked = 0

  for (const earmark in earmarksJson) {
    let earmarkProposals = proposals.filter(
      (proposal) => proposal.get('Earmarks') === earmark
    )
    if(earmark === 'General'){
      let earmarkedProposalNotFunded = proposals.filter((p) => earmarkedWinnerIds.lastIndexOf(p.id) === -1 && p.get('Earmarks') !== earmark)
      earmarkProposals = earmarkProposals.concat(earmarkedProposalNotFunded)
      if(fundsLeftAction === 'Recycle'){
        currentUsdEarmarked = earmarksJson[earmark].USD + fundsLeft
        fundsLeft = 0
      }else{
        currentUsdEarmarked = earmarksJson[earmark].USD
      }
    }else{
      currentUsdEarmarked = earmarksJson[earmark].USD
    }

    if (earmarkProposals.length === 0) {
      earmarkedResults[earmark] = []
      usdEarmarked += currentUsdEarmarked
      fundsLeft += earmarksJson[earmark].USD
      continue
    }
    const winningProposals = calculateWinningProposalsForEarmark(
      earmarkProposals,
      currentUsdEarmarked,
      oceanPrice
    )
    earmarkedResults[earmark] = winningProposals
    winningProposals.winningProposals.forEach((proposal) => {
      allWinningProposals.push(proposal)
    })
    fundsLeft += winningProposals.fundsLeft
    usdEarmarked += currentUsdEarmarked - fundsLeft
    winningProposals.winningProposals
      .map((x) => x.id)
      .forEach((proposalId) => {
        earmarkedWinnerIds.push(proposalId)
      })
  }

  earmarkedResults.winnerIds = earmarkedWinnerIds
  earmarkedResults.usdEarmarked = usdEarmarked
  earmarkedResults.winningProposals = allWinningProposals
  earmarkedResults.fundsLeft = fundsLeft
  return earmarkedResults
}

const calculateFinalResults = (proposals, fundingRound) => {
  let earmarkedResults = {}
  const oceanPrice = fundingRound.get('OCEAN Price')

  earmarkedResults = calculateWinningAllProposals(
    proposals,
    fundingRound,
    oceanPrice
  )

  const remainder = proposals.filter(
    (p) => earmarkedResults.winnerIds.lastIndexOf(p.id) === -1
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
    earmarkedResults: earmarkedResults,
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
