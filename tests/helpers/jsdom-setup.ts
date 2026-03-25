import { JSDOM } from 'jsdom'

/**
 * Installs JSDOM globals for Node test runs. Returns teardown that restores prior globals and closes the window.
 * Superset of former `preload.mjs` and `runtime-helpers.ts` shims.
 */
export function installDom(url = 'http://localhost/'): () => void {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url })
  const requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number
  const cancelAnimationFrame = (id: number) => clearTimeout(id)

  dom.window.requestAnimationFrame = requestAnimationFrame
  dom.window.cancelAnimationFrame = cancelAnimationFrame

  const previous = {
    CSS: (globalThis as typeof globalThis & { CSS?: unknown }).CSS,
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    HTMLUnknownElement: (globalThis as typeof globalThis & { HTMLUnknownElement?: typeof HTMLElement })
      .HTMLUnknownElement,
    Node: globalThis.Node,
    NodeFilter: globalThis.NodeFilter,
    MutationObserver: globalThis.MutationObserver,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    KeyboardEvent: (globalThis as typeof globalThis & { KeyboardEvent?: typeof KeyboardEvent }).KeyboardEvent,
    MouseEvent: (globalThis as typeof globalThis & { MouseEvent?: typeof MouseEvent }).MouseEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    localStorage: (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage,
  }

  const cssShim = {
    supports: () => false,
    escape: (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
  }
  ;(globalThis as typeof globalThis & { CSS: unknown }).CSS = cssShim as unknown
  ;(dom.window as unknown as { CSS: unknown }).CSS = cssShim as unknown

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLUnknownElement: dom.window.HTMLUnknownElement,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    requestAnimationFrame,
    cancelAnimationFrame,
    localStorage: dom.window.localStorage,
  })

  return () => {
    Object.assign(globalThis, previous)
    if (previous.CSS !== undefined) (globalThis as typeof globalThis & { CSS?: unknown }).CSS = previous.CSS
    else delete (globalThis as typeof globalThis & { CSS?: unknown }).CSS
    dom.window.close()
  }
}

/** Flush macrotasks twice — common pattern after Gea updates in JSDOM. */
export async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}
