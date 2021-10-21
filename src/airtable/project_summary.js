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

const summarize = proposals => {
  const projects = {};
  for (let proposal of proposals) {
    const name = proposal["Project Name"];
    let project = projects[name];

    if (!project) {
      project = {
        "Voted Yes": proposal["Voted Yes"],
        "Voted No": proposal["Voted No"],
        "OCEAN Granted": proposal["OCEAN Granted"],
        "Times Proposed": 1,
        "Times Granted": proposal["OCEAN Granted"] > 0 ? 1 : 0,
        "Project Standing": {
          Completed: 0,
          "Funds Returned": 0,
          "In Progress": 0,
          "incomplete & inactive": 0,
          Unreported: 0,
          "In Dispute": 0
        }
      };
      project["Project Standing"][proposal["Proposal Standing"]] += 1;
    } else {
      project["Voted Yes"] += proposal["Voted Yes"];
      project["Voted No"] += proposal["Voted No"];
      project["OCEAN Granted"] += proposal["OCEAN Granted"];
      project["Times Granted"] += proposal["OCEAN Granted"] > 0 ? 1 : 0;

      project["Times Proposed"] += 1;
      project["Project Standing"][proposal["Proposal Standing"]] += 1;
    }
    projects[name] = project;
  }

  return projects;
};

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
  retrieve,
  summarize
};
