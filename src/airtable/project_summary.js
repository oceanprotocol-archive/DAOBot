// @format
require("dotenv").config();
const process = require("process");
const Airtable = require("airtable");

const { AIRTABLE_API_KEY, AIRTABLE_BASEID } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASEID);

const tableName = "All Proposals";
const fields = [
  "Project Name",
  "OCEAN Granted",
  "Voted Yes",
  "Voted No",
  "Proposal Standing"
];

const retrieve = async () => {
  const proposals = [];

  return new Promise((resolve, reject) => {
    base(tableName)
      .select({
        fields
      })
      .eachPage(
        (records, next) => {
          records.forEach(record => {
            proposals.push(record.fields);
          });
          next();
        },
        err => {
          if (err) {
            reject(err);
          }
          resolve(proposals);
        }
      );
  });
};

module.exports = {
  retrieve
};
