import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { installDom, flushMicrotasks } from '../../../../tests/helpers/jsdom-setup'
import { compileJsxComponentForHmr } from '../helpers/compile'
import { HMR_RUNTIME_SOURCE } from '../../src/virtual-modules.ts'

type AcceptCallback = (newModule: unknown) => void

// The shipped `virtual:gea-hmr` module, evaluated as-is (no Vite: import.meta.hot is undefined).
const hmrRuntime = await import(`data:text/javascript,${encodeURIComponent(HMR_RUNTIME_SOURCE)}`)

describe('HMR: static components patch in place', { concurrency: false }, () => {
  let restoreDom: () => void
  let prevHot: unknown
  let selfAccept: AcceptCallback | null
  let invalidations: number

  beforeEach(() => {
    restoreDom = installDom()
    selfAccept = null
    invalidations = 0
    prevHot = (globalThis as any).__geaHmrTestHot
    ;(globalThis as any).__geaHmrTestHot = {
      accept(...args: unknown[]) {
        if (args.length === 1 && typeof args[0] === 'function') selfAccept = args[0] as AcceptCallback
      },
      invalidate() {
        invalidations++
      },
    }
  })

  afterEach(() => {
    if (prevHot === undefined) delete (globalThis as any).__geaHmrTestHot
    else (globalThis as any).__geaHmrTestHot = prevHot
    restoreDom()
  })

  const staticSource = (label: string) => `
    import { Component } from '@geajs/core'
    export default class Banner extends Component {
      template() { return <h1 class="banner">${label}</h1> }
    }
  `

  const compile = (label: string) =>
    compileJsxComponentForHmr(
      staticSource(label),
      '/virtual/Banner.tsx',
      'file:///virtual/Banner.tsx',
      'Banner',
      {},
      hmrRuntime,
    )

  it('re-renders a mounted static component without invalidating and keeps its place among siblings', async () => {
    const Banner = await compile('v1')
    assert.ok(selfAccept, 'module should self-accept')

    const root = document.createElement('div')
    document.body.appendChild(root)
    root.appendChild(document.createElement('header'))
    const banner = new Banner()
    banner.render(root)
    root.appendChild(document.createElement('footer'))
    await flushMicrotasks()
    assert.equal(root.querySelector('.banner')?.textContent, 'v1')

    const BannerV2 = await compile('v2')
    selfAccept!({ default: BannerV2 })
    await flushMicrotasks()

    assert.equal(invalidations, 0, 'a patched static component must not fall back to a reload')
    assert.equal(root.querySelector('.banner')?.textContent, 'v2', 'the hoisted template must not be stale')
    assert.deepEqual(
      Array.from(root.children).map((el) => el.tagName.toLowerCase()),
      ['header', 'h1', 'footer'],
      'the re-rendered element must keep its position',
    )
    assert.equal(banner.el, root.children[1], 'the instance must track the new element')
    banner.dispose()
    assert.deepEqual(
      Array.from(root.children).map((el) => el.tagName.toLowerCase()),
      ['header', 'footer'],
    )
  })
})
