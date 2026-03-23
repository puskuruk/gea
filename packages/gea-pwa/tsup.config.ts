import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/plugin.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  external: ['vite', '@geajs/core', 'workbox-build'],
})
