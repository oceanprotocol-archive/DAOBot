const Cron = require('croner')
const main = require('./src/airtable/process_project_summary')

// Runs every hour
Cron('0 0 * * * *', async () => {
  await main()
})
