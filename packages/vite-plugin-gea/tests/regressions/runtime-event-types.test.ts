import assert from 'node:assert/strict'
import test from 'node:test'
import { transformComponentSource } from './plugin-helpers'
import { toGeaEventType, EVENT_NAMES } from '../../src/component-event-helpers'
import { installDom, flushMicrotasks } from '../../../../tests/helpers/jsdom-setup'
import { compileJsxComponent, loadRuntimeModules } from '../helpers/compile'

// ---------------------------------------------------------------------------
// toGeaEventType unit tests
// ---------------------------------------------------------------------------

test('toGeaEventType: bare lowercase event names pass through unchanged', () => {
  assert.equal(toGeaEventType('click'), 'click')
  assert.equal(toGeaEventType('mouseover'), 'mouseover')
  assert.equal(toGeaEventType('contextmenu'), 'contextmenu')
  assert.equal(toGeaEventType('mouseenter'), 'mouseenter')
  assert.equal(toGeaEventType('mouseleave'), 'mouseleave')
  assert.equal(toGeaEventType('pointerdown'), 'pointerdown')
  assert.equal(toGeaEventType('scroll'), 'scroll')
})

test('toGeaEventType: on-prefix single-word events lowercase correctly', () => {
  assert.equal(toGeaEventType('onClick'), 'click')
  assert.equal(toGeaEventType('onInput'), 'input')
  assert.equal(toGeaEventType('onSubmit'), 'submit')
  assert.equal(toGeaEventType('onScroll'), 'scroll')
  assert.equal(toGeaEventType('onBlur'), 'blur')
  assert.equal(toGeaEventType('onFocus'), 'focus')
})

test('toGeaEventType: on-prefix multi-word events fully lowercase', () => {
  assert.equal(toGeaEventType('onMouseOver'), 'mouseover')
  assert.equal(toGeaEventType('onMouseOut'), 'mouseout')
  assert.equal(toGeaEventType('onMouseEnter'), 'mouseenter')
  assert.equal(toGeaEventType('onMouseLeave'), 'mouseleave')
  assert.equal(toGeaEventType('onMouseDown'), 'mousedown')
  assert.equal(toGeaEventType('onMouseUp'), 'mouseup')
  assert.equal(toGeaEventType('onMouseMove'), 'mousemove')
  assert.equal(toGeaEventType('onContextMenu'), 'contextmenu')
  assert.equal(toGeaEventType('onKeyDown'), 'keydown')
  assert.equal(toGeaEventType('onKeyUp'), 'keyup')
  assert.equal(toGeaEventType('onKeyPress'), 'keypress')
  assert.equal(toGeaEventType('onTouchStart'), 'touchstart')
  assert.equal(toGeaEventType('onTouchEnd'), 'touchend')
  assert.equal(toGeaEventType('onTouchMove'), 'touchmove')
  assert.equal(toGeaEventType('onPointerDown'), 'pointerdown')
  assert.equal(toGeaEventType('onPointerUp'), 'pointerup')
  assert.equal(toGeaEventType('onPointerMove'), 'pointermove')
  assert.equal(toGeaEventType('onDragStart'), 'dragstart')
  assert.equal(toGeaEventType('onDragEnd'), 'dragend')
  assert.equal(toGeaEventType('onDragOver'), 'dragover')
  assert.equal(toGeaEventType('onDragLeave'), 'dragleave')
  assert.equal(toGeaEventType('onDrop'), 'drop')
})

test('toGeaEventType: camelCase custom events pass through unchanged', () => {
  assert.equal(toGeaEventType('longTap'), 'longTap')
  assert.equal(toGeaEventType('swipeRight'), 'swipeRight')
  assert.equal(toGeaEventType('tap'), 'tap')
})

// ---------------------------------------------------------------------------
// EVENT_NAMES completeness
// ---------------------------------------------------------------------------

test('EVENT_NAMES includes all standard DOM events declared in jsx-runtime', () => {
  const jsxRuntimeEvents = [
    'click', 'dblclick', 'change', 'input', 'submit', 'reset',
    'focus', 'blur', 'keydown', 'keyup', 'keypress',
    'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
    'touchstart', 'touchend', 'touchmove',
    'pointerdown', 'pointerup', 'pointermove',
    'scroll', 'resize',
    'drag', 'dragstart', 'dragend', 'dragover', 'dragleave', 'drop',
    'contextmenu', 'mousemove',
  ]
  for (const ev of jsxRuntimeEvents) {
    assert.ok(EVENT_NAMES.has(ev), `EVENT_NAMES is missing "${ev}"`)
  }
})

// ---------------------------------------------------------------------------
// Compiler codegen: events getter emitted for new event types
// ---------------------------------------------------------------------------

test('compiler emits events getter for mouseover handler', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class HoverBox extends Component {
      template() {
        return <div class="box" mouseover={() => console.log('over')}>hover me</div>
      }
    }
  `)

  assert.match(output, /get events\(\)/, 'events getter must be emitted')
  assert.match(output, /mouseover:\s*\{/, 'mouseover handler must appear in events')
  assert.doesNotMatch(output, /mouseover="\$\{/, 'mouseover must NOT leak as html attribute')
})

test('compiler emits events getter for contextmenu handler', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class ContextBox extends Component {
      template() {
        return <div class="box" contextmenu={(e) => e.preventDefault()}>right click</div>
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /contextmenu:\s*\{/)
})

test('compiler emits events getter for mouseenter and mouseleave', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class HoverCard extends Component {
      template() {
        return (
          <div class="card"
            mouseenter={() => console.log('enter')}
            mouseleave={() => console.log('leave')}
          >
            card
          </div>
        )
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /mouseenter:\s*\{/)
  assert.match(output, /mouseleave:\s*\{/)
})

test('compiler emits events getter for onMouseOver (React-style on-prefix)', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class HoverBox extends Component {
      handleOver() { console.log('over') }
      template() {
        return <div class="box" onMouseOver={this.handleOver}>hover</div>
      }
    }
  `)

  assert.match(output, /get events\(\)/, 'events getter must be emitted for onMouseOver')
  assert.match(output, /mouseover:\s*\{/, 'onMouseOver must compile to mouseover event type')
  assert.doesNotMatch(output, /onmouseover=/, 'onMouseOver must NOT leak as html attribute')
})

test('compiler emits events getter for onContextMenu (React-style on-prefix)', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class ContextBox extends Component {
      template() {
        return <div class="box" onContextMenu={(e) => e.preventDefault()}>right click</div>
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /contextmenu:\s*\{/, 'onContextMenu must compile to contextmenu')
})

test('compiler emits events getter for pointer events', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class DrawCanvas extends Component {
      template() {
        return (
          <div class="canvas"
            pointerdown={() => console.log('down')}
            pointermove={() => console.log('move')}
            pointerup={() => console.log('up')}
          >
            draw
          </div>
        )
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /pointerdown:\s*\{/)
  assert.match(output, /pointermove:\s*\{/)
  assert.match(output, /pointerup:\s*\{/)
})

test('compiler emits events getter for touch events', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class SwipeArea extends Component {
      template() {
        return (
          <div class="area"
            touchstart={() => console.log('start')}
            touchmove={() => console.log('move')}
            touchend={() => console.log('end')}
          >
            swipe
          </div>
        )
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /touchstart:\s*\{/)
  assert.match(output, /touchmove:\s*\{/)
  assert.match(output, /touchend:\s*\{/)
})

test('compiler emits events getter for scroll and resize', () => {
  const output = transformComponentSource(`
    import { Component } from '@geajs/core'

    export default class ScrollBox extends Component {
      template() {
        return (
          <div class="scrollable"
            scroll={() => console.log('scroll')}
            resize={() => console.log('resize')}
          >
            content
          </div>
        )
      }
    }
  `)

  assert.match(output, /get events\(\)/)
  assert.match(output, /scroll:\s*\{/)
  assert.match(output, /resize:\s*\{/)
})

// ---------------------------------------------------------------------------
// JSDOM runtime: dispatched events fire through Gea's event delegation
// ---------------------------------------------------------------------------

test('mouseover event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-mouseover`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const HoverBox = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class HoverBox extends Component {
          hovered = false

          template() {
            return (
              <div class="wrapper">
                <div class="box" mouseover={() => (this.hovered = true)}>hover</div>
              </div>
            )
          }
        }
      `,
      '/virtual/HoverBox.jsx',
      'HoverBox',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new HoverBox()
    view.render(root)
    await flushMicrotasks()

    assert.equal(view.hovered, false)

    const box = view.el.querySelector('.box') as HTMLElement
    assert.ok(box, '.box element must exist')
    box.dispatchEvent(new window.Event('mouseover', { bubbles: true }))
    await flushMicrotasks()

    assert.equal(view.hovered, true, 'mouseover handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('mouseenter event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-mouseenter`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const HoverCard = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class HoverCard extends Component {
          entered = false

          template() {
            return (
              <div class="wrapper">
                <div class="card" mouseenter={() => (this.entered = true)}>card</div>
              </div>
            )
          }
        }
      `,
      '/virtual/HoverCardEnter.jsx',
      'HoverCard',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new HoverCard()
    view.render(root)
    await flushMicrotasks()

    const card = view.el.querySelector('.card') as HTMLElement
    assert.ok(card, '.card element must exist')

    card.dispatchEvent(new window.Event('mouseenter', { bubbles: false }))
    await flushMicrotasks()
    assert.equal(view.entered, true, 'mouseenter handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('mouseleave event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-mouseleave`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const HoverCard = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class HoverCard extends Component {
          left = false

          template() {
            return (
              <div class="wrapper">
                <div class="card" mouseleave={() => (this.left = true)}>card</div>
              </div>
            )
          }
        }
      `,
      '/virtual/HoverCardLeave.jsx',
      'HoverCard',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new HoverCard()
    view.render(root)
    await flushMicrotasks()

    const card = view.el.querySelector('.card') as HTMLElement
    assert.ok(card, '.card element must exist')

    card.dispatchEvent(new window.Event('mouseleave', { bubbles: false }))
    await flushMicrotasks()
    assert.equal(view.left, true, 'mouseleave handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('contextmenu event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-contextmenu`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const ContextBox = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class ContextBox extends Component {
          menuOpened = false

          template() {
            return (
              <div class="wrapper">
                <div class="box" contextmenu={() => (this.menuOpened = true)}>right click</div>
              </div>
            )
          }
        }
      `,
      '/virtual/ContextBox.jsx',
      'ContextBox',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new ContextBox()
    view.render(root)
    await flushMicrotasks()

    const box = view.el.querySelector('.box') as HTMLElement
    assert.ok(box, '.box element must exist')
    box.dispatchEvent(new window.Event('contextmenu', { bubbles: true }))
    await flushMicrotasks()

    assert.equal(view.menuOpened, true, 'contextmenu handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('onMouseOver React-style fires through event delegation at runtime', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-onMouseOver`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const HoverBox = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class HoverBox extends Component {
          hovered = false

          handleMouseOver() {
            this.hovered = true
          }

          template() {
            return (
              <div class="wrapper">
                <div class="box" onMouseOver={this.handleMouseOver}>hover</div>
              </div>
            )
          }
        }
      `,
      '/virtual/HoverBoxOnPrefix.jsx',
      'HoverBox',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new HoverBox()
    view.render(root)
    await flushMicrotasks()

    assert.equal(view.hovered, false)

    const box = view.el.querySelector('.box') as HTMLElement
    assert.ok(box, '.box element must exist')
    box.dispatchEvent(new window.Event('mouseover', { bubbles: true }))
    await flushMicrotasks()

    assert.equal(view.hovered, true, 'onMouseOver handler must fire via mouseover event')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('pointerdown event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-pointerdown`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const DrawArea = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class DrawArea extends Component {
          pressed = false

          template() {
            return (
              <div class="wrapper">
                <div class="draw" pointerdown={() => (this.pressed = true)}>draw</div>
              </div>
            )
          }
        }
      `,
      '/virtual/DrawAreaDown.jsx',
      'DrawArea',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new DrawArea()
    view.render(root)
    await flushMicrotasks()

    const area = view.el.querySelector('.draw') as HTMLElement
    assert.ok(area, '.draw element must exist')

    area.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))
    await flushMicrotasks()

    assert.equal(view.pressed, true, 'pointerdown handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('pointermove event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-pointermove`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const DrawArea = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class DrawArea extends Component {
          moved = false

          template() {
            return (
              <div class="wrapper">
                <div class="draw" pointermove={() => (this.moved = true)}>draw</div>
              </div>
            )
          }
        }
      `,
      '/virtual/DrawAreaMove.jsx',
      'DrawArea',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new DrawArea()
    view.render(root)
    await flushMicrotasks()

    const area = view.el.querySelector('.draw') as HTMLElement
    assert.ok(area, '.draw element must exist')

    area.dispatchEvent(new window.Event('pointermove', { bubbles: true }))
    await flushMicrotasks()

    assert.equal(view.moved, true, 'pointermove handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})

test('scroll event fires through event delegation', async () => {
  const restoreDom = installDom()

  try {
    const seed = `runtime-${Date.now()}-scroll`
    const [{ default: Component }] = await loadRuntimeModules(seed)

    const ScrollBox = await compileJsxComponent(
      `
        import { Component } from '@geajs/core'

        export default class ScrollBox extends Component {
          scrolled = false

          template() {
            return (
              <div class="wrapper">
                <div class="scrollable" scroll={() => (this.scrolled = true)}>content</div>
              </div>
            )
          }
        }
      `,
      '/virtual/ScrollBox.jsx',
      'ScrollBox',
      { Component },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new ScrollBox()
    view.render(root)
    await flushMicrotasks()

    const box = view.el.querySelector('.scrollable') as HTMLElement
    assert.ok(box, '.scrollable element must exist')
    box.dispatchEvent(new window.Event('scroll', { bubbles: false }))
    await flushMicrotasks()

    assert.equal(view.scrolled, true, 'scroll handler must fire')

    view.dispose()
    await flushMicrotasks()
  } finally {
    restoreDom()
  }
})
