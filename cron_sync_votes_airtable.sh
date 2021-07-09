#!/usr/bin/env sh
cd /DAOBot/
/usr/local/bin/node src/airtable/sync_airtable_active_proposal_votes_snapshot.js >> log_sync_airtable.log
