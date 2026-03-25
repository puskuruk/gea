import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { DashboardStore } from '../../../../examples/saas-dashboard/store'

describe('examples/saas-dashboard DashboardStore', () => {
  let s: DashboardStore
  beforeEach(() => {
    s = new DashboardStore()
  })

  it('filteredUsers by name and email', () => {
    assert.equal(s.filteredUsers.length, 5)
    s.searchQuery = 'sofia'
    assert.equal(s.filteredUsers.length, 1)
    s.searchQuery = '@acme.com'
    assert.equal(s.filteredUsers.length, 5)
    s.searchQuery = 'zzznomatch'
    assert.equal(s.filteredUsers.length, 0)
  })

  it('activeCount and adminCount', () => {
    assert.ok(s.activeCount >= 1)
    assert.ok(s.adminCount >= 1)
  })

  it('navigate', () => {
    s.navigate('users')
    assert.equal(s.currentView, 'users')
  })

  it('addUser requires name and email', () => {
    s.openAddUser()
    s.draftName = ''
    s.addUser()
    assert.equal(s.users.length, 5)
    s.draftName = 'N'
    s.draftEmail = 'n@test.com'
    s.addUser()
    assert.equal(s.users.length, 6)
    assert.equal(s.addUserOpen, false)
  })

  it('deleteUser flow', () => {
    const id = s.users[0].id
    s.confirmDelete(id)
    assert.equal(s.deleteUserId, id)
    s.deleteUser()
    assert.equal(s.deleteUserId, null)
    assert.ok(!s.users.find((u) => u.id === id))
  })

  it('cancelDelete', () => {
    s.confirmDelete('u1')
    s.cancelDelete()
    assert.equal(s.deleteUserId, null)
  })

  it('toggleStatus', () => {
    const u = s.users[0]
    const prev = u.status
    s.toggleStatus(u.id)
    assert.notEqual(u.status, prev)
  })
})
