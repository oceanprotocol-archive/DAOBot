# OceanDAO Bot

This bot pipes data from a few different sources, so we can efficiently report DAO-Related informaiton.
- Make sure you have `node` and `npm`
- `npm install`
- Create a `.env` file with the following envs:
```
AIRTABLE_API_KEY=KEY_HERE
AIRTABLE_BASEID=ID_HERE
INFURA_API_KEY=KEY_HERE
ETH_PRIVATE_KEY=KEY_HERE
SNAPSHOT_HUB_URL=https://hub.snapshot.page
```

## Airtable

Configure your AIRTABLE_API_KEY + AIRTABLE_BASEID to execute the airtable/db sync.
- Then simply run src/airtable/sync_airtable_active_proposal_votes.js 

## GSheets

This bot also connects with GSheets.
- Copy your credentials.json into DAOBot/ root
- user@vm:in/your/cli/DAOBot/$node src/gsheets/index.js
- Follow cli prompts. token.json should be generated 
- user@vm:in/your/cli/DAOBot/$node src/gsheets/sync_gsheets_active_proposal_votes.js >> log_sync_gsheets_active_proposal_votes.csv

## Airtable

This bot updates Airtable on a cron to display a vote Leaderboard.
- user@vm:in/your/cli/DAOBot/$node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable_active_proposal_votes.csv

## Main entry points

These are the main entry points.
- src/airtable/sync_airtable_active_proposal_votes.js
- src/gsheets/sync_gsheets_active_proposal_votes.js
- src/snapshot/submit_snapshot_accepted_proposals.js

## Configure Crontab

The bash scripts located in the root `/DAOBot/` directory should allow you to run the node sync-scripts, from cron.

Instructions  
- From the command line enter: crontab -e
- Execute your cron scripts relative to your `/DAOBot/` path. 
- Your local node installation may be in a different path than what's inside the .sh scripts. Use `which node`.

Example Crontab - Sync every 2 minutes 
```
*/2 * * * * sh /DAOBot/cron_sync_votes_airtable.sh 2>&1
*/2 * * * * sh /DAOBot/cron_sync_votes_gsheets.sh 2>&1
```

