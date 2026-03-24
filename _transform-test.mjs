import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { parseSource } from './packages/vite-plugin-gea/src/parse.ts'
import { transformComponentFile } from './packages/vite-plugin-gea/src/transform-component.ts'
import { isComponentTag } from './packages/vite-plugin-gea/src/utils.ts'
import _generate from '@babel/generator'
const generate = _generate.default || _generate
import _traverse from '@babel/traverse'
const traverse = _traverse.default || _traverse

const filePath = 'examples/jira_clone/src/views/IssueDetails.tsx'
const code = readFileSync(filePath, 'utf-8')
const parsed = parseSource(code)
if (!parsed) { console.log('parse failed'); process.exit(1) }

let { ast, componentClassName, imports, componentClassNames } = parsed

const storeImports = new Map()
const knownComponentImports = new Set()
const namedImportSources = new Map()
const componentImportsUsedAsTags = new Set()

const resolveImportPath = (importer, source) => {
  const base = resolve(dirname(importer), source)
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`]
  for (const c of candidates) { if (existsSync(c)) return c }
  return null
}

const isStoreModule = (fp) => {
  if (!existsSync(fp)) return false
  const s = readFileSync(fp, 'utf8')
  return s.includes('extends Store') || s.includes('new Store(')
}
const isComponentModule = (fp) => {
  if (!existsSync(fp)) return false
  const s = readFileSync(fp, 'utf8')
  return s.includes('extends Component')
}

traverse(ast, {
  ImportDeclaration(path) {
    const source = path.node.source.value
    const resolvedImport = source.startsWith('.') ? resolveImportPath(resolve(filePath), source) : null
    const isComp = resolvedImport ? isComponentModule(resolvedImport) : false
    path.node.specifiers.forEach((spec) => {
      if (isComp) knownComponentImports.add(spec.local.name)
      if (spec.type === 'ImportDefaultSpecifier') {
        if (resolvedImport && !isStoreModule(resolvedImport)) return
        storeImports.set(spec.local.name, source)
      } else if (spec.type === 'ImportSpecifier') {
        namedImportSources.set(spec.local.name, source)
        if (resolvedImport && isStoreModule(resolvedImport)) {
          storeImports.set(spec.local.name, source)
        } else if (!resolvedImport && source === '@geajs/core' && spec.local.name === 'router') {
          storeImports.set(spec.local.name, source)
        }
        const importedName = spec.imported?.name ?? spec.local.name
        const geaCoreBaseClasses = ['Component', 'Store']
        if (source === '@geajs/core' && isComponentTag(importedName) && !geaCoreBaseClasses.includes(importedName)) {
          knownComponentImports.add(spec.local.name)
        }
      }
    })
  },
  VariableDeclarator(path) {
    const init = path.node.init
    if (init && init.type === 'NewExpression' && init.callee?.type === 'Identifier' && namedImportSources.has(init.callee.name) && path.node.id?.type === 'Identifier') {
      const source = namedImportSources.get(init.callee.name)
      storeImports.set(path.node.id.name, source)
    }
  },
})

const originalAST = parseSource(code).ast
for (const cn of componentClassNames) {
  transformComponentFile(ast, imports, storeImports, cn, resolve(filePath), originalAST, componentImportsUsedAsTags, knownComponentImports)
}

const output = generate(ast, { retainLines: true }).code
console.log(output)
