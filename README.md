# OceanDAO Bot

This bot pipes data from a few different sources, so we can efficiently report DAO-Related informaiton.
- Make sure you have `node` and `npm`
- `npm install`
- Create a `.env` file with the following envs:
```
AIRTABLE_API_KEY=KEY_HERE
INFURA_API_KEY=KEY_HERE
ETH_PRIVATE_KEY=KEY_HERE
SNAPSHOT_HUB_URL=https://hub.snapshot.page
```

## Airtable

Configure your AIRTABLE_API_KEY to execute the airtable/db sync.
- Then simply run src/airtable/sync_airtable_active_proposal_votes.js 

## GSheets

This bot also connects with GSheets.
- Copy your credentials.json into DAOBot/ root
- user@vm:in/your/cli/DAOBot/$node src/gsheets/index.js
- Follow cli prompts. token.json should be generated 
- Place token.json in DAOBOT/ root
- Now, run src/gsheets/sync_gsheets_active_proposal_votes.js

## Main entry points

These are the main entry points.
- src/airtable/sync_airtable_active_proposal_votes.js
- src/gsheets/sync_gsheets_active_proposal_votes.js
- src/snapshot/submit_snapshot_accepted_proposals.js

## Configure Crontab
  
Please note:
- You need to execute the script from the local path.  
- Your local node installation may be in a different path. Use ```which node```.

Example: Setup crontab to execute every 15 seconds.
```
PATH=/bin:/usr/bin:/usr/local/bin
* * * * * sleep 15; cd /DAOBot/ && node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable.log
* * * * * sleep 30; cd /DAOBot/ && node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable.log
* * * * * sleep 45; cd /DAOBot/ && node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable.log
* * * * * sleep 60; cd /DAOBot/ && node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable.log
```

