import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { KanbanStore } from '../../../../examples/kanban/src/kanban-store'

describe('examples/kanban KanbanStore', () => {
  let s: KanbanStore
  beforeEach(() => {
    s = new KanbanStore()
  })

  it('initial column and task shape', () => {
    assert.equal(s.columns.length, 4)
    assert.equal(s.getTasksForColumn('col-backlog').length, 3)
    assert.equal(s.getTasksForColumn('col-done').length, 0)
  })

  it('selectedTask', () => {
    assert.equal(s.selectedTask, null)
    s.openTask('t1')
    assert.equal(s.selectedTask?.title, 'Design auth flow')
    s.closeTask()
    assert.equal(s.selectedTask, null)
  })

  it('addTask', () => {
    const col = s.columns[0]
    const n = col.taskIds.length
    s.startAdding(col.id)
    s.draftTitle = 'New'
    s.addTask(col.id)
    assert.equal(col.taskIds.length, n + 1)
    const id = col.taskIds[col.taskIds.length - 1]
    assert.equal(s.tasks[id].title, 'New')
  })

  it('addTask rejects empty title', () => {
    const col = s.columns[0]
    const n = col.taskIds.length
    s.startAdding(col.id)
    s.draftTitle = '  '
    s.addTask(col.id)
    assert.equal(col.taskIds.length, n)
  })

  it('cancelAdding', () => {
    s.startAdding('col-backlog')
    s.draftTitle = 'x'
    s.cancelAdding()
    assert.equal(s.addingToColumnId, null)
    assert.equal(s.draftTitle, '')
  })

  it('moveTask', () => {
    const from = 'col-backlog'
    const to = 'col-todo'
    const id = s.columns.find((c) => c.id === from)!.taskIds[0]
    s.moveTask(id, from, to)
    assert.ok(!s.columns.find((c) => c.id === from)!.taskIds.includes(id))
    assert.ok(s.columns.find((c) => c.id === to)!.taskIds.includes(id))
  })

  it('updateTask and deleteTask', () => {
    s.updateTask('t1', { priority: 'low' })
    assert.equal(s.tasks.t1.priority, 'low')
    s.deleteTask('t1')
    assert.equal(s.tasks.t1, undefined)
    for (const c of s.columns) assert.ok(!c.taskIds.includes('t1'))
  })
})
