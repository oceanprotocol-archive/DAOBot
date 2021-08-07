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

module.exports = {getCurrentRound, filterCurrentRound};
