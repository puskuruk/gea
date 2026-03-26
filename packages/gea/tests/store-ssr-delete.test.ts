import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { Store } from '../src/lib/store'

/**
 * Tests for SSR overlay delete semantics.
 *
 * When a property is deleted from the SSR overlay, subsequent reads must
 * return undefined — NOT fall through to the underlying shared store.
 *
 * `Store._ssrOverlayResolver` must be set **before** `new Store()` so the
 * instance uses the SSR proxy handler (7 traps). Overlays are registered
 * per raw target after construction via WeakMap.
 */

describe('Store SSR overlay – delete tombstone', () => {
  let overlayByTarget: WeakMap<object, Record<string, unknown>>

  beforeEach(() => {
    overlayByTarget = new WeakMap()
    Store._ssrOverlayResolver = (target: object) => overlayByTarget.get(target)
  })

  afterEach(() => {
    Store._ssrOverlayResolver = null
  })

  function copyStoreFieldsToOverlay(store: InstanceType<typeof Store>): Record<string, unknown> {
    const raw = (store as Record<string, unknown>).__getRawTarget as object
    const overlay: Record<string, unknown> = {}
    for (const key of Object.getOwnPropertyNames(raw)) {
      const desc = Object.getOwnPropertyDescriptor(raw, key)
      if (!desc || typeof desc.value === 'function') continue
      if (typeof desc.get === 'function') continue
      if (key.charCodeAt(0) === 95 || key.charCodeAt(key.length - 1) === 95) continue
      if (key === 'constructor') continue
      overlay[key] = desc.value
    }
    overlayByTarget.set(raw, overlay)
    return overlay
  }

  it('deleting a property in SSR overlay returns undefined on read, not the underlying value', () => {
    const store = new Store({ name: 'shared', count: 42 })
    copyStoreFieldsToOverlay(store)

    assert.equal(store.name, 'shared')
    assert.equal(store.count, 42)

    delete (store as Record<string, unknown>).name

    assert.equal(store.name, undefined, 'Deleted SSR property must be undefined, not fall through to shared store')
  })

  it('deleted property does not appear in Object.keys', () => {
    const store = new Store({ a: 1, b: 2, c: 3 })
    copyStoreFieldsToOverlay(store)

    delete (store as Record<string, unknown>).b

    const keys = Object.keys(store)
    assert.ok(!keys.includes('b'), 'Deleted property must not appear in Object.keys')
    assert.ok(keys.includes('a'))
    assert.ok(keys.includes('c'))
  })

  it('deleted property returns undefined via getOwnPropertyDescriptor', () => {
    const store = new Store({ x: 10 })
    copyStoreFieldsToOverlay(store)

    delete (store as Record<string, unknown>).x

    const desc = Object.getOwnPropertyDescriptor(store, 'x')
    assert.equal(desc, undefined, 'getOwnPropertyDescriptor must return undefined for tombstoned property')
  })

  it('can set a new value after deleting in SSR overlay', () => {
    const store = new Store({ name: 'original' })
    copyStoreFieldsToOverlay(store)

    delete (store as Record<string, unknown>).name
    assert.equal(store.name, undefined)

    store.name = 'revived'
    assert.equal(store.name, 'revived')
  })

  it('delete in SSR overlay does not affect the underlying store', () => {
    const store = new Store({ count: 99 })
    const raw = (store as Record<string, unknown>).__getRawTarget as Record<string, unknown>
    copyStoreFieldsToOverlay(store)

    delete (store as Record<string, unknown>).count

    assert.equal(raw.count, 99, 'Underlying store must not be affected by SSR delete')
  })
})
