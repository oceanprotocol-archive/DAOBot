// @format
const { deleteAll, processAll } = require('./project_summary.js')

(async () => {
  // NOTE: In this implementation, we consider the "Project Summary" table a
  // "Pivot Table" of "All Proposals [1]. This consideration is reflected in
  // the way this code updates the "Project Summary" table given changes on the
  // original data source - the "All Proposals" table.
  //
  // Instead of updating selective records given a unique record ID, since in
  // the oceanDAO, the mutable project name is the unique identifier we decided
  // to update the "Project Summary" table by regularly deleting and
  // resummarizing all its content [2].
  //
  // Reference:
  // - 1: https://en.wikipedia.org/w/index.php?title=Pivot_table&oldid=1047076369
  // - 2: https://github.com/oceanprotocol/DAOBot/pull/27#pullrequestreview-785866379
  await deleteAll()
  await processAll()
})()
