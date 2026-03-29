import assert from 'node:assert/strict'
import test from 'node:test'
import { installDom, flushMicrotasks } from '../../../../tests/helpers/jsdom-setup'
import { compileJsxComponent, loadRuntimeModules } from '../helpers/compile'

/**
 * Regression: bare `{this.email}` as a text node sibling to an <input> element
 * inside a <div> must update reactively when the state changes. Previously only
 * worked when wrapped in a <span>.
 */
test('bare text expression next to input element updates reactively', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-bare-text`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const BareTextApp = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class BareTextApp extends Component {
          email = ''

          template() {
            return (
              <div>
                <input
                  placeholder="Enter text"
                  onInput={e => {
                    this.email = e.target.value
                  }}
                  value={this.email}
                />
                {this.email}
              </div>
            )
          }
        }
      `,
      '/virtual/BareTextApp.jsx',
      'BareTextApp',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)

    const app = new BareTextApp()
    app.render(root)
    await flushMicrotasks()

    // Initially the text node should be empty
    const outerDiv = app.el
    assert.ok(outerDiv, 'outer div exists')

    // Get the text node after the input
    const input = outerDiv.querySelector('input')
    assert.ok(input, 'input exists')

    // Update the state
    app.email = 'test@example.com'
    await flushMicrotasks()

    // The bare text node should have updated
    assert.ok(
      outerDiv.textContent?.includes('test@example.com'),
      `expected textContent to include "test@example.com" but got "${outerDiv.textContent}"`,
    )

    app.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})
