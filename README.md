## 🤖 OceanDAO Bot
This bot pipes data from a few different sources, so we can efficiently report DAO-Related informaiton.
- Make sure you have `node` and `npm`
- `npm install`
- Create a `.env` file with the following envs:
```
#The ID and Key used for connecting to Airtable
AIRTABLE_API_KEY=KEY_HERE
AIRTABLE_BASEID=ID_HERE

#BASEID of the GSHEET
GSHEET_BASEID=ID_HERE

#Used to instantiate a web3 provider
INFURA_API_KEY=KEY_HERE

#Used to connect the account to web3
ETH_PRIVATE_KEY=KEY_HERE

#Wallet addresses used for the tests. They are necessary in order to pass all the tests.
#The minimum number of OCEAN tokens needed is 500
WALLET_ADDRESS_WITH_ENOUGH_OCEANS=ADDRESS_HERE
WALLET_ADDRESS_WITH_NOT_ENOUGH_OCEANS=ADDRESS_HERE

#The parameters for connecting to Snapshot. If not proviede the test Snapshot would be used by defoult.
SNAPSHOT_HUB_URL=https://hub.snapshot.page

#Is used for getting the token price. For Ocean token price use 'ocean-protocol'
CG_TOKEN_SLUG=SLUG_HERE
```


## ❓ How To: Access OceanDAO Airtable Data
Anyone can access the live data for OceanDAO.
Design: Consider this a document-based DB.

You can view the [Proposals Airtable through this link](https://airtable.com/shrd5s7HSXc2vC1iC).
This contains all proposals for each funding round, and all required params to execute voting + funding.

You can view the [Funding Rounds Airtable through this link](https://airtable.com/shrvk1ENKwlG8vOBL)
This contains all funding round params required to execute voting + funding OPS (Funding Started -> Voting Ended -> Declare Winners & Amounts.

You can use our [Airtable API Endpoint via this link](https://airtable.com/appVer8ccYGnqSm2H/api/docs#javascript/introduction) and access it via `curl`.

This bot sits on a cron, and updates Airtable to display a voting Leaderboard.
Run the sync_airtable.js script using `node` inside the CLI.

`user@vm:in/your/cli/DAOBot/$ node src/airtable/sync_airtable_active_proposal_votes.js >> log_sync_airtable_active_proposal_votes.csv`


## 📊 Airtable - Configure DAOBot to use your Airtable 
Configure your AIRTABLE_API_KEY + AIRTABLE_BASEID to execute the airtable/db sync.
`user@vm:in/your/cli/DAOBot/$node src/airtable/sync_airtable_active_proposal_votes.js`


## 📄 GSheets - Point DAOBot to GSheet, get Vote Results
You can use DAOBot to dump votes from Snapshot, onto GSheets.
You can [instantly setup your GSheet, to render inside Notion.](https://www.notion.vip/charts/)

This bot also connects with GSheets.
1. Copy your credentials.json into DAOBot/ root  
`user@vm:in/your/cli/DAOBot/$node src/gsheets/index.js`
2. Follow cli prompts. token.json should be generated  
`user@vm:in/your/cli/DAOBot/$node src/gsheets/sync_gsheets_active_proposal_votes.js >> log_sync_gsheets_active_proposal_votes.csv`


## 📄 Snapshot - Vote for proposals and get vote results
Snapshot is used inside Ocean DAO to allow people to vote for the proposals in the voting period of each round.
A new Snapshot instance is created for each round by the DAOBot using the following function
In order for the DAOBot to create the right instance of Snapshot, for each round there should be specified the right parameters inside the Funding Round table from Airtable at the current round line
The parameters used for creating the Snapshot instance are:
1. Vote Type
   - single-choice: each voter may select a single choice to give his total voting power to.
   - weighted: each voter may spread voting power across any number of choices.
2. Ballot Type
   - Batch: 
   - Granular:

You can also specify where should DAOBot create the snapshot instance by setting the env variables.
1. Test
   - space: spring-dao => https://snapshot.org/#/spring-dao
   - snapshot-url: snapshot.org
2. Production
   - space: officialoceandao.eth => https://snapshot.org/#/officialoceandao.eth
   - snapshot-url: snapshot.org


## ⏲️ CRON - Configure DAOBOT Crontab
The bash scripts located in the root `/DAOBot/` directory should allow you to run the node sync-scripts, from cron.

Instructions  
- From the command line enter: crontab -e
- Execute your cron scripts relative to your `/DAOBot/` path. 
- Your local node installation may be in a different path than what's inside the .sh scripts. Use `which node`.

Example Crontab - Sync every 2 minutes 
```
* * * * * sh /DAOBot/cron_update_funding_round.sh 2>&1
*/5 * * * * sh /DAOBot/cron_project_summary.sh 2>&1
```


## ⏲️ RUN/CRON - DAOBot Main entry points
These are the scripts that you should run to execute DAOBt.
More Coming... Read each script for more details.
- src/airtable/sync_airtable_active_proposal_votes.js
- src/gsheets/sync_gsheets_active_proposal_votes.js
- src/snapshot/submit_snapshot_accepted_proposals.js


## ✅ Testing - How to test DAOBot
```text
DAOBot uses `Jest` library for running the test files.
To run all the test use the following command: 
`npm run test`.
To run a single file the following command is needed:
`jest pathToFile/filename`.
The `env` variable used for testing are different from ones specified in the project and they are set inside github actions Secrets file.
```


## 🏛 License
```text
Copyright 2021 Ocean Protocol Foundation Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


