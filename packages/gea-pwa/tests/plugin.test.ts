import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPluginConfig } from '../src/plugin.ts'

describe('buildPluginConfig', () => {
  const baseManifest = { name: 'Test App' }

  it('uses offline-first preset by default', () => {
    const config = buildPluginConfig({ manifest: baseManifest })
    assert.equal(config.runtimeCaching.length, 3)
  })

  it('uses minimal preset when specified', () => {
    const config = buildPluginConfig({ manifest: baseManifest, preset: 'minimal' })
    assert.equal(config.runtimeCaching.length, 0)
  })

  it('appends user runtimeCaching after preset rules', () => {
    const config = buildPluginConfig({
      manifest: baseManifest,
      preset: 'minimal',
      runtimeCaching: [{ urlPattern: /\/custom\//, handler: 'CacheFirst' }],
    })
    assert.equal(config.runtimeCaching.length, 1)
    assert.equal(config.runtimeCaching[0].handler, 'CacheFirst')
  })

  it('merges raw workbox options', () => {
    const config = buildPluginConfig({
      manifest: baseManifest,
      workbox: { skipWaiting: true },
    })
    assert.equal(config.workboxOptions.skipWaiting, true)
  })

  it('generates correct manifest JSON', () => {
    const config = buildPluginConfig({
      manifest: { name: 'My App', theme_color: '#fff' },
    })
    const parsed = JSON.parse(config.manifestJson)
    assert.equal(parsed.name, 'My App')
    assert.equal(parsed.theme_color, '#fff')
  })
})
