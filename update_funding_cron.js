const Cron = require('croner')
const updateFundingRound = require('./src/scripts/update_funding_round')
let updating = false
// runs every 5 minutes
Cron('0 */5 * * * *', async () => {
  if (updating) return
  updating = true

  console.log('updating.')
  try {
    await updateFundingRound()
  } catch (err) {
    console.error('An error occurred while updating funding rounds:', err)
  }
  updating = false
})

// runs every hour
