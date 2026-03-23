import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FetchStore } from '../src/fetch.ts'

describe('FetchStore', () => {
  it('initializes with null data', () => {
    const store = new FetchStore()
    assert.equal(store.data, null)
  })

  it('initializes with no error', () => {
    const store = new FetchStore()
    assert.equal(store.error, null)
  })

  it('initializes isLoading as false', () => {
    const store = new FetchStore()
    assert.equal(store.isLoading, false)
  })

  it('initializes isFromCache as false', () => {
    const store = new FetchStore()
    assert.equal(store.isFromCache, false)
  })

  it('extends Store (has observe method)', () => {
    const store = new FetchStore()
    assert.equal(typeof store.observe, 'function')
  })

  it('generic type parameter defaults to unknown', () => {
    const store = new FetchStore<string[]>()
    const data: string[] | null = store.data
    assert.equal(data, null)
  })
})
