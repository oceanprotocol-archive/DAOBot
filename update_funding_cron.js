const Cron = require('croner')
const updateFundingRound = require('./src/scripts/update_funding_round')
let updating = false
// runs every 5 minutes
Cron('0 */5 * * * *', async () => {
  if (updating) return
  updating = true

  console.log('updating.')
  await updateFundingRound()
  updating = false
})

// runs every hour
