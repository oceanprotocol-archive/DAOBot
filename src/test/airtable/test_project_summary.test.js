// @format
require('dotenv').config()
const { assert } = require('chai')
const { expect } = require('chai')

const {
  summarize,
  populate,
  retrieve,
  chunk,
  toAirtableList,
  levels,
  remove,
  deleteAll
} = require('../../airtable/project_summary.js')

afterAll(() => {
  jest.clearAllTimers()
})

describe('Creating project summaries', () => {
  it('should populate a table', async () => {
    const record = {
      fields: {
        ProjectId: '78d91b81-768c-4fef-81c8-07baf3bd72e9',
        'Project Name': 'FantasyFinance',
        'Project Level': 'Experienced Project',
        'Voted Yes': 3,
        'Voted No': 0,
        'OCEAN Granted': 3,
        'Times Proposed': 2,
        'Times Granted': 2
      }
    }
    const [id] = await populate([record])
    assert(id.startsWith('rec'))
  })

  it('should delete records from a table', async () => {
    const record = {
      fields: {
        ProjectId: '78d91b81-768c-4fef-81c8-07baf3bd72e9',
        'Project Name': 'FantasyFinance',
        'Project Level': 'Experienced Project',
        'Voted Yes': 3,
        'Voted No': 0,
        'OCEAN Granted': 3,
        'Times Proposed': 2,
        'Times Granted': 2
      }
    }
    const [id] = await populate([record])
    assert(id.startsWith('rec'))

    const [removedId] = await remove([id])
    assert(removedId.startsWith('rec'))
  })

  it('should delete ALL records from a table', async () => {
    const records = [
      {
        fields: {
          ProjectId: '78d91b81-768c-4fef-81c8-07baf3bd72e9',
          'Project Name': 'FantasyFinance',
          'Project Level': 'Experienced Project',
          'Voted Yes': 3,
          'Voted No': 0,
          'OCEAN Granted': 3,
          'Times Proposed': 2,
          'Times Granted': 2
        }
      },
      {
        fields: {
          ProjectId: '7c17baed-327d-44ad-b09b-7fc5314aa143',
          'Project Name': 'LoserFinance',
          'Project Level': 'New Project',
          'Voted Yes': 0,
          'Voted No': 1,
          'OCEAN Granted': 0,
          'Times Proposed': 1,
          'Times Granted': 0
        }
      }
    ]
    const [id] = await populate(records)
    assert(id.startsWith('rec'))

    const [id1, id2] = await deleteAll()
    assert(id1.startsWith('rec'))
    assert(id2.startsWith('rec'))
  })

  it('should summarize levels given the project standings', () => {
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 0
        }
      }),
      'New Project'
    )
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 1
        }
      }),
      'Existing Project'
    )
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 2
        }
      }),
      'Experienced Project'
    )
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 4
        }
      }),
      'Experienced Project'
    )
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 5
        }
      }),
      'Veteran Project'
    )
    assert.deepEqual(
      levels['Round 11']({
        'Project Standing': {
          Completed: 1337
        }
      }),
      'Veteran Project'
    )
  })

  it('should chunk any array to a max size of 10', () => {
    const chunks = chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    assert.deepEqual(chunks, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11]])
  })

  it("should return all projects in the 'Project Summary' table", async () => {
    const record = {
      fields: {
        ProjectId: '78d91b81-768c-4fef-81c8-07baf3bd72e9',
        'Project Name': 'FantasyFinance',
        'Project Level': 'Experienced Project',
        'Voted Yes': 3,
        'Voted No': 0,
        'OCEAN Granted': 3,
        'Times Proposed': 2,
        'Times Granted': 2
      }
    }
    const [id] = await populate([record])
    assert(id.startsWith('rec'))

    const projects = await retrieve.projects()
    expect(projects).to.be.an('array')
    assert(projects[0].startsWith('rec'))
  })

  it('should return the base with all data included', async () => {
    const proposals = await retrieve.proposals()
    expect(proposals).to.be.an('array')
    expect(proposals[0]).to.have.all.keys(
      'RecordId',
      'Project Name',
      'Proposal Standing',
      'OCEAN Granted',
      'Voted Yes',
      'Voted No',
      'UUID'
    )
  })

  it('should convert a project object it an airtable list', () => {
    const projects = {
      '78d91b81-768c-4fef-81c8-07baf3bd72e9': {
        'Project Name': 'FantasyFinance',
        'Voted Yes': 3,
        'Voted No': 0,
        'OCEAN Granted': 3,
        'Times Proposed': 2,
        'Times Granted': 2,
        'Project Standing': {
          Completed: 2,
          'Funds Returned': 0,
          'In Progress': 0,
          'incomplete & inactive': 0,
          Unreported: 0,
          'In Dispute': 0
        }
      },
      '7c17baed-327d-44ad-b09b-7fc5314aa143': {
        'Project Name': 'LoserFinance',
        'Voted Yes': 0,
        'Voted No': 1,
        'OCEAN Granted': 0,
        'Times Proposed': 1,
        'Times Granted': 0,
        'Project Standing': {
          Completed: 0,
          'Funds Returned': 0,
          'In Progress': 0,
          'incomplete & inactive': 0,
          Unreported: 0,
          'In Dispute': 1
        }
      }
    }
    assert.deepEqual(toAirtableList(projects), [
      {
        fields: {
          ProjectId: '78d91b81-768c-4fef-81c8-07baf3bd72e9',
          'Project Name': 'FantasyFinance',
          'Project Level': 'Experienced Project',
          'Voted Yes': 3,
          'Voted No': 0,
          'OCEAN Granted': 3,
          'Times Proposed': 2,
          'Times Granted': 2
        }
      },
      {
        fields: {
          ProjectId: '7c17baed-327d-44ad-b09b-7fc5314aa143',
          'Project Name': 'LoserFinance',
          'Project Level': 'New Project',
          'Voted Yes': 0,
          'Voted No': 1,
          'OCEAN Granted': 0,
          'Times Proposed': 1,
          'Times Granted': 0
        }
      }
    ])
  })

  it('should return a project summary given a list of proposals', () => {
    const proposals = [
      {
        'Project Name': 'FantasyFinance',
        'Proposal Standing': 'Completed',
        RecordId: 'recJrtD0e7KQH19RG',
        'OCEAN Granted': 1,
        'Voted Yes': 1,
        'Voted No': 0,
        UUID: '78d91b81-768c-4fef-81c8-07baf3bd72e9'
      },
      {
        'Project Name': 'FantasyFinance',
        'Proposal Standing': 'Completed',
        RecordId: 'recJrtD0e7KQH19RG',
        'OCEAN Granted': 2,
        'Voted Yes': 2,
        'Voted No': 0,
        UUID: '78d91b81-768c-4fef-81c8-07baf3bd72e9'
      },
      {
        'Project Name': 'LoserFinance',
        'Proposal Standing': 'In Dispute',
        RecordId: 'recJrtD6r7KQH19RG',
        'OCEAN Granted': 0,
        'Voted Yes': 0,
        'Voted No': 1,
        UUID: '7c17baed-327d-44ad-b09b-7fc5314aa143'
      }
    ]

    const summary = summarize(proposals)
    expect(summary).to.eql({
      '78d91b81-768c-4fef-81c8-07baf3bd72e9': {
        'Project Name': 'FantasyFinance',
        'Voted Yes': 3,
        'Voted No': 0,
        'OCEAN Granted': 3,
        'Times Proposed': 2,
        'Times Granted': 2,
        'Project Standing': {
          Completed: 2,
          'Funds Returned': 0,
          'In Progress': 0,
          'incomplete & inactive': 0,
          Unreported: 0,
          'In Dispute': 0
        }
      },
      '7c17baed-327d-44ad-b09b-7fc5314aa143': {
        'Project Name': 'LoserFinance',
        'Voted Yes': 0,
        'Voted No': 1,
        'OCEAN Granted': 0,
        'Times Proposed': 1,
        'Times Granted': 0,
        'Project Standing': {
          Completed: 0,
          'Funds Returned': 0,
          'In Progress': 0,
          'incomplete & inactive': 0,
          Unreported: 0,
          'In Dispute': 1
        }
      }
    })
  })
})
