import { defineConfig } from 'vite'
import { resolve } from 'path'
import { geaPlugin } from '../packages/vite-plugin-gea/src/index.ts'

const geaRoot = resolve(__dirname, '..')

export default defineConfig({
  plugins: [geaPlugin()],
  build: {
    outDir: 'dist-profile',
    lib: {
      entry: 'src/main-profile.js',
      name: 'app',
      formats: ['iife'],
      fileName: () => 'main.js',
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      gea: resolve(geaRoot, 'packages/gea/src'),
    },
  },
})
