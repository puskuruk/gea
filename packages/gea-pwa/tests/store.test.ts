import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PwaStore } from '../src/store.ts'

describe('PwaStore', () => {
  it('initializes with navigator.onLine state', () => {
    const store = new PwaStore()
    assert.equal(store.isOnline, true)
  })

  it('initializes isInstallable as false', () => {
    const store = new PwaStore()
    assert.equal(store.isInstallable, false)
  })

  it('initializes hasUpdate as false', () => {
    const store = new PwaStore()
    assert.equal(store.hasUpdate, false)
  })

  it('initializes registrationError as null', () => {
    const store = new PwaStore()
    assert.equal(store.registrationError, null)
  })

  it('promptInstall returns false when no deferred prompt', async () => {
    const store = new PwaStore()
    const result = await store.promptInstall()
    assert.equal(result, false)
  })

  it('applyUpdate is a no-op when no registration', () => {
    const store = new PwaStore()
    store.applyUpdate()
    assert.ok(true)
  })

  it('extends Store (has observe method)', () => {
    const store = new PwaStore()
    assert.equal(typeof store.observe, 'function')
  })
})
