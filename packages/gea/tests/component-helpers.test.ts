import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { JSDOM } from 'jsdom'

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const raf = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number
  const caf = (id: number) => clearTimeout(id)
  dom.window.requestAnimationFrame = raf
  dom.window.cancelAnimationFrame = caf

  const prev = {
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
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf,
  })

  return () => {
    Object.assign(globalThis, prev)
    dom.window.close()
  }
}

async function loadModules() {
  const seed = `comp-helpers-${Date.now()}-${Math.random()}`
  const mgr = await import(`../src/lib/base/component-manager?${seed}`)
  mgr.default.instance = undefined
  const compMod = await import(`../src/lib/base/component.tsx?${seed}`)
  const storeMod = await import(`../src/lib/store?${seed}`)
  return {
    Component: compMod.default as typeof import('../src/lib/base/component').default,
    Store: storeMod.Store as typeof import('../src/lib/store').Store,
  }
}

describe('Component.__child', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
  })

  afterEach(() => {
    restoreDom()
  })

  it('sets parentComponent to the parent', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const child = parent.__child(Child, {})
    assert.equal(child.parentComponent, parent)
  })

  it('sets __geaCompiledChild to true on the child', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const child = parent.__child(Child, {})
    assert.equal(child.__geaCompiledChild, true)
  })

  it('passes props correctly to the child', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const child = parent.__child(Child, { color: 'blue', count: 42 })
    assert.equal(child.props.color, 'blue')
    assert.equal(child.props.count, 42)
  })

  it('registers the child in parent.__childComponents', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const child = parent.__child(Child, {})
    assert.ok(parent.__childComponents.includes(child))
  })

  it('sets __geaItemKey (stringified) when key argument is provided', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const childNumKey = parent.__child(Child, {}, 7)
    assert.equal(childNumKey.__geaItemKey, '7')

    const childStrKey = parent.__child(Child, {}, 'abc')
    assert.equal(childStrKey.__geaItemKey, 'abc')
  })

  it('does not set __geaItemKey when no key argument is provided', () => {
    class Parent extends Component {
      template() {
        return '<div></div>'
      }
    }
    class Child extends Component {
      template() {
        return '<span></span>'
      }
    }
    const parent = new Parent()
    const child = parent.__child(Child, {})
    assert.equal(child.__geaItemKey, undefined)
  })
})

describe('Component.__el', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
  })

  afterEach(() => {
    restoreDom()
  })

  it('returns element by id suffix with caching', async () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"><p id="${this.id}-info">hi</p></div>` }
    }
    const comp = new MyComp()
    document.body.innerHTML = ''
    comp.render(document.body)
    const el = comp.__el('info')
    assert.ok(el)
    assert.equal(el.textContent, 'hi')
    // Second call returns cached
    assert.equal(comp.__el('info'), el)
  })

  it('re-queries DOM when cached element is disconnected', async () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"><p id="${this.id}-info">hi</p></div>` }
    }
    const comp = new MyComp()
    document.body.innerHTML = ''
    comp.render(document.body)
    const el1 = comp.__el('info')
    assert.ok(el1)

    // Disconnect the cached element by removing it from the DOM
    el1.remove()

    // Insert a new element with the same ID
    const newP = document.createElement('p')
    newP.id = comp.id + '-info'
    newP.textContent = 'replaced'
    comp.__el('info') // should detect disconnected, re-query
    // but the element is gone now, let's put it back first
    document.getElementById(comp.id)!.appendChild(newP)

    const el2 = comp.__el('info')
    assert.ok(el2)
    assert.notEqual(el2, el1)
    assert.equal(el2.textContent, 'replaced')
  })
})

describe('Component.__updateText', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
  })

  afterEach(() => {
    restoreDom()
  })

  it('updates textContent of element by suffix', async () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"><span id="${this.id}-msg">old</span></div>` }
    }
    const comp = new MyComp()
    document.body.innerHTML = ''
    comp.render(document.body)
    comp.__updateText('msg', 'new')
    assert.equal(document.getElementById(comp.id + '-msg')?.textContent, 'new')
  })

  it('does nothing if element not found', () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    const comp = new MyComp()
    document.body.innerHTML = ''
    comp.render(document.body)
    // Should not throw when suffix does not exist in the rendered output
    comp.__updateText('nonexistent', 'text')
  })
})

describe('Component.__observe', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']
  let Store: Awaited<ReturnType<typeof loadModules>>['Store']

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
    Store = mods.Store
  })

  afterEach(() => {
    restoreDom()
  })

  it('registers observer and pushes remover to __observer_removers__', async () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    class TestStore extends Store { count = 0 }
    const store = new TestStore()
    const comp = new MyComp()
    const values: number[] = []
    comp.__observe(store, ['count'], (v: number) => values.push(v))
    assert.equal(comp.__observer_removers__.length, 1)
    store.count = 5
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual(values, [5])
    // Dispose should clean up
    comp.dispose()
    store.count = 10
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual(values, [5]) // No new value
  })
})

describe('Component.__reconcileList', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
  })

  afterEach(() => {
    restoreDom()
  })

  it('removes disposed items and keeps survivors', async () => {
    class Parent extends Component {
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)

    const items = [
      parent.__child(Item, { text: 'a' }, 1),
      parent.__child(Item, { text: 'b' }, 2),
      parent.__child(Item, { text: 'c' }, 3),
    ]
    const list = parent.__el('list')
    items.forEach(item => item.render(list))

    // Remove item with key "2"
    const newData = [{ id: 1, text: 'a' }, { id: 3, text: 'c' }]
    const result = parent.__reconcileList(
      items, newData, list, Item,
      d => ({ text: d.text }),
      d => d.id,
    )
    assert.equal(result.length, 2)
    assert.equal(result[0], items[0]) // reused
    assert.equal(result[1], items[2]) // reused
  })

  it('adds new items for new keys', async () => {
    class Parent extends Component {
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)

    const items = [
      parent.__child(Item, { text: 'a' }, 1),
    ]
    const list = parent.__el('list')
    items.forEach(item => item.render(list))

    const newData = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]
    const result = parent.__reconcileList(
      items, newData, list, Item,
      d => ({ text: d.text }),
      d => d.id,
    )
    assert.equal(result.length, 2)
    assert.equal(result[0], items[0]) // reused
    assert.notEqual(result[1], items[0]) // new component
    assert.equal(result[1].__geaItemKey, '2')
  })

  it('reorders items to match new data order', async () => {
    class Parent extends Component {
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)

    const items = [
      parent.__child(Item, { text: 'a' }, 1),
      parent.__child(Item, { text: 'b' }, 2),
      parent.__child(Item, { text: 'c' }, 3),
    ]
    const list = parent.__el('list')
    items.forEach(item => item.render(list))

    // Reverse the order
    const newData = [{ id: 3, text: 'c' }, { id: 1, text: 'a' }, { id: 2, text: 'b' }]
    const result = parent.__reconcileList(
      items, newData, list, Item,
      d => ({ text: d.text }),
      d => d.id,
    )
    assert.equal(result.length, 3)
    assert.equal(result[0], items[2]) // was third, now first
    assert.equal(result[1], items[0]) // was first, now second
    assert.equal(result[2], items[1]) // was second, now third
  })
})

describe('Component.__observeList', () => {
  let restoreDom: () => void
  let Component: Awaited<ReturnType<typeof loadModules>>['Component']
  let Store: Awaited<ReturnType<typeof loadModules>>['Store']
  let store: any

  beforeEach(async () => {
    restoreDom = installDom()
    const mods = await loadModules()
    Component = mods.Component
    Store = mods.Store

    let nextId = 1
    class TodoStore extends Store {
      todos: any[] = []
      add(text: string) { this.todos.push({ id: nextId++, text, done: false }) }
      toggle(id: number) {
        const t = this.todos.find((t: any) => t.id === id)
        if (t) t.done = !t.done
      }
      remove(id: number) {
        this.todos = this.todos.filter((t: any) => t.id !== id)
      }
    }
    store = new TodoStore()
  })

  afterEach(() => {
    restoreDom()
  })

  it('appends items on push', async () => {
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    class Parent extends Component {
      _items: any[] = []
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)
    parent.__observeList(store, ['todos'], {
      items: parent._items,
      container: () => parent.__el('list'),
      Ctor: Item,
      props: (todo: any) => ({ text: todo.text }),
      key: (todo: any) => todo.id,
    })

    store.add('first')
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(parent._items.length, 1)
    assert.equal(parent.__el('list')?.children.length, 1)
  })

  it('updates item props on property change', async () => {
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.done ? 'done' : 'todo'}</li>` }
    }
    class Parent extends Component {
      _items: any[] = []
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)
    parent.__observeList(store, ['todos'], {
      items: parent._items,
      container: () => parent.__el('list'),
      Ctor: Item,
      props: (todo: any) => ({ text: todo.text, done: todo.done }),
      key: (todo: any) => todo.id,
    })

    store.add('task')
    await new Promise(resolve => setTimeout(resolve, 50))
    const todoId = store.todos[0].id

    store.toggle(todoId)
    await new Promise(resolve => setTimeout(resolve, 50))
    // Item should have updated props
    assert.equal(parent._items[0].props.done, true)
  })

  it('reconciles on filter (remove)', async () => {
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    class Parent extends Component {
      _items: any[] = []
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)
    parent.__observeList(store, ['todos'], {
      items: parent._items,
      container: () => parent.__el('list'),
      Ctor: Item,
      props: (todo: any) => ({ text: todo.text }),
      key: (todo: any) => todo.id,
    })

    store.add('first')
    store.add('second')
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(parent._items.length, 2)
    const firstId = store.todos[0].id

    store.remove(firstId)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(parent._items.length, 1)
    assert.equal(parent._items[0].props.text, 'second')
  })
})
