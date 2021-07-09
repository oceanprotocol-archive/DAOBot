#!/usr/bin/env sh
cd /DAOBot/
/usr/local/bin/node src/gsheets/sync_gsheets_active_proposal_votes_snapshot.js >> log_sync_gsheets.log
