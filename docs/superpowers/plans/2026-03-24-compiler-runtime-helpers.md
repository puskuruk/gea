# Compiler Runtime Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move boilerplate from compiler output into runtime helpers on Component, so compiled code is clean and minimal — matching the hand-written reference at `hand-written-TodoApp.js`.

**Architecture:** Add helper methods to the Component base class (`__child`, `__el`, `__updateText`, `__observe`, `__observeList`) that encapsulate child creation, DOM lookups, text updates, observer registration, and list reconciliation. Then update the compiler transforms to emit calls to these helpers instead of inlining the logic. The runtime helpers are additive and backward-compatible — old compiled code continues to work.

**Tech Stack:** TypeScript, Babel AST transforms, node:test

**Reference:** `hand-written-TodoApp.js` (root of repo) — the target compiled output.

---

## File Structure

### Runtime (packages/gea)
- **Modify:** `packages/gea/src/lib/base/component.tsx` — add `__child()`, `__el()`, `__updateText()`, `__observe()`, `__observeList()`, `__reconcileList()`, `__reorderChildren()` methods
- **Create:** `packages/gea/tests/component-helpers.test.ts` — tests for all new runtime helpers

### Compiler (packages/vite-plugin-gea)
- **Modify:** `packages/vite-plugin-gea/src/generate-components.ts` — change child component generation to use `__child()`; remove `__ensureChild_*`, `__refreshChildProps_*` generation; keep `__buildProps_*` (renamed concept)
- **Modify:** `packages/vite-plugin-gea/src/generate-array-slot-sync.ts` — replace `_build*Items`, `__mount*Items`, `__refresh*Items` with constructor-inline `__child()` calls and `__observeList()` in createdHooks
- **Modify:** `packages/vite-plugin-gea/src/apply-reactivity.ts` — generate `__observe()` calls instead of manual `__observer_removers__.push(store.__store.observe(...))`, generate `__observeList()` for component arrays, merge duplicate observers for computed getters (activeCount/completedCount), eliminate `__via` indirection methods
- **Modify:** `packages/vite-plugin-gea/src/generate-observe-helpers.ts` — `buildSimpleUpdate` generates `__updateText()` / `__el()` calls instead of inline `document.getElementById` + null check + `.textContent =`
- **Modify:** `packages/vite-plugin-gea/src/generate-observe.ts` — calls `buildSimpleUpdate`; may need updates for how observer methods are wired (this file orchestrates observer method construction)
- **Modify:** `packages/vite-plugin-gea/src/transform-component.ts` — stop generating `onAfterRender`/`__geaRequestRender` overrides for array mounting, stop generating `dispose()` for child components (runtime handles via `__childComponents`)
- **Update:** `packages/vite-plugin-gea/tests/regressions/plugin-jsx-codegen.test.ts` — update assertions for new output patterns
- **Update:** `packages/vite-plugin-gea/tests/regressions/plugin-store-observers.test.ts` — update assertions for `__observe()` pattern
- **Update:** `packages/vite-plugin-gea/tests/regressions/plugin-mapped-lists.test.ts` — update assertions for `__observeList()` pattern

---

## Current → Target Mapping

| Current compiler output | Target output | Runtime helper |
|---|---|---|
| `this._child = null` + `__ensureChild_child()` with lazy init | `this._child = this.__child(Ctor, props)` in constructor | `__child(Ctor, props, key?)` |
| `document.getElementById(this.id + "-b1")` with null check | `this.__el('b1')` | `__el(suffix)` |
| `if (el) { el.textContent = \`...\` }` | `this.__updateText('b1', \`...\`)` | `__updateText(suffix, text)` |
| `this.__observer_removers__.push(store.__store.observe([...], ...))` | `this.__observe(store, [...], handler)` | `__observe(store, path, handler)` |
| `_buildItems` + `__mountItems` + `__refreshItems` + `onAfterRender` + `__geaRequestRender` + `createdHooks` branching | `this.__observeList(store, [...], config)` | `__observeList(store, path, config)` |
| `__observe_store_X__via` indirection methods | Eliminated — observer calls handler directly | N/A |
| `dispose() { this._child?.dispose?.(); super.dispose() }` | Eliminated — `__child()` registers in `__childComponents`, `super.dispose()` handles | N/A |
| Duplicate observers for same path (e.g. 3× `["todos"]`) | Single observer with combined handler | Compiler merging |

---

## Task 1: Runtime helper — `__child(Ctor, props, key?)`

Creates a child component, sets `parentComponent`, `__geaCompiledChild`, optional `__geaItemKey`, and registers in `__childComponents`.

**Files:**
- Modify: `packages/gea/src/lib/base/component.tsx`
- Create: `packages/gea/tests/component-helpers.test.ts`

- [ ] **Step 1: Write failing test for `__child`**

Note: the existing `packages/gea/tests/component.test.ts` already has a local `installDom()` helper. Follow the same pattern — define `installDom` locally using `JSDOM`, and use dynamic imports with cache-busting for the Component class (same as `component.test.ts` does). Look at that file for the exact import pattern.

```typescript
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

// Follow the same installDom/loadModules pattern as component.test.ts
function installDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MutationObserver: dom.window.MutationObserver, requestAnimationFrame: (cb: any) => setTimeout(cb, 0) })
}

async function flushMicrotasks() {
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
}

describe('Component.__child', () => {
  let Component: any
  let Store: any
  let seed: string

  beforeEach(async () => {
    installDom()
    seed = String(Date.now()) + Math.random()
    const [{ default: Comp }, { Store: S }] = await Promise.all([
      import(`../src/lib/base/component.tsx?${seed}`),
      import(`../src/lib/store.ts?${seed}`),
    ])
    Component = Comp
    Store = S
  })

  it('creates child with parentComponent and __geaCompiledChild set', () => {
    class Parent extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    class Child extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    const parent = new Parent()
    const child = parent.__child(Child, { foo: 'bar' })
    assert.equal(child.parentComponent, parent)
    assert.equal(child.__geaCompiledChild, true)
    assert.equal(child.props.foo, 'bar')
    assert.ok(parent.__childComponents.includes(child))
  })

  it('sets __geaItemKey when key argument provided', () => {
    class Parent extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    class Child extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    const parent = new Parent()
    const child = parent.__child(Child, {}, 42)
    assert.equal(child.__geaItemKey, '42')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/core`
Expected: FAIL — `parent.__child is not a function`

- [ ] **Step 3: Implement `__child` on Component**

Add to `component.tsx` in the Component class body:

```typescript
__child<T extends Component>(Ctor: new (props: any) => T, props: any, key?: any): T {
  const child = new Ctor(props)
  child.parentComponent = this
  child.__geaCompiledChild = true
  if (key !== undefined) {
    child.__geaItemKey = String(key)
  }
  if (!this.__childComponents.includes(child)) {
    this.__childComponents.push(child)
  }
  return child
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/core`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gea/src/lib/base/component.tsx packages/gea/tests/component-helpers.test.ts
git commit -m "feat(core): add __child() runtime helper for child component creation"
```

---

## Task 2: Runtime helpers — `__el(suffix)` and `__updateText(suffix, text)`

Cached element lookup by ID suffix. Text content update with null safety.

**Files:**
- Modify: `packages/gea/src/lib/base/component.tsx`
- Modify: `packages/gea/tests/component-helpers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
describe('Component.__el', () => {
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
})

describe('Component.__updateText', () => {
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
    // Should not throw
    comp.__updateText('nonexistent', 'text')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/core`
Expected: FAIL — `comp.__el is not a function`

- [ ] **Step 3: Implement `__el` and `__updateText`**

Add `__elCache: Map<string, HTMLElement> = new Map()` to the constructor initialization (alongside `__childComponents`, `__observer_removers__`, etc.). Clear it in `__geaRequestRender` when the DOM subtree is replaced.

```typescript
__elCache = new Map<string, HTMLElement>()

__el(suffix: string): HTMLElement | null {
  let el = this.__elCache.get(suffix) ?? null
  if (!el || !el.isConnected) {
    el = document.getElementById(this.id_ + '-' + suffix)
    if (el) this.__elCache.set(suffix, el)
    else this.__elCache.delete(suffix)
  }
  return el
}

__updateText(suffix: string, text: string): void {
  const el = this.__el(suffix)
  if (el) el.textContent = text
}
```

Also add `this.__elCache.clear()` in `__geaRequestRender` after DOM replacement (where bindings/listeners are cleaned up).
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/core`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gea/src/lib/base/component.tsx packages/gea/tests/component-helpers.test.ts
git commit -m "feat(core): add __el() and __updateText() runtime helpers"
```

---

## Task 3: Runtime helper — `__observe(store, path, handler)`

Registers a store observer and automatically pushes the remover into `__observer_removers__`.

**Files:**
- Modify: `packages/gea/src/lib/base/component.tsx`
- Modify: `packages/gea/tests/component-helpers.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
describe('Component.__observe', () => {
  it('registers observer and pushes remover to __observer_removers__', async () => {
    class MyComp extends Component {
      template() { return `<div id="${this.id}"></div>` }
    }
    // Store is already in scope from the outer beforeEach (see Task 1)
    class TestStore extends Store { count = 0 }
    const store = new TestStore()
    const comp = new MyComp()
    const values: number[] = []
    comp.__observe(store, ['count'], (v: number) => values.push(v))
    assert.equal(comp.__observer_removers__.length, 1)
    store.count = 5
    await flushMicrotasks()
    assert.deepEqual(values, [5])
    // Dispose should clean up
    comp.dispose()
    store.count = 10
    await flushMicrotasks()
    assert.deepEqual(values, [5]) // No new value
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/core`
Expected: FAIL — `comp.__observe is not a function`

- [ ] **Step 3: Implement `__observe`**

```typescript
__observe(store: any, path: string[], handler: (value: any, changes: any[]) => void): void {
  const remover = store.__store.observe(path, handler)
  this.__observer_removers__.push(remover)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/core`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gea/src/lib/base/component.tsx packages/gea/tests/component-helpers.test.ts
git commit -m "feat(core): add __observe() runtime helper for store observer registration"
```

---

## Task 4: Runtime helpers — `__reconcileList` and `__reorderChildren`

Generic list reconciliation (keyed diffing, dispose removed, reorder DOM) and child DOM reordering.

**Files:**
- Modify: `packages/gea/src/lib/base/component.tsx`
- Modify: `packages/gea/tests/component-helpers.test.ts`

- [ ] **Step 1: Write failing tests for `__reconcileList`**

Test the three scenarios: items removed (filter), items added (new keys), items reordered.

```typescript
describe('Component.__reconcileList', () => {
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/core`
Expected: FAIL — `parent.__reconcileList is not a function`

- [ ] **Step 3: Implement `__reconcileList` and `__reorderChildren`**

```typescript
__reorderChildren(container: HTMLElement | null, items: Component[]): void {
  if (!container || !this.rendered_) return
  for (const item of items) {
    if (!item.rendered_) {
      if (!this.__childComponents.includes(item)) {
        this.__childComponents.push(item)
      }
      item.render(container)
    }
  }
  let cursor = container.firstChild
  for (const item of items) {
    let el = item.element_
    if (!el) continue
    while (el.parentElement && el.parentElement !== container) el = el.parentElement
    if (el !== cursor) {
      container.insertBefore(el, cursor || null)
    } else {
      cursor = cursor.nextSibling
    }
  }
}

__reconcileList(
  oldItems: Component[],
  newData: any[],
  container: HTMLElement | null,
  Ctor: new (props: any) => Component,
  propsFactory: (item: any) => any,
  keyExtractor: (item: any) => any,
): Component[] {
  const oldByKey = new Map<string, Component>()
  for (const item of oldItems) {
    if (item.__geaItemKey != null) oldByKey.set(item.__geaItemKey, item)
  }

  const next = newData.map(data => {
    const key = String(keyExtractor(data))
    const existing = oldByKey.get(key)
    if (existing) {
      existing.__geaUpdateProps(propsFactory(data))
      oldByKey.delete(key)
      return existing
    }
    return this.__child(Ctor, propsFactory(data), key)
  })

  for (const removed of oldByKey.values()) {
    removed.dispose?.()
  }

  this.__reorderChildren(container, next)

  // Clean up __childComponents
  this.__childComponents = this.__childComponents.filter(
    child => !oldItems.includes(child) || next.includes(child)
  )

  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/core`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gea/src/lib/base/component.tsx packages/gea/tests/component-helpers.test.ts
git commit -m "feat(core): add __reconcileList() and __reorderChildren() runtime helpers"
```

---

## Task 5: Runtime helper — `__observeList(store, path, config)`

The big one. Observes an array path, dispatches to the right handler based on change type (append, item prop update, or full replace). Manages the items array, mounting, reconciliation — all internally.

**Files:**
- Modify: `packages/gea/src/lib/base/component.tsx`
- Modify: `packages/gea/tests/component-helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Test the three change paths: append (push), item prop update (toggle), and full replace (filter).

Note: Use the same local `installDom`/dynamic-import pattern established in Task 1. The `Store` class is available from the same module imports.

```typescript
describe('Component.__observeList', () => {
  let store: any

  beforeEach(async () => {
    // Component and Store already loaded in outer beforeEach (see Task 1)
    class TodoStore extends Store {
      todos: any[] = []
      add(text: string) { this.todos.push({ id: Date.now(), text, done: false }) }
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

  it('appends items on push', async () => {
    class Item extends Component {
      template() { return `<li id="${this.id}">${this.props.text}</li>` }
    }
    class Parent extends Component {
      _items: any[] = []
      constructor(...args: any[]) {
        super(...args)
      }
      template() { return `<div id="${this.id}"><ul id="${this.id}-list"></ul></div>` }
      createdHooks() {
        this.__observeList(store, ['todos'], {
          items: this._items,
          container: () => this.__el('list'),
          Ctor: Item,
          props: (todo: any) => ({ text: todo.text }),
          key: (todo: any) => todo.id,
        })
      }
    }
    const parent = new Parent()
    document.body.innerHTML = ''
    parent.render(document.body)

    store.add('first')
    await flushMicrotasks()
    assert.equal(parent._items.length, 1)
    assert.equal(parent.__el('list')?.children.length, 1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w @geajs/core`
Expected: FAIL — `this.__observeList is not a function`

- [ ] **Step 3: Implement `__observeList`**

```typescript
__observeList(
  store: any,
  path: string[],
  config: {
    items: Component[]
    container: () => HTMLElement | null
    Ctor: new (props: any) => Component
    props: (item: any) => any
    key: (item: any) => any
    onchange?: () => void
  },
): void {
  this.__observe(store, path, (_value, changes) => {
    const storeData = store.__store
    const arr = path.reduce((obj: any, key: string) => obj?.[key], storeData) ?? []

    if (changes.every((c: any) => c.isArrayItemPropUpdate)) {
      // Item property update (e.g. todo.done toggled)
      for (const c of changes) {
        const item = config.items[c.arrayIndex]
        if (item) {
          item.__geaUpdateProps(config.props(arr[c.arrayIndex]))
        }
      }
    } else if (changes.length === 1 && changes[0].type === 'append') {
      // Append (push)
      const { start, count } = changes[0]
      const container = config.container()
      for (let i = 0; i < count; i++) {
        const data = arr[start + i]
        const item = this.__child(config.Ctor, config.props(data), config.key(data))
        config.items.push(item)
        if (this.rendered_ && container) item.render(container)
      }
    } else {
      // Full replace (filter, sort, reassign)
      const newItems = this.__reconcileList(
        config.items,
        arr,
        config.container(),
        config.Ctor,
        config.props,
        config.key,
      )
      config.items.length = 0
      config.items.push(...newItems)
    }

    config.onchange?.()
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w @geajs/core`
Expected: PASS

- [ ] **Step 5: Write additional tests for toggle (item prop update) and remove (replace)**

Add tests verifying:
- `store.toggle(id)` triggers item prop update path, updates just the affected item
- `store.remove(id)` triggers replace path, disposes removed item, keeps survivors

- [ ] **Step 6: Run all tests**

Run: `npm test -w @geajs/core`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/gea/src/lib/base/component.tsx packages/gea/tests/component-helpers.test.ts
git commit -m "feat(core): add __observeList() runtime helper for reactive array management"
```

---

## Task 6: Compiler — child components use `__child()` in constructor

Change how the compiler generates child component code. Instead of `this._child = null` + `__ensureChild_child()` lazy init, emit `this._child = this.__child(Ctor, this.__buildProps_child())` in the constructor. Remove `__ensureChild_*` and `__refreshChildProps_*` method generation. Keep `__buildProps_*` (it's the props factory). Remove generated `dispose()` for children.

**Files:**
- Modify: `packages/vite-plugin-gea/src/generate-components.ts`
- Modify: `packages/vite-plugin-gea/src/transform-jsx.ts` (template interpolation: `${this.__ensureChild_x()}` → `${this._x}`)
- Update: `packages/vite-plugin-gea/tests/regressions/plugin-jsx-codegen.test.ts`

- [ ] **Step 1: Update `buildInstanceStatements` in `generate-components.ts`**

Change from `this._child = null` to `this._child = this.__child(ChildTag, this.__buildProps_child())`. For no-props or direct-mapping children, pass the appropriate props inline.

- [ ] **Step 2: Remove `buildEnsureMethod` and `buildRefreshMethod` generation**

In `injectChildComponents`, remove the calls that add `__ensureChild_*` and `__refreshChildProps_*` methods to the class body. Keep `buildPropsBuilderMethod`.

- [ ] **Step 3: Remove `ensureDisposeMethod` generation for child components**

The runtime's `dispose()` now handles children via `__childComponents` (populated by `__child()`). Remove the `ensureDisposeMethod` call from `injectChildComponents`.

- [ ] **Step 4: Update template interpolation in `transform-jsx.ts`**

Change `${this.__ensureChild_x()}` references to `${this._x}` since children are already created in the constructor.

- [ ] **Step 5: Update `apply-reactivity.ts` observer generation**

Where the compiler currently generates `this.__refreshChildProps_x()` as an observer handler, change to `this._x.__geaUpdateProps(this.__buildProps_x())`.

- [ ] **Step 6: Update compiler tests**

Update assertions in `plugin-jsx-codegen.test.ts` to match new output patterns:
- Look for `this.__child(` instead of `this._child = null`
- No `__ensureChild_` methods
- No `__refreshChildProps_` methods
- No generated `dispose()` with child cleanup

- [ ] **Step 7: Run compiler tests**

Run: `npm test -w @geajs/vite-plugin`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add packages/vite-plugin-gea/src/generate-components.ts packages/vite-plugin-gea/src/transform-jsx.ts packages/vite-plugin-gea/src/apply-reactivity.ts packages/vite-plugin-gea/tests/
git commit -m "feat(vite-plugin): compiler generates __child() for child components"
```

---

## Task 7: Compiler — text updates use `__updateText()` and `__el()`

Change how the compiler generates text update observer methods. Instead of inline `document.getElementById(this.id + "-b1")` with null check and `.textContent =`, emit `this.__updateText('b1', \`...\`)`.

**Files:**
- Modify: `packages/vite-plugin-gea/src/generate-observe-helpers.ts` — `buildSimpleUpdate` generates `__updateText` calls
- Modify: `packages/vite-plugin-gea/src/generate-observe.ts` — orchestrates observer method construction, calls `buildSimpleUpdate`; may need changes for how the update expression is wired into the observer method body
- Update: `packages/vite-plugin-gea/tests/regressions/plugin-store-observers.test.ts`

- [ ] **Step 1: Modify `buildSimpleUpdate` in `generate-observe-helpers.ts` for textContent updates**

When the binding target is `textContent`, generate `this.__updateText(suffix, templateExpr)` instead of the current `if (document.getElementById(x)) { document.getElementById(x).textContent = ... }` pattern. Note: `buildSimpleUpdate` handles multiple binding types (`text`, `value`, `checked`, `class`). Only change the `textContent` path — other binding types (`value`, `checked`, `classList.toggle`) keep their current pattern for now.

- [ ] **Step 2: Update compiler tests**

Update assertions to match `__updateText(` pattern instead of `getElementById`.

- [ ] **Step 3: Run tests**

Run: `npm test -w @geajs/vite-plugin`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/vite-plugin-gea/src/generate-observe-helpers.ts packages/vite-plugin-gea/tests/
git commit -m "feat(vite-plugin): compiler generates __updateText() for text content updates"
```

---

## Task 8: Compiler — observer registration uses `__observe()`

Change `createdHooks()` generation from `this.__observer_removers__.push(store.__store.observe(...))` to `this.__observe(store, [...], handler)`.

Also merge duplicate observers: when multiple observers watch the same path (e.g. 3× `["todos"]` for activeCount, completedCount, and refreshItems), combine into a single `__observe` call with a handler that calls all individual handlers.

Eliminate `__via` indirection methods entirely.

**Files:**
- Modify: `packages/vite-plugin-gea/src/apply-reactivity.ts`
- Update: `packages/vite-plugin-gea/tests/regressions/plugin-store-observers.test.ts`

- [ ] **Step 1: Change `generateCreatedHooks` (~line 75 of `apply-reactivity.ts`) to emit `this.__observe()` calls**

The `generateCreatedHooks` function builds observer-remover push statements. Change each from:
```js
this.__observer_removers__.push(store.__store.observe(["path"], (__v, __c) => { ... }))
```
to:
```js
this.__observe(store, ["path"], (__v, __c) => { ... })
```

This is a mechanical change in the AST construction — replace the `push(store.__store.observe(...))` pattern with a `this.__observe(storeVar, pathArray, handler)` call expression.

- [ ] **Step 2: Merge duplicate path observers**

Group observer entries by `(storeVar, JSON.stringify(pathParts))` key. When multiple entries share the same key, generate a single `this.__observe` call whose handler body contains all the individual method calls. For example, three separate `["todos"]` observers become:
```js
this.__observe(store, ["todos"], (__v, __c) => {
  this.__observe_store_activeCount(__v, __c)
  this.__observe_store_completedCount(__v, __c)
  this.__refreshTodosItems(__v, __c)
})
```

The merging happens in the observer collection phase (~line 2700+ of `apply-reactivity.ts`, in the `buildCreatedHooksMethod` / observer assembly section). Build a `Map<string, ObserverEntry[]>` keyed by `storeVar:pathParts`, then emit one `__observe` call per group.

Note: for non-list scalar observers that share a path (like `activeCount` and `completedCount` both watching `["todos"]` because they're computed getters), the merged handler simply calls both individual handlers. The individual handlers still exist as methods — we're just merging the observer *registration*, not the handler logic.

- [ ] **Step 3: Eliminate `__via` method generation**

The `__via` methods (e.g. `__observe_store_activeCount__via`) exist because computed getters like `activeCount` are observed via `["todos"]` (the underlying array), not `["activeCount"]`. The `__via` method re-reads the current computed value and passes it to the actual handler. With observer merging, the merged handler can call the target handler directly with the re-read value inline:
```js
this.__observe_store_activeCount(store.activeCount, null)
```

Remove the code (~line 2700-2800 area) that generates `__via` wrapper methods and the `__geaPrev__` tracking variables. Instead, inline the re-read into the merged observer body.

- [ ] **Step 4: Update compiler tests**

- [ ] **Step 5: Run tests**

Run: `npm test -w @geajs/vite-plugin`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add packages/vite-plugin-gea/src/apply-reactivity.ts packages/vite-plugin-gea/tests/
git commit -m "feat(vite-plugin): compiler generates __observe() with merged duplicate observers"
```

---

## Task 9: Compiler — array rendering uses `__observeList()`

The biggest compiler change. Replace the four generated methods (`_buildItems`, `__mountItems`, `__refreshItems`, `__itemProps_*`) + `onAfterRender`/`__geaRequestRender` overrides with:
1. Constructor-inline `this._items = store.arr.map(item => this.__child(Ctor, this.__itemProps(item), key))`
2. `__itemProps_*(item)` method (kept — it's the props factory)
3. `this.__observeList(store, path, config)` call in `createdHooks()`
4. Template uses `${this._items.join('')}`

**Files:**
- Modify: `packages/vite-plugin-gea/src/generate-array-slot-sync.ts`
- Modify: `packages/vite-plugin-gea/src/apply-reactivity.ts` (createdHooks generation for arrays)
- Modify: `packages/vite-plugin-gea/src/transform-component.ts` (remove onAfterRender/requestRender for array mounting)
- Update: `packages/vite-plugin-gea/tests/regressions/plugin-mapped-lists.test.ts`

- [ ] **Step 1: Modify `generateComponentArrayMethods` in `generate-array-slot-sync.ts`**

Change return from `[itemPropsMethod, buildMethod, mountMethod, refreshMethod]` to just `[itemPropsMethod]`. The build, mount, and refresh logic moves to runtime.

- [ ] **Step 2: Generate constructor-inline item creation**

In the constructor injection, instead of `this._buildItems()`, emit:
```js
this._todosItems = (store.todos ?? []).map(todo => this.__child(TodoItem, this.__itemProps_todos(todo), todo.id))
```

- [ ] **Step 3: Generate `__observeList` call in `createdHooks`**

Instead of separate `observe` calls for the array + mount/refresh methods, generate:
```js
this.__observeList(store, ['todos'], {
  items: this._todosItems,
  container: () => this.__el('list'),
  Ctor: TodoItem,
  props: todo => this.__itemProps_todos(todo),
  key: todo => todo.id,
  onchange: () => this.__updateText('count', `${store.__store.activeCount} active, ${store.__store.completedCount} completed`),
})
```

Note on naming: the compiler currently generates `__itemProps_${arrayPropName}` (e.g. `__itemProps_todos`). Keep this existing convention — the hand-written reference uses `__todoItemProps` but the compiler should stick with its own naming pattern.

**Generating the `onchange` callback:** When the compiler detects that other observers watch the same array path (e.g. `["todos"]` for computed getters `activeCount`/`completedCount`), those observer handlers should be merged into the `onchange` callback of `__observeList` instead of being separate `__observe` calls. This is the integration point between Task 8 (observer merging) and Task 9. Specifically:
- During observer collection, identify which observers on a given array path are "list observers" (array refresh) vs "scalar observers" (text updates for computed getters)
- The list observer becomes the `__observeList` call
- The scalar observers on the same path become the `onchange` body
- This replaces the need for separate `__observe` calls + `__via` indirection for computed getters that depend on array paths

- [ ] **Step 4: Remove `onAfterRender`/`__geaRequestRender` array mount overrides**

In `transform-component.ts`, remove the logic that generates these overrides for component array slots.

- [ ] **Step 5: Update template interpolation for array items**

Change `${this._todosItems.map(__item => \`${__item}\`).join("")}` to `${this._todosItems.join('')}`.

- [ ] **Step 6: Update compiler tests**

- [ ] **Step 7: Run tests**

Run: `npm test -w @geajs/vite-plugin`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add packages/vite-plugin-gea/src/generate-array-slot-sync.ts packages/vite-plugin-gea/src/apply-reactivity.ts packages/vite-plugin-gea/src/transform-component.ts packages/vite-plugin-gea/tests/
git commit -m "feat(vite-plugin): compiler generates __observeList() for component array slots"
```

---

## Task 10: Integration — rebuild browser bundle and verify playground

**Files:**
- Rebuild: `website/playground/gea-compiler-browser.js`
- Rebuild: `website/playground/gea-core.js`

- [ ] **Step 1: Rebuild compiler browser bundle**

```bash
npm run build:browser -w @geajs/vite-plugin
```

- [ ] **Step 2: Rebuild gea-core runtime**

```bash
npm run build -w @geajs/core
cp packages/gea/dist/index.mjs website/playground/gea-core.js
# Strip sourcemap reference
sed -i '' '/^\/\/# sourceMappingURL=/d' website/playground/gea-core.js
```

- [ ] **Step 3: Verify playground works**

Open `website/index.html` in browser. Test both Counter and Todo examples:
- Counter: increment/decrement works
- Todo: add items, toggle done, remove items
- Compiled view shows clean output matching hand-written reference

- [ ] **Step 4: Commit**

```bash
git add website/playground/gea-compiler-browser.js website/playground/gea-core.js
git commit -m "chore: rebuild playground bundles with runtime helpers"
```

---

## Task 11: Full test suite verification

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: All 251+ vite-plugin tests pass, all 360+ core tests pass.

- [ ] **Step 2: Run all e2e tests**

```bash
npx playwright test --config=tests/e2e/playwright.config.ts
```

Expected: All 400+ e2e tests pass.

- [ ] **Step 3: Create changeset**

```bash
cat > .changeset/runtime-helpers.md << 'EOF'
---
"@geajs/core": minor
"@geajs/vite-plugin": minor
---

### @geajs/core (minor)

- **Runtime helpers**: Added `__child()`, `__el()`, `__updateText()`, `__observe()`, `__observeList()`, `__reconcileList()`, `__reorderChildren()` methods to Component base class, reducing compiled output size and complexity

### @geajs/vite-plugin (minor)

- **Cleaner compiler output**: Compiler now generates calls to runtime helpers instead of inlining boilerplate. Child components created eagerly in constructor via `__child()`. Array rendering uses `__observeList()` with change-type-aware updates (append, item prop update, full replace). Duplicate observers merged. `__via` indirection eliminated. Generated `dispose()`, `onAfterRender`, `__geaRequestRender` overrides removed where runtime handles them.
EOF
```

- [ ] **Step 4: Commit changeset**

```bash
git add .changeset/runtime-helpers.md
git commit -m "chore: add changeset for runtime helpers feature"
```
