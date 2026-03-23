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
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: '/manifest.webmanifest' },
          injectTo: 'head',
        },
      ]
    },

    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(pluginConfig.manifestJson)
      })
    },

    async closeBundle() {
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

      const { writeFileSync } = await import('node:fs')
      writeFileSync(`${outDir}/manifest.webmanifest`, pluginConfig.manifestJson)
    },
  }
}
