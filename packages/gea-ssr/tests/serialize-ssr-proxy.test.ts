import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { serializeStores } from '../src/serialize.ts'
import { Store } from '../../gea/src/lib/store.ts'

/**
 * Tests that serializeStores reads through the SSR overlay proxy.
 * Resolver must be set before `new Store()` so the SSR proxy handler is used.
 */
describe('serializeStores – SSR overlay awareness', () => {
  let overlayByTarget: WeakMap<object, Record<string, unknown>>

  beforeEach(() => {
    overlayByTarget = new WeakMap()
    Store._ssrOverlayResolver = (target: object) => overlayByTarget.get(target)
  })

  afterEach(() => {
    Store._ssrOverlayResolver = null
  })

  it('serializes overlay values, not underlying store values', () => {
    const store = new Store({ count: 0, name: 'shared' })
    const raw = (store as Record<string, unknown>).__getRawTarget as object
    const overlay: Record<string, unknown> = { count: 42, name: 'request-local' }
    overlayByTarget.set(raw, overlay)

    const result = serializeStores([store], { TestStore: store })
    const parsed = new Function('return ' + result)()

    assert.equal(parsed.TestStore.count, 42, 'Must serialize overlay value, not shared store value')
    assert.equal(parsed.TestStore.name, 'request-local', 'Must serialize overlay value')
  })

  it('serializes overlay additions not present on underlying store', () => {
    const store = new Store({ base: 'yes' })
    const raw = (store as Record<string, unknown>).__getRawTarget as object
    const overlay: Record<string, unknown> = { base: 'yes', added: 'new-prop' }
    overlayByTarget.set(raw, overlay)

    const result = serializeStores([store], { S: store })
    const parsed = new Function('return ' + result)()

    assert.equal(parsed.S.added, 'new-prop', 'Must serialize properties added in overlay')
  })

  it('does not serialize tombstoned (deleted) properties', () => {
    const store = new Store({ keep: 'yes', remove: 'no' })
    const raw = (store as Record<string, unknown>).__getRawTarget as object
    const overlay: Record<string, unknown> = { keep: 'yes', remove: Store._ssrDeleted }
    overlayByTarget.set(raw, overlay)

    const result = serializeStores([store], { S: store })
    const parsed = new Function('return ' + result)()

    assert.equal(parsed.S.keep, 'yes')
    assert.equal(parsed.S.remove, undefined, 'Tombstoned property must not be serialized')
  })
})
