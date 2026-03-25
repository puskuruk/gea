import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'

import babelGenerator from '@babel/generator'
import { JSDOM } from 'jsdom'

import { parseSource } from '../src/parse'
import { transformComponentFile } from '../src/transform-component'
import { geaPlugin } from '../src/index'

const generate = 'default' in babelGenerator ? babelGenerator.default : babelGenerator

function transformComponentSource(source: string): string {
  const parsed = parseSource(source)
  assert.ok(parsed)
  assert.ok(parsed.componentClassName)

  const original = parseSource(source)
  assert.ok(original)

  const transformed = transformComponentFile(
    parsed.ast,
    parsed.imports,
    new Map(),
    parsed.componentClassName!,
    '/virtual/test-component.jsx',
    original.ast,
    new Set(),
  )

  assert.equal(transformed, true)
  return generate(parsed.ast).code
}

async function transformFunctionalComponent(source: string, name = 'TestComp'): Promise<string> {
  const plugin = geaPlugin()
  const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
  const id = `/virtual/${name}.jsx`
  const result = await transform?.call({} as never, source, id)
  assert.ok(result, 'plugin transform should return a result')
  return typeof result === 'string' ? result : result.code
}

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)
  const cancelAnimationFrame = (id: number) => clearTimeout(id)

  dom.window.requestAnimationFrame = requestAnimationFrame
  dom.window.cancelAnimationFrame = cancelAnimationFrame

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    NodeFilter: globalThis.NodeFilter,
    MutationObserver: globalThis.MutationObserver,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  }

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    requestAnimationFrame,
    cancelAnimationFrame,
  })

  return () => {
    Object.assign(globalThis, previous)
    dom.window.close()
  }
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function loadRuntimeModules(seed: string) {
  const { default: ComponentManager } = await import('../../gea/src/lib/base/component-manager.ts')
  ComponentManager.instance = undefined
  return Promise.all([
    import(`../../gea/src/lib/base/component.tsx?${seed}`),
    import(`../../gea/src/lib/store.ts?${seed}`),
  ])
}

// --- Optimization #3: Prop patch methods (inlined into __onPropChange) ---
test('compiler inlines prop text patches into __onPropChange', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class PropChild extends Component {
      template(props) {
        return <div class="value">{props.count}</div>
      }
    }
  `)

  assert.match(output, /__onPropChange/)
  assert.match(output, /textContent = value/)
  assert.doesNotMatch(output, /__geaPatchProp_count\(/)
})

test('compiler inlines this.props text patches into __onPropChange', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class PropChild extends Component {
      template() {
        return <span>{this.props.label}</span>
      }
    }
  `)

  assert.match(output, /__onPropChange/)
  assert.match(output, /textContent = value/)
  assert.doesNotMatch(output, /__geaPatchProp_label\(/)
})

test('compiler inlines class prop patches into __onPropChange', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class ChildBadge extends Component {
      template({ activeClass }) {
        return <div class={activeClass}>Counter</div>
      }
    }
  `)

  assert.match(output, /__onPropChange/)
  assert.match(output, /className/)
  assert.doesNotMatch(output, /__geaPatchProp_activeClass\(/)
})

test('compiler generates __geaPatchProp_* for attribute props (data-*, aria-*)', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class StatusBadge extends Component {
      template({ dataState }) {
        return <div data-state={dataState}>Status</div>
      }
    }
  `)

  assert.match(output, /__onPropChange/)
  assert.match(output, /setAttribute/)
  assert.match(output, /removeAttribute/)
})

// --- Optimization #5: createElement uses template ---
test('ComponentManager createElement produces valid DOM from HTML string', async () => {
  const restoreDom = installDom()

  try {
    const { default: ComponentManager } = await import('../../gea/src/lib/base/component-manager.ts')
    const manager = ComponentManager.getInstance()
    const el = manager.createElement('<div id="test" class="foo">hello</div>')

    assert.ok(el)
    assert.equal(el.tagName, 'DIV')
    assert.equal(el.id, 'test')
    assert.equal(el.className, 'foo')
    assert.equal(el.textContent, 'hello')
  } finally {
    restoreDom()
  }
})

// --- Optimization #6: Store __raw ---
test('store state proxy exposes __raw as alias for __getTarget', async () => {
  const restoreDom = installDom()

  try {
    const [, { Store }] = await loadRuntimeModules(`opt-raw-${Date.now()}`)
    const store = new Store({ items: [{ id: 1, name: 'a' }] })

    assert.strictEqual(store.items.__raw, store.items.__getTarget)
    assert.ok(Array.isArray(store.items.__raw))
    assert.equal(store.items.__raw.length, 1)
    assert.equal(store.items.__raw[0].name, 'a')
  } finally {
    restoreDom()
  }
})

test('store __raw forEach passes raw values without proxy overhead', async () => {
  const restoreDom = installDom()

  try {
    const [, { Store }] = await loadRuntimeModules(`opt-raw-foreach-${Date.now()}`)
    const store = new Store({ items: [{ id: 1 }, { id: 2 }] })

    const collected: unknown[] = []
    store.items.__raw.forEach((item: { id: number }) => {
      collected.push(item)
      assert.ok(!(item as any).__isProxy, 'raw forEach should pass unproxied values')
    })

    assert.equal(collected.length, 2)
    assert.equal(collected[0], store.items.__getTarget[0])
  } finally {
    restoreDom()
  }
})

// --- Optimization #9: Style expression should not be triplicated ---
test('style object expression is computed once, not triplicated', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class StyledCard extends Component {
      template({ color }) {
        return (
          <div class="card">
            <div class="swatch" style={{ backgroundColor: color }}></div>
          </div>
        )
      }
    }
  `)

  // Object.entries().map().join() is always a string — guard is unnecessary.
  // Expect at most 2 occurrences: one in template(), one in __onPropChange().
  // Before fix: 4 occurrences (3 in template guard + 1 in __onPropChange).
  const styleExprCount = (output.match(/Object\.entries/g) || []).length
  assert.ok(
    styleExprCount <= 2,
    `Style Object.entries expression appears ${styleExprCount} times, expected at most 2 (template + prop change). Was previously triplicated in null/false guard.`,
  )
})

test('style object with literal values compiles to static CSS string', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class StaticStyle extends Component {
      template() {
        return <div style={{ backgroundColor: 'red', fontSize: '14px' }}>Hello</div>
      }
    }
  `)

  // Fully static styles should inline as a CSS string, no Object.entries at runtime
  assert.doesNotMatch(output, /Object\.entries/, 'static style should not use Object.entries at runtime')
  assert.match(output, /style="background-color: red; font-size: 14px"/)
})

test('style expression skip guard is not generated for object expressions in template', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class DynStyle extends Component {
      template({ bg }) {
        return <div style={{ backgroundColor: bg }}>X</div>
      }
    }
  `)

  // Extract just the template method output
  const templateMatch = output.match(/template\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/)
  assert.ok(templateMatch, 'should have template method')
  const templateBody = templateMatch![1]

  // Object expressions are always truthy — template should not have == null || === false guard
  assert.doesNotMatch(templateBody, /=== false/, 'template should not have === false guard for style object')
  assert.doesNotMatch(templateBody, /== null/, 'template should not have == null guard for style object')
})

// --- Optimization #10: No dead destructured props in conditional render callbacks ---
test('functional component with multiple conds omits unused destructured props from truthy callbacks', async () => {
  // This mirrors the option-card pattern: two conditionals where one's condition-only
  // variable "selected" leaks into the other's truthy callback as dead code.
  const output = await transformFunctionalComponent(
    `
    export default function OptionCard({ selected, color, label }) {
      return (
        <div>
          {selected && <span class="check">✓</span>}
          {color && (
            <div class="swatch-wrap">
              <div class={\`swatch \${selected ? 'swatch--selected' : ''}\`}></div>
            </div>
          )}
          <p class="label">{label}</p>
        </div>
      )
    }
  `,
    'OptionCard',
  )

  // Verify __geaRegisterCond is generated
  assert.match(output, /__geaRegisterCond\(0/, 'should generate __geaRegisterCond(0,...)')
  assert.match(output, /__geaRegisterCond\(1/, 'should generate __geaRegisterCond(1,...)')

  // Cond 0's truthy callback returns static HTML (✓ span) — should NOT have
  // destructured props since the HTML doesn't reference any of them.
  // Match the 4th argument (truthy callback) — either block body or expression body
  const cond0Match = output.match(
    /__geaRegisterCond\(0,\s*"c0",\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*(\(\)\s*=>\s*\{[\s\S]*?\}|\(\)\s*=>\s*[^,]+),/,
  )
  assert.ok(cond0Match, 'should find __geaRegisterCond(0,...) truthy callback')
  const cond0TruthyCallback = cond0Match![1]
  assert.doesNotMatch(
    cond0TruthyCallback,
    /const\s*\{/,
    'cond 0 truthy callback (static ✓ span) should not have any destructuring',
  )
})

// --- Optimization #7: Array patch with multiple expressions ---
test('compiler generates patch for array item with multiple text expressions', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class MultiExprList extends Component {
      constructor() {
        super()
        this.items = [{ id: 1, label: 'a' }, { id: 2, label: 'b' }]
      }

      template() {
        return (
          <ul>
            {this.items.map(item => (
              <li key={item.id} data-gea-item>
                {item.label} - {item.id}
              </li>
            ))}
          </ul>
        )
      }
    }
  `)

  assert.match(output, /__ensureArrayConfigs\(\)/)
  assert.match(output, /__applyListChanges/)
  assert.match(output, /propPatchers/)
  assert.match(output, /item\.label.*item\.id/, 'prop patcher should combine label and id in single update')
})

// --- Optimization #8: onAfterRenderAsync scheduling ---
test('onAfterRenderAsync is invoked after render', async () => {
  const restoreDom = installDom()

  try {
    const seed = `opt-raf-${Date.now()}`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    let afterRenderCalled = false
    class RafComponent extends Component {
      template() {
        return '<div>test</div>'
      }
      onAfterRenderAsync() {
        afterRenderCalled = true
      }
    }

    const root = document.createElement('div')
    document.body.appendChild(root)

    const comp = new RafComponent()
    comp.render(root)

    await flushMicrotasks()

    assert.ok(afterRenderCalled, 'onAfterRenderAsync should be called')

    comp.dispose()
  } finally {
    restoreDom()
  }
})

async function transformWithFile(source: string, filePath: string): Promise<string> {
  const plugin = geaPlugin()
  const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
  const result = await transform?.call({} as never, source, filePath)
  assert.ok(result, 'plugin transform should return a result')
  return typeof result === 'string' ? result : result.code
}

test('deduplicates store observer methods with identical bodies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gea-dedup-'))

  try {
    const storePath = join(dir, 'status-store.ts')
    const componentPath = join(dir, 'StatusDisplay.jsx')

    await writeFile(
      storePath,
      `import { Store } from '@geajs/core'
export default class StatusStore extends Store {
  activeCount = 0
  completedCount = 0
}`,
    )

    const output = await transformWithFile(
      `
        import { Component } from '@geajs/core'
        import store from './status-store'

        export default class StatusDisplay extends Component {
          template() {
            const { activeCount, completedCount } = store
            return (
              <p>{activeCount} active, {completedCount} completed</p>
            )
          }
        }
      `,
      componentPath,
    )

    assert.ok(output)

    // Count __observe_store_ method definitions
    const observeMethods = output.match(/^\s+__observe_store_\w+\s*\(/gm) || []
    assert.equal(
      observeMethods.length,
      1,
      `Expected 1 observer method but found ${observeMethods.length}: ${observeMethods.join(', ')}`,
    )

    // Both subscriptions should exist, pointing to the same method
    const observeCalls = output.match(/this\.__observe\(store/g) || []
    assert.ok(observeCalls.length >= 2, 'Should have at least 2 __observe subscriptions')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('preserves store observer methods with different bodies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gea-no-dedup-'))

  try {
    const storePath = join(dir, 'multi-store.ts')
    const componentPath = join(dir, 'MultiDisplay.jsx')

    await writeFile(
      storePath,
      `import { Store } from '@geajs/core'
export default class MultiStore extends Store {
  firstName = 'John'
  lastName = 'Doe'
}`,
    )

    const output = await transformWithFile(
      `
        import { Component } from '@geajs/core'
        import store from './multi-store'

        export default class MultiDisplay extends Component {
          template() {
            return (
              <div>
                <p>{store.firstName}</p>
                <p>{store.lastName}</p>
              </div>
            )
          }
        }
      `,
      componentPath,
    )

    assert.ok(output)

    // Each property updates a different element — both methods should be preserved
    const observeMethods = output.match(/__observe_store_\w+\s*\(/g) || []
    assert.equal(
      observeMethods.length,
      2,
      `Expected 2 observer methods but found ${observeMethods.length}: ${observeMethods.join(', ')}`,
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
