import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import authStore from '../../../../examples/router-v2/src/stores/auth-store'
import { AuthGuard } from '../../../../examples/router-v2/src/guards'

describe('examples/router-v2 AuthGuard + authStore', () => {
  beforeEach(() => {
    authStore.logout()
  })

  it('redirects when logged out', () => {
    assert.equal(AuthGuard(), '/login')
  })

  it('allows when logged in', () => {
    authStore.login('T', 't@e.com')
    assert.equal(AuthGuard(), true)
  })
})
