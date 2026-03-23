# @geajs/pwa — Design Spec

## Overview

A separate, opt-in package (`@geajs/pwa`) that adds Progressive Web App support to Gea applications. Wraps Google's Workbox library with opinionated presets and exposes a Gea-idiomatic `PwaStore` for reactive PWA state management.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Integration level | Separate package, not in `geaPlugin()` | Keeps core plugin zero-config; PWA is opt-in |
| Service worker toolkit | Workbox | Industry standard, battle-tested, well-documented |
| Vite integration | Separate `geaPwaPlugin()` | Follows Vite ecosystem conventions |
| Runtime API | `PwaStore extends Store` | Matches Gea's proxy-based reactivity; same pattern as Router |
| Configuration model | Preset-driven with escape hatch | 80% of users pick a preset; power users pass raw Workbox options |

## Package Structure

```
packages/gea-pwa/
├── package.json          # @geajs/pwa
├── tsconfig.json
├── tsup.config.ts        # CJS + ESM dual build (matches other packages)
├── src/
│   ├── index.ts          # Public API re-exports (PwaStore, FetchStore, types)
│   ├── plugin.ts         # geaPwaPlugin() — Vite plugin export
│   ├── presets.ts         # Caching strategy presets
│   ├── register.ts       # SW registration + update lifecycle
│   ├── store.ts          # PwaStore extends Store
│   ├── fetch.ts          # FetchStore — offline-aware fetch
│   └── types.ts          # Shared TypeScript interfaces
└── tests/
    └── *.test.ts          # Unit tests (node:test)
```

### Dependencies

- **Runtime**: `@geajs/core` (peer dependency)
- **Build-time**: `workbox-build`
- **SW runtime** (injected into generated SW, not app bundle): `workbox-precaching`, `workbox-routing`, `workbox-strategies`

## Module Design

### 1. Vite Plugin — `geaPwaPlugin(options)`

```ts
import { geaPwaPlugin } from '@geajs/pwa/plugin'

export default defineConfig({
  plugins: [
    geaPlugin(),
    geaPwaPlugin({
      manifest: {
        name: 'My App',
        short_name: 'App',
        theme_color: '#ffffff',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      preset: 'offline-first',         // optional, default: 'offline-first'
      runtimeCaching: [],               // optional, appended after preset rules
      workbox: {}                       // optional, raw workbox-build.generateSW options
    })
  ]
})
```

**Build-time behavior:**
1. Generates `manifest.webmanifest` in output directory
2. Injects `<link rel="manifest" href="/manifest.webmanifest">` into HTML
3. Calls `workbox-build.generateSW()` with preset-expanded config to produce `sw.js`
4. In dev mode: serves manifest only, skips SW generation (SW and HMR conflict)

**Plugin hooks used:** `configResolved`, `transformIndexHtml`, `closeBundle` (for SW generation after Vite finishes).

### 2. Presets — Caching Strategies

Three presets that expand to Workbox `runtimeCaching` configurations:

**`'minimal'`** — Precache app shell only, no runtime caching.

**`'offline-first'`** (default):
- `CacheFirst` for static assets (JS, CSS, fonts, images) — 30-day expiry, max 200 entries
- `StaleWhileRevalidate` for HTML navigations
- `NetworkFirst` for `/api/` requests — 3s network timeout

**`'network-first'`** — `NetworkFirst` for everything, 3s timeout, cache fallback.

User-supplied `runtimeCaching` rules are appended after preset rules, so they win on URL pattern conflicts.

### 3. PwaStore — Reactive PWA State

Extends `Store` from `@geajs/core`. Follows the same patterns as Router (browser event listeners in constructor, `_` prefix for non-reactive internals).

```ts
import { Store } from '@geajs/core'

export class PwaStore extends Store {
  // Reactive state
  isOnline = navigator.onLine
  isInstallable = false
  isInstalled = window.matchMedia('(display-mode: standalone)').matches
  hasUpdate = false

  // Non-reactive internals
  _deferredPrompt: BeforeInstallPromptEvent | null = null
  _registration: ServiceWorkerRegistration | null = null

  constructor() {
    super()
    window.addEventListener('online', () => { this.isOnline = true })
    window.addEventListener('offline', () => { this.isOnline = false })
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this._deferredPrompt = e
      this.isInstallable = true
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
      window.location.reload()
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
    })
  }
}
```

**Idiomatic usage** (singleton pattern, same as all Gea stores):

```ts
// pwa.ts
import { PwaStore } from '@geajs/pwa'
export default new PwaStore()
```

```tsx
// app.tsx
import pwa from './pwa'

export default class App extends Component {
  created() {
    pwa.register()
  }

  template() {
    return (
      <div>
        {!pwa.isOnline && <div class="offline-bar">You're offline</div>}
        {pwa.hasUpdate && <button click={pwa.applyUpdate}>Update available</button>}
        {pwa.isInstallable && <button click={pwa.promptInstall}>Install app</button>}
      </div>
    )
  }
}
```

### 4. FetchStore — Offline-Aware Fetch

A Store subclass that users extend per API concern:

```ts
import { Store } from '@geajs/core'

export class FetchStore extends Store {
  data: any = null
  error: string | null = null
  isLoading = false
  isFromCache = false

  async fetch(url: string, options?: RequestInit): Promise<any> {
    this.isLoading = true
    this.error = null
    try {
      const response = await fetch(url, options)
      this.data = await response.json()
      this.isFromCache = false
      return this.data
    } catch (err) {
      if (!navigator.onLine) {
        const cache = await caches.open('api-cache')
        const cached = await cache.match(url)
        if (cached) {
          this.data = await cached.json()
          this.isFromCache = true
          return this.data
        }
      }
      this.error = (err as Error).message
      throw err
    } finally {
      this.isLoading = false
    }
  }
}
```

**Usage:**

```ts
class TasksApi extends FetchStore {
  tasks: Task[] = []

  async loadTasks() {
    this.tasks = await this.fetch('/api/tasks')
  }
}

export default new TasksApi()
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No `serviceWorker` in navigator | `register()` is a no-op, reactive state stays at defaults |
| SW registration fails | `_registration` stays null, `hasUpdate` never flips |
| `beforeinstallprompt` not fired | `isInstallable` stays false, `promptInstall()` returns false |
| User dismisses install prompt | `isInstallable` set to false, `_deferredPrompt` cleared |
| SSR context (no `window`) | Guard with `typeof window !== 'undefined'` in constructor |
| Dev mode (no SW) | Plugin skips SW generation; `PwaStore` works but `register()` finds no SW |

## Testing Strategy

**Unit tests** (`node:test`):
- Preset expansion produces correct Workbox configs
- Plugin option merging (preset + user overrides + workbox escape hatch)
- PwaStore state transitions (mock browser APIs)
- FetchStore cache fallback logic

**E2E test** (Playwright):
- Add a `pwa` example app under `examples/`
- Test: manifest served, SW registered, offline fallback works, install prompt flow
- Project added to `tests/e2e/playwright.config.ts`

## What This Package Does NOT Do

- No UI components (install banners, offline indicators) — that's `@geajs/ui` territory
- No push notification helpers — separate concern, separate package if needed
- No background sync abstraction — Workbox handles this natively in the SW
- No modifications to `geaPlugin()` — the core Vite plugin stays zero-config
