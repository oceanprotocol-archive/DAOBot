#!/usr/bin/env sh
cd /DAOBot/
/usr/local/bin/node src/airtable/process_airtable_all_proposal_standings.js >> log_update_standings.log
