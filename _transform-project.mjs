import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { parseSource } from './packages/vite-plugin-gea/src/parse.ts'
import { transformComponentFile } from './packages/vite-plugin-gea/src/transform-component.ts'
import { isComponentTag } from './packages/vite-plugin-gea/src/utils.ts'
import _generate from '@babel/generator'
const generate = _generate.default || _generate
import _traverse from '@babel/traverse'
const traverse = _traverse.default || _traverse

const filePath = 'examples/jira_clone/src/views/Project.tsx'
const code = readFileSync(filePath, 'utf-8')
const parsed = parseSource(code)
if (!parsed) { console.log('parse failed'); process.exit(1) }
let { ast, imports, componentClassNames } = parsed
const storeImports = new Map()
const knownComponentImports = new Set()
const namedImportSources = new Map()
const componentImportsUsedAsTags = new Set()
const resolveImportPath = (importer, source) => {
  const base = resolve(dirname(importer), source)
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]) {
    if (existsSync(c)) return c
  }
  return null
}
const isStoreModule = (fp) => {
  if (!existsSync(fp)) return false
  const s = readFileSync(fp, 'utf8')
  return s.includes('extends Store') || s.includes('new Store(')
}
const isComponentModule = (fp) => {
  if (!existsSync(fp)) return false
  return readFileSync(fp, 'utf8').includes('extends Component')
}
traverse(ast, {
  ImportDeclaration(path) {
    const source = path.node.source.value
    const ri = source.startsWith('.') ? resolveImportPath(resolve(filePath), source) : null
    const isComp = ri ? isComponentModule(ri) : false
    path.node.specifiers.forEach((spec) => {
      if (isComp) knownComponentImports.add(spec.local.name)
      if (spec.type === 'ImportDefaultSpecifier') {
        if (ri && !isStoreModule(ri)) return
        storeImports.set(spec.local.name, source)
      } else if (spec.type === 'ImportSpecifier') {
        namedImportSources.set(spec.local.name, source)
        if (ri && isStoreModule(ri)) storeImports.set(spec.local.name, source)
        const importedName = spec.imported?.name ?? spec.local.name
        if (source === '@geajs/core' && isComponentTag(importedName) && !['Component','Store'].includes(importedName))
          knownComponentImports.add(spec.local.name)
      }
    })
  },
  VariableDeclarator(path) {
    const init = path.node.init
    if (init?.type === 'NewExpression' && init.callee?.type === 'Identifier' && namedImportSources.has(init.callee.name) && path.node.id?.type === 'Identifier')
      storeImports.set(path.node.id.name, namedImportSources.get(init.callee.name))
  },
})
const originalAST = parseSource(code).ast
for (const cn of componentClassNames) {
  transformComponentFile(ast, imports, storeImports, cn, resolve(filePath), originalAST, componentImportsUsedAsTags, knownComponentImports)
}
const output = generate(ast, { retainLines: true }).code
console.log(output)
