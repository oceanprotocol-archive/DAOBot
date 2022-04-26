#### Funding Ops
_How to Redistribute Funds - Example: Solving for 100k USD)_  
1. Setup a Excel spreadsheet, [so you can recalculate the Earmarks + Total Ocean Available](https://docs.google.com/spreadsheets/d/1e4xb6m-aKcBhwob_p7ereSFneXFPpDjUbSjz13smmHI/edit?pli=1#gid=1181620863):  
a. I then enter the amount: 100k USD and I get the new Ocean/Earmark amounts  
b. I can then update the new Earmark JSON (Cell - M14 - In Green) inside Airtable.  
c. I can then update the Ocean Available amount inside Airtable  

2. I then updated Airtable in production... This requires some knowledge of the table and doing things in a handful of places...  
a. For safety, I download a copy of it as a CSV.   
b. Proposal Table:  
(i) Reset Proposal State to Accepted.  
(ii) Delete: OCEAN Requested, OCEAN Funded, USD Granted  
c. FundingRound Table:  
(i) Reset to R16  
(ii) Update: Earmarks, Ocean Available  

3. I then re-executed the funding script funding_round_cron.js, with a hard-coded value for the OCEAN/USD amount.  
a. This "Completes R16" again  
b. Updates funding distribution in Airtable  
c. Updates funding distribution in GSheets  
