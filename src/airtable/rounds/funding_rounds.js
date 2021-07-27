const getCurrentRound = (fundingRounds) => {
    try {
        let timeNow = new Date(Date.now()).getTime()
        let currentRound = fundingRounds.filter(function (round) {
            let startDate = new Date(round.get('Start Date'))
            let endDate = new Date(round.get('Voting Ends'))
            return startDate.getTime() < timeNow && timeNow < endDate.getTime()
        })
        return currentRound[0]
    } catch(err) {
        console.log(err)
    }
}

module.exports = {getCurrentRound};
