import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { parseSource } from './packages/vite-plugin-gea/src/parse.ts'
import { isComponentTag } from './packages/vite-plugin-gea/src/utils.ts'
import _generate from '@babel/generator'
const generate = _generate.default || _generate
import _traverse from '@babel/traverse'
const traverse = _traverse.default || _traverse

// We need to use the OLD version of apply-reactivity and transform-component
// Instead, let's just use git to transform the file with the old code
// Actually let's just build the jira_clone with the old code and compare

// For now, let's check what the old compiled output looks like by checking out old code
console.log("Need to compare old vs new compiled output")
