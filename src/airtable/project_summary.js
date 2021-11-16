// @format
require("dotenv").config();
const process = require("process");
const Airtable = require("airtable");

const { AIRTABLE_API_KEY, AIRTABLE_BASEID } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASEID);

const fields = [
  "RecordId",
  "Project Name",
  "OCEAN Granted",
  "Voted Yes",
  "Voted No",
  "Proposal Standing"
];

const maxRecordAmount = 10;

const deleteAll = async () => {
  const records = [];

  const projects = await retrieve.projects();
  for (let c of chunk(projects)) {
    records.push(...(await remove(c)));
  }

  return records;
};

const processAll = async () => {
  try {
    const proposals = await retrieve.proposals();
    const projects = summarize(proposals);
    const entries = toAirtableList(projects);
    const chunks = chunk(entries);
    for (let c of chunks) {
      await populate(c);
    }
  } catch (err) {
    console.error(err);
  }
};

const chunk = projects => {
  const chunks = [];
  for (i = 0, j = projects.length; i < j; i += maxRecordAmount) {
    chunks.push(projects.slice(i, i + maxRecordAmount));
  }
  return chunks;
}

const populate = async projects => {
  return new Promise((resolve, reject) => {
    base("Project Summary").create(projects, (err, records) => {
      if (err) {
        reject(err);
      }
      resolve(records.map(r => r.getId()));
    });
  });
};

const remove = async ids => {
  return new Promise((resolve, reject) => {
    base("Project Summary").destroy(ids, (err, records) => {
      if (err) {
        reject(err);
      }
      resolve(records.map(r => r.getId()));
    });
  });
};

const levels = {
  // NOTE: Reference: https://github.com/oceanprotocol/oceandao/wiki#r11-update-funding-levels
  "Round 11": project => {
    const completed = project["Project Standing"].Completed;
    if (completed === 0) return "New Project";
    if (completed === 1) return "Existing Project";
    if (completed >= 2 && completed < 5) return "Experienced Project";
    if (completed >= 5) return "Veteran Project";
  }
};

const toAirtableList = projects => {
  const airtableList = [];

  for (const [key, value] of Object.entries(projects)) {
    value["ProjectId"] = key;
    value["Project Level"] = levels["Round 11"](value);
    delete value["Project Standing"];

    airtableList.push({
      fields: {
        ...value
      }
    });
  }
  return airtableList;
};

const summarize = proposals => {
  const projects = {};
  
  for (let proposal of proposals) {
    const proposalRecordId = proposal["RecordId"];

    let project = projects[proposalRecordId];

    if (!project) {
      project = {
        "Project Name": proposal["Project Name"],
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
    projects[proposalRecordId] = project;
  }
  
  return projects;
};

const retrieve = {
  projects: async () => {
    const projects = [];

    return new Promise((resolve, reject) => {
      base("Project Summary")
        .select()
        .eachPage(
          (records, next) => {
            records.forEach(record => {
              projects.push(record.id);
            });
            next();
          },
          err => {
            if (err) {
              reject(err);
            }
            resolve(projects);
          }
        );
    });
  },
  proposals: async () => {
    const proposals = [];

    return new Promise((resolve, reject) => {
      base("Proposals")
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
  }
};

processAll()

module.exports = {
  retrieve,
  summarize,
  populate,
  remove,
  chunk,
  toAirtableList,
  levels,
  deleteAll,
  processAll
};
