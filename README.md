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

## GSheets

This bot also connects with GSheets.
- Copy your credentials.json into DAOBot/ root
- user@vm:in/your/cli/DAOBot/$node src/gsheets/index.js
- Follow cli prompts. token.json should be generated 
- user@vm:in/your/cli/DAOBot/$node src/gsheets/sync_gsheets_active_proposal_votes.js >> log_sync_gsheets_active_proposal_votes.csv

## GSheets
- user@vm:in/your/cli/DAOBot/$node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable_active_proposal_votes.csv

## Main entry points

These are the main entry points.
- src/airtable/sync_airtable_active_proposal_votes.js
- src/gsheets/sync_gsheets_active_proposal_votes.js
- src/snapshot/submit_snapshot_accepted_proposals.js

