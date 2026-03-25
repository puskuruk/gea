import assert from 'node:assert/strict'
import test from 'node:test'
import { transformComponentSource, geaPlugin, getJSXTagName, t } from './plugin-helpers'

test('transform creates a distinct child instance for each self-closing component use', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'
    import Counter from './counter'

    export default class ParentView extends Component {
      template() {
        return (
          <div>
            <Counter count={1} />
            <Counter count={2} />
          </div>
        )
      }
    }
  `)

  assert.match(output, /this\._counter = this\.__child\(Counter/)
  assert.match(output, /this\._counter2 = this\.__child\(Counter/)
})

test('component used only in render prop is registered when in knownComponentImports', () => {
  const output = transformComponentSource(
    `
    import { Component } from '@geajs/core'
    import MySelect from './MySelect.jsx'
    import Avatar from './Avatar.jsx'

    export default class UserPicker extends Component {
      template() {
        return (
          <div>
            <MySelect
              options={['a', 'b']}
              renderOption={(opt) => <Avatar name={opt} />}
            />
          </div>
        )
      }
    }
  `,
    new Set(['MySelect', 'Avatar']),
  )

  assert.match(
    output,
    /Component\._register\(Avatar\)/,
    'Avatar must be registered via Component._register even though it only appears in a render prop',
  )
})

test('static style object is compiled to inline CSS string', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class StyledBox extends Component {
      template() {
        return <div style={{ backgroundColor: 'red', padding: '10px', fontSize: '14px' }}>Box</div>
      }
    }
  `)
  assert.match(output, /background-color:\s*red/, 'camelCase key should be converted to kebab-case')
  assert.match(output, /padding:\s*10px/, 'padding should appear in output')
  assert.match(output, /font-size:\s*14px/, 'fontSize should become font-size')
  assert.ok(!output.includes('[object Object]'), 'Style object should not become [object Object]')
})

test('dynamic style object generates runtime conversion', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class DynStyle extends Component {
      template() {
        return <div style={{ color: this.textColor }}>Dynamic</div>
      }
    }
  `)
  assert.ok(!output.includes('[object Object]'), 'Style object should not become [object Object]')
  assert.match(output, /Object\.entries/, 'Dynamic style should use Object.entries at runtime')
})

test('string style attribute still works as before', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class InlineStyle extends Component {
      template() {
        return <div style="color: blue">Blue text</div>
      }
    }
  `)
  assert.match(output, /style="color: blue"/, 'String style should pass through unchanged')
})

test('IIFE returning JSX is detected and transformed', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class StatusView extends Component {
      template() {
        return (
          <div>
            {(() => {
              if (this.loading) return <span>Loading...</span>
              return <span>Done</span>
            })()}
          </div>
        )
      }
    }
  `)
  assert.match(output, /Loading/, 'Loading branch should be in the output')
  assert.match(output, /Done/, 'Done branch should be in the output')
  assert.ok(
    output.includes('<span>') || output.includes('`<span'),
    'JSX inside IIFE should be converted to template literal strings',
  )
})

test('IIFE with multiple return branches containing JSX is transformed', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class MultiReturn extends Component {
      template() {
        return (
          <div>
            {(() => {
              if (this.status === 'loading') return <span>Loading</span>
              if (this.status === 'error') return <span>Error</span>
              return <span>Ready</span>
            })()}
          </div>
        )
      }
    }
  `)
  assert.match(output, /Loading/, 'Loading branch should appear in output')
  assert.match(output, /Error/, 'Error branch should appear in output')
  assert.match(output, /Ready/, 'Ready branch should appear in output')
})

test('ref attribute generates data-gea-ref marker and __setupRefs method', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class Canvas extends Component {
      template() {
        return <canvas ref={this.canvasEl} width="800" height="600" />
      }
    }
  `)
  assert.match(output, /data-gea-ref="ref0"/, 'Should emit data-gea-ref marker attribute')
  assert.match(output, /__setupRefs/, 'Should generate __setupRefs method')
  assert.match(output, /querySelector.*data-gea-ref/, 'Should query for data-gea-ref elements in __setupRefs')
  assert.ok(
    !/ ref="[^"]*"/.test(output.replace(/data-gea-ref="[^"]*"/g, '')),
    'ref should not be emitted as a bare HTML attribute',
  )
})

test('multiple ref attributes get unique IDs', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class Dual extends Component {
      template() {
        return (
          <div>
            <canvas ref={this.canvas} />
            <input ref={this.input} />
          </div>
        )
      }
    }
  `)
  assert.match(output, /data-gea-ref="ref0"/, 'First ref should get ref0')
  assert.match(output, /data-gea-ref="ref1"/, 'Second ref should get ref1')
  assert.match(output, /__setupRefs/, 'Should generate __setupRefs method')
})

test('getJSXTagName handles namespaced names', () => {
  const name = t.jsxNamespacedName(t.jsxIdentifier('xlink'), t.jsxIdentifier('href'))
  assert.equal(getJSXTagName(name), 'xlink:href')
})

test('getJSXTagName handles simple identifier', () => {
  const name = t.jsxIdentifier('div')
  assert.equal(getJSXTagName(name), 'div')
})

test('getJSXTagName handles member expression', () => {
  const name = t.jsxMemberExpression(t.jsxIdentifier('React'), t.jsxIdentifier('Fragment'))
  assert.equal(getJSXTagName(name), 'React.Fragment')
})

test('HMR runtime skips accessor properties during state snapshot', () => {
  const plugin = geaPlugin()
  const load = typeof plugin.load === 'function' ? plugin.load : plugin.load?.handler
  const hmrSource = load?.call({} as never, '\0virtual:gea-hmr') as string | undefined
  assert.ok(hmrSource, 'HMR virtual module should return source code')
  assert.match(
    hmrSource!,
    /getOwnPropertyDescriptor/,
    'HMR runtime should use getOwnPropertyDescriptor to check for accessors',
  )
  assert.match(
    hmrSource!,
    /__desc\.get\s*\|\|\s*__desc\.set|__desc\s*&&\s*\(__desc\.get\s*\|\|\s*__desc\.set\)/,
    'HMR runtime should skip properties with get/set descriptors',
  )
})

test('plugin skips HMR injection for build transforms', async () => {
  const plugin = geaPlugin()
  const configResolved =
    typeof plugin.configResolved === 'function' ? plugin.configResolved : plugin.configResolved?.handler
  await configResolved?.call({} as never, { command: 'build' } as never)
  const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler

  const result = await transform?.call(
    {} as never,
    `
      import { Component } from '@geajs/core'

      export default class App extends Component {
        template() {
          return <div>Hello</div>
        }
      }
    `,
    '/virtual/build-app.jsx',
  )
  const output = typeof result === 'string' ? result : result?.code

  assert.ok(output, 'component should still be transformed during build')
  assert.doesNotMatch(output!, /virtual:gea-hmr/, 'build output should not import the HMR runtime')
  assert.doesNotMatch(output!, /import\.meta\.hot/, 'build output should not include HMR guards')
  assert.doesNotMatch(output!, /import\.meta\.url/, 'build output should not retain HMR module URLs')
})
