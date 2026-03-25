import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import json from '@rollup/plugin-json'

/**
 * Rollup config for browser-compatible Gea compiler.
 *
 * Challenges solved:
 * 1. 14 files use createRequire(import.meta.url) to load @babel/traverse —
 *    a custom transform plugin rewrites to ESM imports.
 * 2. store-getter-analysis.ts and component-event-helpers.ts use readFileSync/existsSync —
 *    'node:fs' replaced with a virtual module delegating to globalThis.__geaResolveFile.
 * 3. node:path replaced with a browser-compatible path shim.
 * 4. node:module eliminated (only used for createRequire).
 */

function rewriteCreateRequire() {
  return {
    name: 'rewrite-create-require',
    transform(code, _id) {
      if (!code.includes('createRequire')) return null

      let result = code
      // Remove the 'module' import line
      result = result.replace(/import\s*\{\s*createRequire\s*\}\s*from\s*['"]module['"]\s*\n?/g, '')
      // Remove the createRequire() call
      result = result.replace(/const\s+require\s*=\s*createRequire\(import\.meta\.url\)\s*\n?/g, '')
      // Replace require('@babel/traverse').default with ESM import
      if (result.includes("require('@babel/traverse')")) {
        result = `import __babelTraverse_esm__ from '@babel/traverse'\n` + result
        result = result.replace(
          /const\s+traverse\s*=\s*require\('@babel\/traverse'\)\.default/g,
          'const traverse = __babelTraverse_esm__.default || __babelTraverse_esm__',
        )
      }

      if (result !== code) {
        return { code: result, map: null }
      }
      return null
    },
  }
}

export default {
  input: 'src/browser.ts',
  output: {
    file: '../../website/playground/gea-compiler-browser.js',
    format: 'es',
    inlineDynamicImports: true,
    intro: 'var process = { env: { NODE_ENV: "production" } };',
  },
  plugins: [
    rewriteCreateRequire(),

    {
      name: 'node-builtins-shim',
      resolveId(id) {
        if (id === 'node:fs' || id === 'fs') return '\0virtual:fs-shim'
        if (id === 'node:path' || id === 'path') return '\0virtual:path-shim'
        if (id === 'node:url') return '\0virtual:url-shim'
        if (id === 'node:module' || id === 'module') return '\0virtual:module-shim'
        return null
      },
      load(id) {
        if (id === '\0virtual:fs-shim') {
          return `
            export function existsSync(filePath) {
              const resolver = globalThis.__geaResolveFile
              if (!resolver) return false
              return resolver(filePath) !== null
            }
            export function readFileSync(filePath, encoding) {
              const resolver = globalThis.__geaResolveFile
              if (!resolver) throw new Error('No file resolver available')
              const content = resolver(filePath)
              if (content === null) throw new Error('File not found: ' + filePath)
              return content
            }
            export function writeFileSync() {}
          `
        }
        if (id === '\0virtual:path-shim') {
          return `
            export function resolve(...parts) {
              return parts.filter(Boolean).join('/')
                .replace(/\\/\\.\\//g, '/')
                .replace(/\\/+/g, '/')
            }
            export function dirname(p) {
              const parts = p.split('/')
              parts.pop()
              return parts.join('/') || '/'
            }
            export function relative(from, to) { return to }
            export function join(...parts) { return resolve(...parts) }
          `
        }
        if (id === '\0virtual:url-shim') {
          return `export function fileURLToPath(url) { return url }`
        }
        if (id === '\0virtual:module-shim') {
          return `export function createRequire() { return function() { return {} } }`
        }
        return null
      },
    },

    esbuild({
      target: 'es2020',
      sourceMap: false,
    }),

    nodeResolve({
      browser: true,
      preferBuiltins: false,
      extensions: ['.ts', '.js', '.mjs'],
    }),

    commonjs(),

    json(),
  ],
  external: [],
}
