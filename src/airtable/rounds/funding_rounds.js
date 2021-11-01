const moment = require('moment')
const {getRoundsSelectQuery} = require('../airtable_utils')

// Let's track the state of various proposals
const RoundState = {
    Started: 'Started',
    DueDiligence: 'Due Diligence',
    Voting: 'Voting',
    Ended: 'Ended',
};

const getFundingRound = async (roundNum) => {
    try {
        const roundParameters = await getRoundsSelectQuery(`{Round} = "${roundNum}"`)
        return roundParameters[0]
    } catch(err) {
        console.log(err)
    }
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

const calculateWinningProposals = (proposals, fundsAvailableUSD, oceanPrice) => {
    let winningProposals = []
    let fundsLeft = fundsAvailableUSD
    for(let p of proposals) {
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

const calculateFinalResults = (proposals, fundingRound) => {
    let oceanPrice = fundingRound.get('OCEAN Price')

    let earmarks = proposals.filter(p => p.get('Earmarks') !== undefined)
    let usdEarmarked = fundingRound.get('Earmarked USD')
    let earmarkedResults = calculateWinningProposals(earmarks, usdEarmarked, oceanPrice)
    let earmarkedWinnerIds = earmarkedResults.winningProposals.map(x => x['id'])

    let general = proposals.filter(p => earmarkedWinnerIds.lastIndexOf(p['id']) === -1 )
    let usdGeneral = fundingRound.get('Funding Available USD') - usdEarmarked
    let generalResults = calculateWinningProposals(general, usdGeneral, oceanPrice)
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
        generalResults: generalResults,
        partiallyFunded: partiallyFunded,
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

module.exports = {RoundState, getFundingRound, getCurrentRound, filterCurrentRound, getWinningProposals, getDownvotedProposals, calculateWinningProposals, calculateFinalResults, dumpResultsToGSheet};
