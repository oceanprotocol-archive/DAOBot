// @format
const {
  populate,
  toAirtableList,
  summarize,
  retrieve,
  chunk
} = require("./project_summary.js");

(async () => {
  const proposals = await retrieve();
  const projects = summarize(proposals);
  const entries = toAirtableList(projects);
  const chunks = chunk(entries);
  for (let c of chunks) {
    await populate(c);
  }
})();
