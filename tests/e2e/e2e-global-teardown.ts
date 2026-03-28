import { existsSync, unlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT_FILE = resolve(__dirname, '.e2e-ports.json')
const SESSION_FILE = resolve(__dirname, '.e2e-session.json')

export default function globalTeardown() {
  try {
    if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE)
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE)
  } catch {
    /* ignore */
  }
}
