// @format
require("dotenv").config();
const expect = require("chai").expect;
const should = require("chai").should();

const { retrieve } = require("../../airtable/project_summary.js");

describe("getting all proposals", () => {
  it("is should return the base with all data included", async () => {
    const proposals = await retrieve();
    expect(proposals).to.be.an("array");
    expect(proposals[0]).to.have.all.keys(
      "Project Name",
      "Proposal Standing",
      "OCEAN Granted",
      "Voted Yes",
      "Voted No"
    );
  });
});
