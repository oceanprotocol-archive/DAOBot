// @format
require('dotenv').config()
const process = require('process')
const Airtable = require('airtable')
const { v4: uuidv4 } = require('uuid')
const { Standings } = require('./proposals/proposal_standings')
const { AIRTABLE_API_KEY, AIRTABLE_BASEID } = process.env
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASEID)

const PROPOSAL_TABLE_NAME = 'Proposals'
const PROJECT_SUMMARY_TABLE_NAME = 'Project Summary'

const fields = [
  'RecordId',
  'Project Name',
  'OCEAN Granted',
  'Voted Yes',
  'Voted No',
  'Proposal Standing',
  'UUID'
]

const maxRecordAmount = 10

const deleteAll = async () => {
  const records = []

  const projects = await retrieve.projects()
  for (const c of chunk(projects)) {
    records.push(...(await remove(c)))
  }

  return records
}

const processAll = async () => {
  try {
    let proposals = await retrieve.proposals()

    // Updates all proposals that don't have UUID (it adds one)
    const shouldRetrieveProposals = await addUUID(proposals)

    // Retrieve all proposal (now all with UUID)
    if (shouldRetrieveProposals) {
      proposals = await retrieve.proposals()
    }

    const projects = summarize(proposals)
    const entries = toAirtableList(projects)
    const chunks = chunk(entries)
    for (const c of chunks) {
      await populate(c)
    }
  } catch (err) {
    console.error(err)
  }
}

const chunk = (projects) => {
  const chunks = []
  for (let i = 0, j = projects.length; i < j; i += maxRecordAmount) {
    chunks.push(projects.slice(i, i + maxRecordAmount))
  }
  return chunks
}

const populate = async (projects) => {
  return new Promise((resolve, reject) => {
    base(PROJECT_SUMMARY_TABLE_NAME).create(projects, (err, records) => {
      if (err) {
        reject(err)
      }
      resolve(records.map((r) => r.getId()))
    })
  })
}

const remove = async (ids) => {
  return new Promise((resolve, reject) => {
    base(PROJECT_SUMMARY_TABLE_NAME).destroy(ids, (err, records) => {
      if (err) {
        reject(err)
      }
      resolve(records.map((r) => r.getId()))
    })
  })
}

const addUUID = async (proposals) => {
  let shouldRetrieveProposals = false
  const groupedProposals = {}

  // Grouping proposal by project name
  proposals.forEach((proposal) => {
    const key = proposal['Project Name']

    if (!groupedProposals[key]) {
      groupedProposals[key] = [proposal]
    } else {
      groupedProposals[key].push(proposal)
    }
  })

  // Add UUID if not available
  for (const key in groupedProposals) {
    const proposalsCollection = groupedProposals[key]

    const proposalWithUUID = proposalsCollection.find(
      (x) => x.UUID !== undefined
    )

    const uuid = proposalWithUUID ? proposalWithUUID.UUID : uuidv4()

    proposalsCollection.forEach(async (proposal) => {
      if (proposal.UUID === undefined) {
        await updatedRecordById(proposal.RecordId, { UUID: uuid })
        shouldRetrieveProposals = true
      }
    })
  }

  return shouldRetrieveProposals
}

const updatedRecordById = async (recordId, dataObject) => {
  try {
    await base(PROJECT_SUMMARY_TABLE_NAME).update(recordId, dataObject)
  } catch (err) {
    console.log('updatedRecordById | error = ', err)
  }
}

const levels = (completed) => {
  // NOTE: Reference: https://github.com/oceanprotocol/oceandao/wiki#r12-update-funding-tiers
  if (completed === 0) return { level: 'New Project', ceiling: 3000 }
  if (completed === 1) return { level: 'Existing Project', ceiling: 10000 }
  if (completed >= 2 && completed < 5)
    return { level: 'Experienced Project', ceiling: 20000 }
  if (completed >= 5) return { level: 'Veteran Project', ceiling: 35000 }
}

const toAirtableList = (projects) => {
  const airtableList = []

  for (const [key, value] of Object.entries(projects)) {
    value.ProjectId = key
    const { level, ceiling } = levels(value['Project Standing'].Completed)
    value['Project Level'] = level
    value['Max Funding'] = ceiling
    delete value['Project Standing']

    airtableList.push({
      fields: {
        ...value
      }
    })
  }
  return airtableList
}

const summarize = (proposals) => {
  const projects = {}

  for (const proposal of proposals) {
    const proposalUUID = proposal.UUID

    let project = projects[proposalUUID]

    if (!project) {
      project = {
        'Project Name': proposal['Project Name'],
        'Voted Yes': 0,
        'Voted No': 0,
        'Grants Proposed': 0,
        'Grants Received': 0,
        'Total Ocean Granted': 0,
        'Total USD Granted': 0,
        'Grants Completed': 0,
        'Project Standing': {
          Completed: 0,
          'Funds Returned': 0,
          'In Progress': 0,
          'incomplete & inactive': 0,
          Unreported: 0,
          'In Dispute': 0
        }
      }
    }

    project['Project Standing'][proposal['Proposal Standing']] += 1
    project['Voted Yes'] += proposal['Voted Yes'] ?? 0
    project['Voted No'] += proposal['Voted No'] ?? 0

    project['Total Ocean Granted'] += proposal['OCEAN Granted'] ?? 0
    project['Total USD Granted'] += proposal['USD Granted'] ?? 0

    project['Grants Received'] += proposal['OCEAN Granted'] > 0 ? 1 : 0
    project['Grants Completed'] +=
      proposal['Proposal Standing'] === Standings.Completed ? 1 : 0

    project['Grants Proposed'] += 1
    project['Project Standing'][proposal['Proposal Standing']] += 1
    projects[proposalUUID] = project
  }

  return projects
}

const retrieve = {
  projects: async () => {
    const projects = []

    return new Promise((resolve, reject) => {
      base(PROJECT_SUMMARY_TABLE_NAME)
        .select()
        .eachPage(
          (records, next) => {
            records.forEach((record) => {
              projects.push(record.id)
            })
            next()
          },
          (err) => {
            if (err) {
              reject(err)
            }
            resolve(projects)
          }
        )
    })
  },
  proposals: async () => {
    const proposals = []

    return new Promise((resolve, reject) => {
      base(PROPOSAL_TABLE_NAME)
        .select({
          fields
        })
        .eachPage(
          (records, next) => {
            records.forEach((record) => {
              proposals.push(record.fields)
            })
            next()
          },
          (err) => {
            if (err) {
              reject(err)
            }
            resolve(proposals)
          }
        )
    })
  }
}

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
}
