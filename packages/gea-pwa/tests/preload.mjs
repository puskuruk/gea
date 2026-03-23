import { JSDOM } from 'jsdom'

if (typeof globalThis.document === 'undefined') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  const raf = (cb) => setTimeout(() => cb(Date.now()), 0)
  const caf = (id) => clearTimeout(id)
  dom.window.requestAnimationFrame = raf
  dom.window.cancelAnimationFrame = caf

  // Mock matchMedia (not available in jsdom)
  dom.window.matchMedia =
    dom.window.matchMedia ||
    function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false
        },
      }
    }

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
    MouseEvent: dom.window.MouseEvent,
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf,
    localStorage: dom.window.localStorage,
  })
}

// Add navigator.onLine and serviceWorker mock
if (!globalThis.navigator.onLine) {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, writable: true })
}
if (!globalThis.navigator.serviceWorker) {
  Object.defineProperty(globalThis.navigator, 'serviceWorker', { value: {}, writable: true })
}
