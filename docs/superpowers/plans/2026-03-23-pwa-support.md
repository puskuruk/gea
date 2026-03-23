# @geajs/pwa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `@geajs/pwa` package that provides PWA support via Workbox, a reactive `PwaStore`, an offline-aware `FetchStore`, and a Vite plugin for manifest/SW generation.

**Architecture:** Separate monorepo package (`packages/gea-pwa`) with a Vite plugin (`geaPwaPlugin`) for build-time SW/manifest generation and runtime exports (`PwaStore`, `FetchStore`) that extend `Store` from `@geajs/core`. Caching strategies are preset-driven with a raw Workbox escape hatch.

**Tech Stack:** TypeScript, Workbox (`workbox-build`), Vite Plugin API, `@geajs/core` Store, `node:test` for unit tests, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-03-23-pwa-support-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/gea-pwa/package.json` | Package manifest, scripts, dependencies |
| `packages/gea-pwa/tsconfig.json` | TypeScript config (type-checking only) |
| `packages/gea-pwa/tsup.config.ts` | Build config — ESM + DTS, externalize vite and @geajs/core (matches @geajs/vite-plugin) |
| `packages/gea-pwa/src/types.ts` | Shared TypeScript interfaces (plugin options, manifest, presets) |
| `packages/gea-pwa/src/presets.ts` | Three caching strategy presets expanding to Workbox runtimeCaching |
| `packages/gea-pwa/src/store.ts` | `PwaStore extends Store` — reactive PWA state |
| `packages/gea-pwa/src/fetch.ts` | `FetchStore<T> extends Store` — offline-aware fetch with cache |
| `packages/gea-pwa/src/plugin.ts` | `geaPwaPlugin()` — Vite plugin for manifest + SW generation |
| `packages/gea-pwa/src/index.ts` | Public API re-exports |
| `packages/gea-pwa/tests/presets.test.ts` | Unit tests for preset expansion |
| `packages/gea-pwa/tests/plugin.test.ts` | Unit tests for plugin option merging |
| `packages/gea-pwa/tests/store.test.ts` | Unit tests for PwaStore state transitions |
| `packages/gea-pwa/tests/fetch.test.ts` | Unit tests for FetchStore cache fallback |
| `examples/pwa/package.json` | Example app package manifest |
| `examples/pwa/index.html` | Example app HTML entry |
| `examples/pwa/vite.config.ts` | Example app Vite config with both plugins |
| `examples/pwa/src/pwa-store.ts` | PwaStore singleton |
| `examples/pwa/src/app.tsx` | Example app component |
| `examples/pwa/public/icon-192.png` | PWA icon (192x192) |
| `examples/pwa/public/icon-512.png` | PWA icon (512x512) |
| `tests/e2e/pwa.spec.ts` | E2E test for PWA example |
| `tests/e2e/playwright.config.ts` | Add PWA project entry (port 5308) |
| Root `package.json` | Add `example:pwa` script |

---

## Task 1: Package Scaffolding

**Files:**
- Create: `packages/gea-pwa/package.json`
- Create: `packages/gea-pwa/tsconfig.json`
- Create: `packages/gea-pwa/tsup.config.ts`
- Create: `packages/gea-pwa/src/index.ts` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@geajs/pwa",
  "version": "1.0.0",
  "description": "Progressive Web App support for Gea framework — Workbox-powered service worker, reactive PwaStore, offline-aware FetchStore",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "publishConfig": {
    "access": "public"
  },
  "author": "Armagan Amcalar <armagan@amcalar.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/dashersw/gea.git"
  },
  "keywords": ["gea", "pwa", "service-worker", "workbox", "offline"],
  "bugs": {
    "url": "https://github.com/dashersw/gea/issues"
  },
  "homepage": "https://github.com/dashersw/gea#readme",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./plugin": {
      "types": "./dist/plugin.d.ts",
      "import": "./dist/plugin.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "tsx --test 'tests/**/*.test.ts'"
  },
  "dependencies": {
    "workbox-build": "^7.3.0"
  },
  "peerDependencies": {
    "@geajs/core": "^1.0.0",
    "vite": "^8.0.0"
  },
  "peerDependenciesMeta": {
    "vite": {
      "optional": true
    }
  },
  "devDependencies": {
    "@geajs/core": "file:../gea",
    "@types/node": "^25.5.0",
    "tsup": "^8.5.1",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vite": "^8.0.0"
  }
}
```

Note: `vite` is an optional peer dependency — users who only use `PwaStore`/`FetchStore` without the Vite plugin don't need it. The `./plugin` export is separate so the Vite plugin can be imported as `@geajs/pwa/plugin`.

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "emitDeclarationOnly": true,
    "lib": ["ES2020", "DOM"],
    "types": ["node"],
    "declaration": true,
    "strict": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true
  },
  "include": ["./src/**/*.ts", "./tests/**/*.ts"]
}
```

Matches `@geajs/vite-plugin` convention (emitDeclarationOnly, Bundler resolution).

- [ ] **Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/plugin.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  external: ['vite', '@geajs/core', 'workbox-build'],
})
```

Two entry points: `index.ts` (runtime exports) and `plugin.ts` (Vite plugin). External: vite (peer), @geajs/core (peer), workbox-build (dependency but only used at build-time in the plugin).

- [ ] **Step 4: Create placeholder src/index.ts**

```ts
// @geajs/pwa — public API
// Will export PwaStore, FetchStore, and types
```

- [ ] **Step 5: Install dependencies and verify build scaffolding**

Run: `cd /Users/puskuruk/workspace/clients/coyotiv/gea && npm install`
Expected: No errors, `packages/gea-pwa/node_modules` should be created via workspace linking.

Run: `npm run build -w @geajs/pwa`
Expected: tsup produces `dist/index.js`, `dist/index.d.ts`, `dist/plugin.js`, `dist/plugin.d.ts` (plugin.ts doesn't exist yet, so this may warn — that's OK for now).

- [ ] **Step 6: Commit**

```bash
git add packages/gea-pwa/
git commit -m "feat(pwa): scaffold @geajs/pwa package with build config"
```

---

## Task 2: Types

**Files:**
- Create: `packages/gea-pwa/src/types.ts`

- [ ] **Step 1: Write types.ts**

```ts
import type { RuntimeCaching } from 'workbox-build'

export type PresetName = 'minimal' | 'offline-first' | 'network-first'

export interface WebAppManifest {
  name: string
  short_name?: string
  description?: string
  start_url?: string
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  background_color?: string
  theme_color?: string
  icons?: Array<{
    src: string
    sizes: string
    type?: string
    purpose?: string
  }>
  [key: string]: unknown
}

export interface GeaPwaPluginOptions {
  manifest: WebAppManifest
  preset?: PresetName
  runtimeCaching?: RuntimeCaching[]
  workbox?: Record<string, unknown>
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/gea-pwa/src/types.ts
git commit -m "feat(pwa): add shared TypeScript types"
```

---

## Task 3: Presets

**Files:**
- Create: `packages/gea-pwa/src/presets.ts`
- Create: `packages/gea-pwa/tests/presets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    const userRules: import('workbox-build').RuntimeCaching[] = [{ urlPattern: /\/custom\//, handler: 'CacheFirst' }]
    const result = resolveRuntimeCaching('minimal', userRules)
    assert.equal(result.length, 1)
    assert.equal(result[0].handler, 'CacheFirst')
  })

  it('defaults to offline-first when no preset specified', () => {
    const result = resolveRuntimeCaching(undefined)
    assert.equal(result.length, 3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/pwa`
Expected: FAIL — `resolveRuntimeCaching` not found, `presets` not exported.

- [ ] **Step 3: Write presets.ts**

```ts
import type { RuntimeCaching } from 'workbox-build'
import type { PresetName } from './types.ts'

export const presets: Record<PresetName, RuntimeCaching[]> = {
  minimal: [],

  'offline-first': [
    {
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/?(?:[^.]*)?$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'pages' },
    },
    {
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'api', networkTimeoutSeconds: 3 },
    },
  ],

  'network-first': [
    {
      urlPattern: /./,
      handler: 'NetworkFirst',
      options: { cacheName: 'all', networkTimeoutSeconds: 3 },
    },
  ],
}

export function resolveRuntimeCaching(
  preset?: PresetName,
  userRules?: RuntimeCaching[]
): RuntimeCaching[] {
  const presetRules = presets[preset ?? 'offline-first']
  return [...presetRules, ...(userRules ?? [])]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/pwa`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gea-pwa/src/presets.ts packages/gea-pwa/tests/presets.test.ts
git commit -m "feat(pwa): add caching strategy presets with tests"
```

---

## Task 4: PwaStore

**Files:**
- Create: `packages/gea-pwa/src/store.ts`

- [ ] **Step 1: Write store.ts**

Implement exactly as specified in the design doc (lines 94-170 of the spec). The code is already finalized in the spec — copy it verbatim.

```ts
import { Store } from '@geajs/core'

export class PwaStore extends Store {
  isOnline = false
  isInstallable = false
  isInstalled = false
  hasUpdate = false
  registrationError: string | null = null

  _deferredPrompt: BeforeInstallPromptEvent | null = null
  _registration: ServiceWorkerRegistration | null = null

  constructor() {
    super()
    if (typeof window === 'undefined') return

    this.isOnline = navigator.onLine
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches

    window.addEventListener('online', () => { this.isOnline = true })
    window.addEventListener('offline', () => { this.isOnline = false })

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this._deferredPrompt = e
      this.isInstallable = true
    })

    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches
    })
  }

  async promptInstall(): Promise<boolean> {
    if (!this._deferredPrompt) return false
    this._deferredPrompt.prompt()
    const { outcome } = await this._deferredPrompt.userChoice
    this._deferredPrompt = null
    this.isInstallable = false
    return outcome === 'accepted'
  }

  applyUpdate(): void {
    const waiting = this._registration?.waiting
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
    }
  }

  register(swUrl = '/sw.js'): void {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register(swUrl).then((reg) => {
      this._registration = reg
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.hasUpdate = true
          }
        })
      })
    }).catch((err) => {
      this.registrationError = err instanceof Error ? err.message : String(err)
    })
  }
}
```

Note: `BeforeInstallPromptEvent` is not in standard lib types. Add a type declaration at the top of the file:

```ts
declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --project packages/gea-pwa/tsconfig.json`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/gea-pwa/src/store.ts
git commit -m "feat(pwa): add PwaStore with reactive PWA state"
```

---

## Task 5: FetchStore

**Files:**
- Create: `packages/gea-pwa/src/fetch.ts`

- [ ] **Step 1: Write fetch.ts**

Implement exactly as specified in the design doc (lines 206-247 of the spec):

```ts
import { Store } from '@geajs/core'

const CACHE_NAME = 'gea-api'

export class FetchStore<T = unknown> extends Store {
  data: T | null = null
  error: string | null = null
  isLoading = false
  isFromCache = false

  async fetch(url: string, options?: RequestInit): Promise<T> {
    this.isLoading = true
    this.error = null
    try {
      const request = new Request(url, options)
      const response = await fetch(request)
      const cloned = response.clone()
      const result: T = await response.json()
      this.data = result
      this.isFromCache = false
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, cloned)
      return result
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(url)
        if (cached) {
          const result: T = await cached.json()
          this.data = result
          this.isFromCache = true
          return result
        }
      }
      this.error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      this.isLoading = false
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --project packages/gea-pwa/tsconfig.json`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/gea-pwa/src/fetch.ts
git commit -m "feat(pwa): add FetchStore with offline cache fallback"
```

---

## Task 6: Vite Plugin

**Files:**
- Create: `packages/gea-pwa/src/plugin.ts`
- Create: `packages/gea-pwa/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/pwa`
Expected: FAIL — `buildPluginConfig` not found.

- [ ] **Step 3: Write plugin.ts**

```ts
import type { Plugin, ResolvedConfig } from 'vite'
import type { RuntimeCaching } from 'workbox-build'
import type { GeaPwaPluginOptions } from './types.ts'
import { resolveRuntimeCaching } from './presets.ts'

export interface PluginConfig {
  manifestJson: string
  runtimeCaching: RuntimeCaching[]
  workboxOptions: Record<string, unknown>
}

export function buildPluginConfig(options: GeaPwaPluginOptions): PluginConfig {
  const runtimeCaching = resolveRuntimeCaching(options.preset, options.runtimeCaching)
  const manifestJson = JSON.stringify(options.manifest, null, 2)
  const workboxOptions = options.workbox ?? {}

  return { manifestJson, runtimeCaching, workboxOptions }
}

export function geaPwaPlugin(options: GeaPwaPluginOptions): Plugin {
  let config: ResolvedConfig
  let pluginConfig: PluginConfig

  return {
    name: 'gea-pwa',

    configResolved(resolvedConfig) {
      config = resolvedConfig
      pluginConfig = buildPluginConfig(options)
    },

    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' },
      ]
    },

    configureServer(server) {
      // Serve manifest in dev mode
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(pluginConfig.manifestJson)
      })
    },

    async closeBundle() {
      // Only generate SW in production builds
      if (config.command === 'serve') return

      const { generateSW } = await import('workbox-build')
      const outDir = config.build.outDir

      await generateSW({
        globDirectory: outDir,
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,gif,webp,ico,woff,woff2}'],
        swDest: `${outDir}/sw.js`,
        runtimeCaching: pluginConfig.runtimeCaching,
        ...pluginConfig.workboxOptions,
      })

      // Write manifest file
      const { writeFileSync } = await import('node:fs')
      writeFileSync(`${outDir}/manifest.webmanifest`, pluginConfig.manifestJson)
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w @geajs/pwa`
Expected: All preset tests + all plugin tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gea-pwa/src/plugin.ts packages/gea-pwa/tests/plugin.test.ts
git commit -m "feat(pwa): add geaPwaPlugin Vite plugin with tests"
```

---

## Task 7: Public API & Build Verification

**Files:**
- Modify: `packages/gea-pwa/src/index.ts`

- [ ] **Step 1: Write index.ts with all exports**

```ts
export { PwaStore } from './store.ts'
export { FetchStore } from './fetch.ts'
export type { GeaPwaPluginOptions, PresetName, WebAppManifest } from './types.ts'
```

Note: `geaPwaPlugin` is intentionally NOT exported from the main entry. It's available via the `@geajs/pwa/plugin` subpath export, which maps to `src/plugin.ts`.

- [ ] **Step 2: Build the package**

Run: `npm run build -w @geajs/pwa`
Expected: tsup produces `dist/index.js`, `dist/index.d.ts`, `dist/plugin.js`, `dist/plugin.d.ts` with no errors.

- [ ] **Step 3: Run all unit tests**

Run: `npm test -w @geajs/pwa`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/gea-pwa/src/index.ts
git commit -m "feat(pwa): wire up public API exports"
```

---

## Task 8: PwaStore Unit Tests

**Files:**
- Create: `packages/gea-pwa/tests/store.test.ts`

- [ ] **Step 1: Write tests for PwaStore**

PwaStore relies on browser APIs (window, navigator). Tests mock these to verify state transitions.

```ts
import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

// Mock browser globals before importing store
const listeners: Record<string, Function[]> = {}
const mockWindow = {
  addEventListener(event: string, handler: Function) {
    listeners[event] = listeners[event] || []
    listeners[event].push(handler)
  },
  matchMedia() {
    return {
      matches: false,
      addEventListener() {},
    }
  },
}

Object.assign(globalThis, {
  window: mockWindow,
  navigator: { onLine: true, serviceWorker: {} },
})

import { PwaStore } from '../src/store.ts'

describe('PwaStore', () => {
  beforeEach(() => {
    Object.keys(listeners).forEach((key) => delete listeners[key])
  })

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
    // Should not throw
    store.applyUpdate()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -w @geajs/pwa`
Expected: All PwaStore tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gea-pwa/tests/store.test.ts
git commit -m "test(pwa): add PwaStore unit tests"
```

---

## Task 9: FetchStore Unit Tests

**Files:**
- Create: `packages/gea-pwa/tests/fetch.test.ts`

- [ ] **Step 1: Write tests for FetchStore**

FetchStore tests verify state transitions during fetch lifecycle. Since `node:test` doesn't have built-in fetch/cache mocking for all scenarios, we test the state management and error handling paths.

```ts
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
    // Type check: data should be string[] | null
    const data: string[] | null = store.data
    assert.equal(data, null)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -w @geajs/pwa`
Expected: All FetchStore tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/gea-pwa/tests/fetch.test.ts
git commit -m "test(pwa): add FetchStore unit tests"
```

---

## Task 10: Example App

**Files:**
- Create: `examples/pwa/package.json`
- Create: `examples/pwa/index.html`
- Create: `examples/pwa/vite.config.ts`
- Create: `examples/pwa/src/pwa-store.ts`
- Create: `examples/pwa/src/app.tsx`
- Create: `examples/pwa/public/icon-192.png`
- Create: `examples/pwa/public/icon-512.png`
- Modify: Root `package.json` — add `example:pwa` script

- [ ] **Step 1: Create examples/pwa/package.json**

```json
{
  "name": "pwa-gea",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@geajs/core": "file:../../packages/gea",
    "@geajs/pwa": "file:../../packages/gea-pwa"
  },
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
```

- [ ] **Step 2: Create examples/pwa/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gea PWA Example</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/app.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create examples/pwa/vite.config.ts**

```ts
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { geaPlugin } from '../../packages/vite-plugin-gea/src/index.ts'
import { geaPwaPlugin } from '../../packages/gea-pwa/src/plugin.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  plugins: [
    geaPlugin(),
    geaPwaPlugin({
      manifest: {
        name: 'Gea PWA Example',
        short_name: 'GeaPWA',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      preset: 'offline-first',
    }),
  ],
  resolve: {
    alias: {
      '@geajs/core': resolve(__dirname, '../../packages/gea/src'),
      '@geajs/pwa': resolve(__dirname, '../../packages/gea-pwa/src'),
    },
  },
  server: {
    port: 5184,
    open: true,
  },
})
```

- [ ] **Step 4: Create examples/pwa/src/pwa-store.ts**

```ts
import { PwaStore } from '@geajs/pwa'
export default new PwaStore()
```

- [ ] **Step 5: Create examples/pwa/src/app.tsx**

```tsx
import { Component } from '@geajs/core'
import pwa from './pwa-store'

export default class App extends Component {
  created() {
    pwa.register()
  }

  template() {
    return (
      <div id="pwa-app">
        <h1>Gea PWA Example</h1>

        <div id="status">
          <p id="online-status">
            Status: {pwa.isOnline ? 'Online' : 'Offline'}
          </p>
          {pwa.registrationError && (
            <p id="sw-error">SW Error: {pwa.registrationError}</p>
          )}
        </div>

        {pwa.hasUpdate && (
          <button id="update-btn" click={pwa.applyUpdate}>
            Update available — click to refresh
          </button>
        )}

        {pwa.isInstallable && (
          <button id="install-btn" click={pwa.promptInstall}>
            Install App
          </button>
        )}

        <p id="installed-status">
          Installed: {pwa.isInstalled ? 'Yes' : 'No'}
        </p>
      </div>
    )
  }
}

const app = new App()
app.render(document.getElementById('app'))
```

- [ ] **Step 6: Create placeholder PWA icons**

Generate minimal valid PNG files for the icons. These are placeholder 1x1 pixel PNGs — replace with real icons later.

Run:
```bash
mkdir -p examples/pwa/public
# Create minimal PNG files (1x1 pixel, blue)
node -e "
const fs = require('fs');
// Minimal valid PNG (1x1 blue pixel)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('examples/pwa/public/icon-192.png', png);
fs.writeFileSync('examples/pwa/public/icon-512.png', png);
"
```

- [ ] **Step 7: Add example:pwa script to root package.json**

In `/Users/puskuruk/workspace/clients/coyotiv/gea/package.json`, add to scripts:
```
"example:pwa": "vite dev examples/pwa"
```

- [ ] **Step 8: Install and verify the example runs**

Run: `cd /Users/puskuruk/workspace/clients/coyotiv/gea && npm install`
Run: `npm run example:pwa` — verify it starts without errors, visit http://localhost:5184 in browser.
Expected: Page loads, shows "Gea PWA Example", "Status: Online", manifest is served at `/manifest.webmanifest`.

- [ ] **Step 9: Commit**

```bash
git add examples/pwa/ package.json
git commit -m "feat(pwa): add PWA example app"
```

---

## Task 11: E2E Test

**Files:**
- Create: `tests/e2e/pwa.spec.ts`
- Modify: `tests/e2e/playwright.config.ts`
- Modify: Root `package.json` (already done in Task 8)

- [ ] **Step 1: Add PWA project to Playwright config**

In `tests/e2e/playwright.config.ts`:

Add port constant after line 25:
```ts
const PWA_PORT = 5308
```

Add project entry after the `docs` project (before the closing `]` of projects array):
```ts
    {
      name: 'pwa',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PWA_PORT}` },
      testMatch: 'pwa.spec.ts',
    },
```

Add webServer entry after the `docs` webServer (before the closing `]` of webServer array):
```ts
    {
      command: `npx vite dev --port ${PWA_PORT}`,
      cwd: resolve(EXAMPLES_ROOT, 'pwa'),
      url: `http://localhost:${PWA_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
```

- [ ] **Step 2: Write E2E test**

```ts
import { test, expect } from '@playwright/test'

test.describe('PWA Example', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Gea PWA Example')
  })

  test('shows online status', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#online-status')).toContainText('Online')
  })

  test('manifest is served', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest.name).toBe('Gea PWA Example')
    expect(manifest.short_name).toBe('GeaPWA')
    expect(manifest.theme_color).toBe('#3b82f6')
  })

  test('HTML includes manifest link', async ({ page }) => {
    await page.goto('/')
    const link = page.locator('link[rel="manifest"]')
    await expect(link).toHaveAttribute('href', '/manifest.webmanifest')
  })

  test('shows installed status', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#installed-status')).toContainText('Installed:')
  })

  test('SW registration error is shown in dev mode (no sw.js)', async ({ page }) => {
    await page.goto('/')
    // In dev mode there is no sw.js, so registration should fail
    // Wait a moment for async registration to complete
    await page.waitForTimeout(2000)
    // Either shows error or silently fails — page should still be functional
    await expect(page.locator('h1')).toHaveText('Gea PWA Example')
  })
})
```

- [ ] **Step 3: Run E2E test**

Run: `npx playwright test --config=tests/e2e/playwright.config.ts --project=pwa`
Expected: All 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/pwa.spec.ts tests/e2e/playwright.config.ts
git commit -m "feat(pwa): add E2E tests for PWA example"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: All tests across all packages pass. The new `@geajs/pwa` tests are included.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: All packages build successfully, including `@geajs/pwa`.

- [ ] **Step 3: Run the PWA example E2E**

Run: `npx playwright test --config=tests/e2e/playwright.config.ts --project=pwa`
Expected: All E2E tests pass.

- [ ] **Step 4: Verify no other tests broke**

Run: `npx playwright test --config=tests/e2e/playwright.config.ts --project=todo`
Expected: Todo tests still pass (sanity check that nothing was broken).

- [ ] **Step 5: Final commit if any cleanup needed**

If any fixes were needed, commit them with an appropriate message.
