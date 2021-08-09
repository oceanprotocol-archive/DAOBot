const {getRoundsSelectQuery} = require('../airtable_utils')

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
    const nowDateString = new Date(Date.now()).toISOString().split('T')[0]
    const roundParameters = await getRoundsSelectQuery(`AND({Start Date} <= "${nowDateString}", {Voting Ends} >= "${nowDateString}", "true")`)
    return filterCurrentRound(roundParameters)
}

const getWinningProposals = (proposals) => {
    let winners = proposals.filter(p => p.get('Voted Yes') > p.get('Voted No'))
    return winners.sort((a,b) => {return (b.get('Voted Yes') - b.get('Voted No')) - (a.get('Voted Yes') - a.get('Voted No'))})
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

module.exports = {getCurrentRound, filterCurrentRound, getWinningProposals, getDownvotedProposals, calculateWinningProposals, calculateFinalResults};
