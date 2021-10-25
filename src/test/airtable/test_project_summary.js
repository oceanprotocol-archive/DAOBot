// @format
require("dotenv").config();
const assert = require("chai").assert;
const expect = require("chai").expect;

const {
  summarize,
  populate,
  retrieve,
  chunk,
  toAirtableList,
  levels,
  remove,
  deleteAll
} = require("../../airtable/project_summary.js");

describe("Creating project summaries", () => {
  it("should populate a table", async done => {
    const record = {
      fields: {
        "Project Name": "FantasyFinance",
        "Project Level": "Experienced Project",
        "Voted Yes": 3,
        "Voted No": 0,
        "OCEAN Granted": 3,
        "Times Proposed": 2,
        "Times Granted": 2
      }
    };
    const [id] = await populate([record]);
    assert(id.startsWith("rec"));
    done();
  });

  it("should delete records from a table", async done => {
    const record = {
      fields: {
        "Project Name": "FantasyFinance",
        "Project Level": "Experienced Project",
        "Voted Yes": 3,
        "Voted No": 0,
        "OCEAN Granted": 3,
        "Times Proposed": 2,
        "Times Granted": 2
      }
    };
    const [id] = await populate([record]);
    assert(id.startsWith("rec"));

    const [removedId] = await remove([id]);
    assert(id.startsWith("rec"));
    done();
  });

  it("should delete ALL records from a table", async done => {
    const records = [
      {
        fields: {
          "Project Name": "FantasyFinance",
          "Project Level": "Experienced Project",
          "Voted Yes": 3,
          "Voted No": 0,
          "OCEAN Granted": 3,
          "Times Proposed": 2,
          "Times Granted": 2
        }
      },
      {
        fields: {
          "Project Name": "LoserFinance",
          "Project Level": "New Project",
          "Voted Yes": 0,
          "Voted No": 1,
          "OCEAN Granted": 0,
          "Times Proposed": 1,
          "Times Granted": 0
        }
      }
    ];
    const [id] = await populate(records);
    assert(id.startsWith("rec"));

    const [id1, id2] = await deleteAll();
    assert(id1.startsWith("rec"));
    assert(id2.startsWith("rec"));

    done();
  });

  it("should summarize levels given the project standings", done => {
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 0
        }
      }),
      "New Project"
    );
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 1
        }
      }),
      "Existing Project"
    );
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 2
        }
      }),
      "Experienced Project"
    );
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 4
        }
      }),
      "Experienced Project"
    );
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 5
        }
      }),
      "Veteran Project"
    );
    assert.deepEqual(
      levels["Round 11"]({
        "Project Standing": {
          Completed: 1337
        }
      }),
      "Veteran Project"
    );
    done();
  });

  it("should chunk any array to a max size of 10", done => {
    const chunks = chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.deepEqual(chunks, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11]]);
    done();
  });

  it("should return all projects in the 'Project Summary' table", async done => {
    const record = {
      fields: {
        "Project Name": "FantasyFinance",
        "Project Level": "Experienced Project",
        "Voted Yes": 3,
        "Voted No": 0,
        "OCEAN Granted": 3,
        "Times Proposed": 2,
        "Times Granted": 2
      }
    };
    const [id] = await populate([record]);
    assert(id.startsWith("rec"));

    const projects = await retrieve.projects();
    expect(projects).to.be.an("array");
    // NOTE: All Airtable record ids start with the substring "rec"...
    assert(projects[0].startsWith("rec"));
    done();
  });

  it("should return the base with all data included", async done => {
    const proposals = await retrieve.proposals();
    expect(proposals).to.be.an("array");
    expect(proposals[0]).to.have.all.keys(
      "Project Name",
      "Proposal Standing",
      "OCEAN Granted",
      "Voted Yes",
      "Voted No"
    );
    done();
  });

  it("should convert a project object it an airtable list", done => {
    const projects = {
      FantasyFinance: {
        "Voted Yes": 3,
        "Voted No": 0,
        "OCEAN Granted": 3,
        "Times Proposed": 2,
        "Times Granted": 2,
        "Project Standing": {
          Completed: 2,
          "Funds Returned": 0,
          "In Progress": 0,
          "incomplete & inactive": 0,
          Unreported: 0,
          "In Dispute": 0
        }
      },
      LoserFinance: {
        "Voted Yes": 0,
        "Voted No": 1,
        "OCEAN Granted": 0,
        "Times Proposed": 1,
        "Times Granted": 0,
        "Project Standing": {
          Completed: 0,
          "Funds Returned": 0,
          "In Progress": 0,
          "incomplete & inactive": 0,
          Unreported: 0,
          "In Dispute": 1
        }
      }
    };
    assert.deepEqual(toAirtableList(projects), [
      {
        fields: {
          "Project Name": "FantasyFinance",
          "Project Level": "Experienced Project",
          "Voted Yes": 3,
          "Voted No": 0,
          "OCEAN Granted": 3,
          "Times Proposed": 2,
          "Times Granted": 2
        }
      },
      {
        fields: {
          "Project Name": "LoserFinance",
          "Project Level": "New Project",
          "Voted Yes": 0,
          "Voted No": 1,
          "OCEAN Granted": 0,
          "Times Proposed": 1,
          "Times Granted": 0
        }
      }
    ]);
    done();
  });

  it("should return a project summary given a list of proposals", () => {
    const proposals = [
      {
        "Project Name": "FantasyFinance",
        "Proposal Standing": "Completed",
        "OCEAN Granted": 1,
        "Voted Yes": 1,
        "Voted No": 0
      },
      {
        "Project Name": "FantasyFinance",
        "Proposal Standing": "Completed",
        "OCEAN Granted": 2,
        "Voted Yes": 2,
        "Voted No": 0
      },
      {
        "Project Name": "LoserFinance",
        "Proposal Standing": "In Dispute",
        "OCEAN Granted": 0,
        "Voted Yes": 0,
        "Voted No": 1
      }
    ];

    const summary = summarize(proposals);
    expect(summary).to.eql({
      FantasyFinance: {
        "Voted Yes": 3,
        "Voted No": 0,
        "OCEAN Granted": 3,
        "Times Proposed": 2,
        "Times Granted": 2,
        "Project Standing": {
          Completed: 2,
          "Funds Returned": 0,
          "In Progress": 0,
          "incomplete & inactive": 0,
          Unreported: 0,
          "In Dispute": 0
        }
      },
      LoserFinance: {
        "Voted Yes": 0,
        "Voted No": 1,
        "OCEAN Granted": 0,
        "Times Proposed": 1,
        "Times Granted": 0,
        "Project Standing": {
          Completed: 0,
          "Funds Returned": 0,
          "In Progress": 0,
          "incomplete & inactive": 0,
          Unreported: 0,
          "In Dispute": 1
        }
      }
    });
  });
});
