import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Monorepo root (…/gea). */
export const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..')

export function examplePath(...segments: string[]): string {
  return join(REPO_ROOT, 'examples', ...segments)
}

export function readExampleFile(...segments: string[]): string {
  return readFileSync(examplePath(...segments), 'utf8')
}
