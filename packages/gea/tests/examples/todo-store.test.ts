import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { TodoStore } from '../../../../examples/todo/todo-store'

describe('examples/todo TodoStore', () => {
  let s: TodoStore
  beforeEach(() => {
    s = new TodoStore()
  })

  it('add trims and clears draft', () => {
    s.draft = '  hi  '
    s.add()
    assert.equal(s.todos.length, 1)
    assert.equal(s.todos[0].text, 'hi')
    assert.equal(s.draft, '')
  })

  it('add with explicit text ignores draft', () => {
    s.draft = 'ignore'
    s.add('only this')
    assert.equal(s.todos[0].text, 'only this')
    assert.equal(s.draft, '')
  })

  it('add rejects empty', () => {
    s.add('   ')
    assert.equal(s.todos.length, 0)
  })

  it('toggle and remove', () => {
    s.add('a')
    s.add('b')
    const id = s.todos[0].id
    s.toggle(id)
    assert.ok(s.todos[0].done)
    s.remove(id)
    assert.equal(s.todos.length, 1)
  })

  it('rename', () => {
    s.add('x')
    const id = s.todos[0].id
    s.rename(id, '  y  ')
    assert.equal(s.todos[0].text, 'y')
  })

  it('rename rejects empty', () => {
    s.add('x')
    s.rename(s.todos[0].id, '  ')
    assert.equal(s.todos[0].text, 'x')
  })

  it('filteredTodos and counts', () => {
    s.add('a')
    s.add('b')
    s.toggle(s.todos[0].id)
    assert.equal(s.activeCount, 1)
    assert.equal(s.completedCount, 1)
    s.setFilter('active')
    assert.equal(s.filteredTodos.length, 1)
    s.setFilter('completed')
    assert.equal(s.filteredTodos.length, 1)
    s.setFilter('all')
    assert.equal(s.filteredTodos.length, 2)
  })

  it('setDraft via event shape', () => {
    s.setDraft({ target: { value: 'z' } })
    assert.equal(s.draft, 'z')
  })
})
