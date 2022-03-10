const Cron = require('croner')
const updateFundingRound = require('./src/scripts/update_funding_round')
const { deleteAll, processAll } = require('./src/airtable/project_summary')

let updating = false
// runs every 5 minutes
Cron('0 * * * * *', async () => {
  if (updating) return
  updating = true

  console.log('updating.')
  await updateFundingRound()
  updating = false
})

// runs every hour
Cron('0 0 * * * *', async () => {
  await deleteAll()
  await processAll()
})
