import { GEA_DOM_COMPONENT } from './symbols'
import { GEA_CREATED_CALLED, GEA_DISPOSER } from './internal-symbols'
import { GEA_STATIC_ELEMENT, GEA_STATIC_TEMPLATE } from './compiled-static-symbols'
import { createDisposer, type Disposer } from './disposer'

export class CompiledStaticComponent {
  rendered = false;
  [GEA_STATIC_ELEMENT] = null as HTMLElement | null;
  [GEA_DISPOSER] = createDisposer() as Disposer;
  [GEA_CREATED_CALLED] = false

  get el(): HTMLElement | null {
    return this[GEA_STATIC_ELEMENT] ?? null
  }

  [GEA_STATIC_TEMPLATE](_disposer: Disposer): Node {
    return document.createDocumentFragment()
  }

  created(): void {
    /* no-op */
  }

  render(parent: Node, _index?: number): void {
    if (!this[GEA_CREATED_CALLED]) {
      this[GEA_CREATED_CALLED] = true
      this.created()
    }
    const node = this[GEA_STATIC_TEMPLATE](this[GEA_DISPOSER])
    parent.appendChild(node)
    if (node.nodeType === 1) this[GEA_STATIC_ELEMENT] = node as HTMLElement
    else if (node.nodeType === 11)
      this[GEA_STATIC_ELEMENT] = ((parent as Element).lastElementChild as HTMLElement | null) ?? null
    const el = this[GEA_STATIC_ELEMENT] as any
    if (el) el[GEA_DOM_COMPONENT] = this
    this.rendered = true
  }

  dispose(): void {
    this[GEA_DISPOSER].dispose()
    const e = this[GEA_STATIC_ELEMENT] as HTMLElement | null
    if (e && e.parentNode) e.parentNode.removeChild(e)
    this[GEA_STATIC_ELEMENT] = null
  }
}

export default CompiledStaticComponent
