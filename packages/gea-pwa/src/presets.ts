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
