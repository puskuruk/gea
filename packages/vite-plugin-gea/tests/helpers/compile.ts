import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geaPlugin } from '../../src/index'

const HELPERS_DIR = dirname(fileURLToPath(import.meta.url))

/** `packages/gea-ui/src` — use with `readGeaUiSource('components', 'button.tsx')`. */
export const GEA_UI_SRC = join(HELPERS_DIR, '../../../gea-ui/src')

export function readGeaUiSource(...segments: string[]): string {
  return readFileSync(join(GEA_UI_SRC, ...segments), 'utf8')
}

/** Gea-plugin transform + esbuild + strip imports/exports for `new Function` eval. */
export async function transformGeaSourceToEvalBody(source: string, id: string): Promise<string> {
  const plugin = geaPlugin()
  const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
  const result = await transform?.call({} as never, source, id)
  assert.ok(result)

  let code = typeof result === 'string' ? result : result.code

  const esbuild = await import('esbuild')
  const stripped = await esbuild.transform(code, { loader: 'ts', target: 'esnext' })
  code = stripped.code

  return code
    .replace(/^import .*;$/gm, '')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replaceAll('import.meta.hot', 'undefined')
    .replaceAll('import.meta.url', '""')
    .replace(/export default class\s+/g, 'class ')
    .replace(/export default function\s+/g, 'function ')
    .replace(/export class\s+/g, 'class ')
    .replace(/^export type\s+[^;]+;?\s*$/gm, '')
    .replace(/export\s*\{[^}]*\}\s*;?/g, '')
}

/**
 * Compile a source file that defines multiple top-level classes (e.g. gea-ui `card.tsx`).
 * `exportNames` must list every class identifier to return from the eval closure.
 */
export async function compileJsxModule(
  source: string,
  id: string,
  exportNames: string[],
  bindings: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const body = await transformGeaSourceToEvalBody(source, id)
  const compiledSource = `${body}
return { ${exportNames.join(', ')} };`
  return new Function(...Object.keys(bindings), compiledSource)(...Object.values(bindings)) as Record<string, unknown>
}

export async function compileJsxComponent(
  source: string,
  id: string,
  className: string,
  bindings: Record<string, unknown>,
) {
  const body = await transformGeaSourceToEvalBody(source, id)
  const compiledSource = `${body}
return ${className};`
  return new Function(...Object.keys(bindings), compiledSource)(...Object.values(bindings))
}

export async function loadRuntimeModules(seed: string) {
  const { default: ComponentManager } = await import('../../../gea/src/lib/base/component-manager')
  ComponentManager.instance = undefined
  return Promise.all([
    import(`../../../gea/src/lib/base/component.tsx?${seed}`),
    import(`../../../gea/src/lib/store.ts?${seed}`),
  ])
}

/** Same `Component` module as `@geajs/ui` and `RouterView` — required when mixing compiled examples with those packages (seeded `component.tsx?seed` breaks prototype checks). */
export async function loadComponentUnseeded() {
  const { default: ComponentManager } = await import('../../../gea/src/lib/base/component-manager')
  ComponentManager.instance = undefined
  const { default: Component } = await import('../../../gea/src/lib/base/component.tsx')
  return Component
}
