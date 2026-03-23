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
