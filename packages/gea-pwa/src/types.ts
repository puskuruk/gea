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
