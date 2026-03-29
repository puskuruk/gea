import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import geaPreset from '@geajs/ui/tailwind-preset'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  presets: [geaPreset],
  // Absolute paths: Tailwind resolves relative globs from process.cwd(), so
  // `npm run example:jira-clone` (cwd = monorepo root) would otherwise scan the wrong trees.
  content: [
    resolve(__dirname, 'index.html'),
    resolve(__dirname, 'src/**/*.{ts,tsx}'),
    resolve(__dirname, 'node_modules/@geajs/ui/dist/**/*.mjs'),
  ],
}
