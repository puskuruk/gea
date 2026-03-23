import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { presets, resolveRuntimeCaching } from '../src/presets.ts'

describe('presets', () => {
  it('minimal preset returns empty array', () => {
    assert.deepEqual(presets['minimal'], [])
  })

  it('offline-first preset has 3 caching rules', () => {
    assert.equal(presets['offline-first'].length, 3)
  })

  it('offline-first preset uses CacheFirst for assets', () => {
    const assetRule = presets['offline-first'][0]
    assert.equal(assetRule.handler, 'CacheFirst')
  })

  it('offline-first preset uses StaleWhileRevalidate for pages', () => {
    const pageRule = presets['offline-first'][1]
    assert.equal(pageRule.handler, 'StaleWhileRevalidate')
  })

  it('offline-first preset uses NetworkFirst for API', () => {
    const apiRule = presets['offline-first'][2]
    assert.equal(apiRule.handler, 'NetworkFirst')
  })

  it('network-first preset has 1 catch-all rule', () => {
    assert.equal(presets['network-first'].length, 1)
    assert.equal(presets['network-first'][0].handler, 'NetworkFirst')
  })
})

describe('resolveRuntimeCaching', () => {
  it('returns preset rules when no overrides', () => {
    const result = resolveRuntimeCaching('minimal')
    assert.deepEqual(result, [])
  })

  it('appends user rules after preset rules', () => {
    const userRules: import('workbox-build').RuntimeCaching[] = [
      { urlPattern: /\/custom\//, handler: 'CacheFirst' },
    ]
    const result = resolveRuntimeCaching('minimal', userRules)
    assert.equal(result.length, 1)
    assert.equal(result[0].handler, 'CacheFirst')
  })

  it('defaults to offline-first when no preset specified', () => {
    const result = resolveRuntimeCaching(undefined)
    assert.equal(result.length, 3)
  })
})
