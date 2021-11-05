const moment = require('moment')
const {getRoundsSelectQuery} = require('../airtable_utils')

// Let's track the state of various proposals
const RoundState = {
    Started: 'Started',
    DueDiligence: 'Due Diligence',
    Voting: 'Voting',
    Ended: 'Ended',
};

const Earmarks = {
    NEW_OUTREACH: 'New Outreach',
    NEW_GENERAL: 'New General',
    CORE_TECH: 'Core Tech',
    GENERAL: 'General'
} 

const getFundingRound = async (roundNum) => {
    try {
        const roundParameters = await getRoundsSelectQuery(`{Round} = "${roundNum}"`)
        return roundParameters[0]
    } catch(err) {
        console.log(err)
    }
}

const completeEarstructuresValues = (curRound, tokenPrice, basisCurrency) => {
    let earmarks = JSON.parse(curRound.get('Earmarks'))
    switch(basisCurrency){
        case 'USD':
            for(let earmark in earmarks){
                earmarks[earmark]['OCEAN'] = parseFloat(Number.parseFloat(earmarks[earmark]['USD'] / tokenPrice).toFixed(3))
            }
            break
        case 'OCEAN':
            for(let earmark in earmarks){
                earmarks[earmark]['USD'] = parseFloat(Number.parseFloat(earmarks[earmark]['OCEAN'] * tokenPrice).toFixed(3))
            }
            break
        default:
            console.log('Basis currency value is wrong')
    }
    return earmarks
}

const filterCurrentRound = (roundsArr) => {
    try {
        let timeNow = new Date(Date.now()).getTime()
        let currentRound = roundsArr.filter(function (round) {
            let startDate = new Date(round.get('Start Date'))
            let endDate = new Date(round.get('Voting Ends'))
            return startDate.getTime() < timeNow && timeNow < endDate.getTime()
        })
        return currentRound[0]
    } catch(err) {
        console.log(err)
    }
}

const getCurrentRound = async () => {
    let nowDateString = moment().utc().toISOString()
    const roundParameters = await getRoundsSelectQuery(`AND({Start Date} <= "${nowDateString}", {Voting Ends} >= "${nowDateString}", "true")`)
    return roundParameters[0]
}

const getWinningProposals = (proposals, curFundingRound) => {
    let winners = proposals.filter(p => p.get('Voted Yes') > p.get('Voted No'))

    // TODO - RA: Improve strategy/count configurations/versioning per funding round
    if( curFundingRound <= 8 ) {
        // This is the winner Y/N ranking sort formula for R8 and before
        return winners.sort((a, b) => {return b.get('Voted Yes') - a.get('Voted Yes')})
    } else {
        // This is the winner Y/N ranking sort formula for R9 and onwards
        return winners.sort((a, b) => {return (b.get('Voted Yes') - b.get('Voted No')) - (a.get('Voted Yes') - a.get('Voted No'))})
    }
}

const getDownvotedProposals = (proposals) => {
    let downvotedProposals = proposals.filter(p => p.get('Voted Yes') < p.get('Voted No'))
    downvotedProposals.map(p => {
        p.fields['OCEAN Requested'] = 0
        p.fields['USD Granted'] = 0
        p.fields['OCEAN Granted'] = 0
        p.fields['Proposal State'] = 'Down Voted'
    })
    return downvotedProposals
}

const calculateWinningProposalsForEarmark = (proposals, fundsAvailableUSD, oceanPrice) => {
    let winningProposals = []
    let fundsLeft = fundsAvailableUSD
    for (let p of proposals) {
        if( fundsLeft > 0 ) {
            let usdRequested = p.get('USD Requested')
            let grantCarry = p.get('USD Granted') || 0
            let usdGranted = fundsLeft - ( usdRequested - grantCarry ) > 0 ? usdRequested - grantCarry : fundsLeft

            p.fields['OCEAN Requested'] = Math.round( usdRequested / oceanPrice)
            p.fields['USD Granted'] = usdGranted + grantCarry
            p.fields['OCEAN Granted'] = Math.round( (usdGranted + grantCarry ) / oceanPrice)
            p.fields['Proposal State'] = 'Granted'
            fundsLeft -= usdGranted

            // If we reached the total, then it won via this grant pot
            if (usdRequested === (usdGranted + grantCarry))
                winningProposals.push(p)
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
    const earmarksJson = JSON.parse(fundingRound.get('Earmarks')) ? JSON.parse(fundingRound.get('Earmarks')) : {}
    let earmarkedWinnerIds = []
    let earmarkedResults = {}
    let fundsLeft = 0
    let allWinningProposals = []
    let usdEarmarked = 0

    for (const earmark in earmarksJson){
        let earmarkProposals = proposals.filter(proposal => proposal.get('Earmarks') === earmark)
        let currentUsdEarmarked = earmarksJson[earmark]['USD']
        if(earmarkProposals.length === 0) {
            earmarkedResults[earmark] = []
            usdEarmarked+=currentUsdEarmarked
            fundsLeft += earmarksJson[earmark]['USD']
            continue
        }
        let winningProposals = calculateWinningProposalsForEarmark(earmarkProposals, currentUsdEarmarked, oceanPrice)
        usdEarmarked+=currentUsdEarmarked
        earmarkedResults[earmark] = winningProposals
        winningProposals.winningProposals.forEach((proposal) => {
            allWinningProposals.push(proposal)
        })
        fundsLeft += winningProposals.fundsLeft
        winningProposals.winningProposals.map(x => x['id']).forEach((proposalId) => {
            earmarkedWinnerIds.push(proposalId)
        })
    }

    earmarkedResults['winnerIds'] = earmarkedWinnerIds
    earmarkedResults['usdEarmarked'] = usdEarmarked
    earmarkedResults['winningProposals'] = allWinningProposals
    earmarkedResults['fundsLeft'] = fundsLeft
    return earmarkedResults
}

const calculateFinalResults = (proposals, fundingRound) => {
    let earmarkedResults = {}
    oceanPrice = fundingRound.get('OCEAN Price')

    earmarkedResults = calculateWinningAllProposals(proposals, fundingRound, oceanPrice)
    let usdEarmarked = earmarkedResults.usdEarmarked

    let general = proposals.filter(p => earmarkedResults.winnerIds.lastIndexOf(p['id']) === -1 )

    let usdGeneral = fundingRound.get('Funding Available USD') - usdEarmarked
    let generalResults = calculateWinningProposalsForEarmark(general, usdGeneral, oceanPrice)
    let generalWinnerIds = generalResults.winningProposals.map(x => x['id'])

    let remainder = general.filter(p => generalWinnerIds.lastIndexOf(p['id']) === -1 )
    let partiallyFunded = remainder.filter(p => p.get('USD Granted') > 0)
    let notFunded = remainder.filter(p => p.get('USD Granted') === undefined || p.get('USD Granted') === 0)
    notFunded.map(p => {
        p.fields['OCEAN Requested'] = 0
        p.fields['USD Granted'] = 0
        p.fields['OCEAN Granted'] = 0
        p.fields['Proposal State'] = 'Not Granted'
    })

    return {
        earmarkedResults: earmarkedResults,
        partiallyFunded: partiallyFunded,
        generalResults: generalResults,
        notFunded: notFunded,
    }
}

const dumpResultsToGSheet = async (results) => {
    // Flatten proposals into gsheet dump
    var flatObj = Object.entries(results).map((res) => {
        try {
            let proposal = res[1]
            let pctYes = proposal.get('Voted Yes') / (proposal.get('Voted Yes') + proposal.get('Voted No'))
            let greaterThan50Yes = pctYes >= 0.50
            return [
                proposal.get('Project Name'),
                proposal.get('Voted Yes'),
                proposal.get('Voted No'),
                pctYes,
                greaterThan50Yes,
                proposal.get('USD Requested'),
                proposal.get('OCEAN Requested'),
                proposal.get('OCEAN Granted'),
            ]
        } catch(err) {
            console.log(err)
        }
    })

    // Dump flattened data from snapshot to sheet
    flatObj.splice(0,0, ['Project Name','Yes Votes','No Votes','Pct Yes','>50% Yes?','USD Requested','OCEAN Requested','OCEAN Granted'])
    return flatObj
}

module.exports = {RoundState, getFundingRound, getCurrentRound, filterCurrentRound, getWinningProposals, getDownvotedProposals, calculateWinningProposalsForEarmark, calculateWinningAllProposals, calculateFinalResults, dumpResultsToGSheet, completeEarstructuresValues, Earmarks};
