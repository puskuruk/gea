---
"@geajs/core": patch
"@geajs/vite-plugin": patch
"@geajs/ui": patch
---

Add style objects, ref attribute, and DnD manager overhaul; improve compiler robustness.

**@geajs/vite-plugin**

- Support inline style objects with camelCase property names (`style={{ backgroundColor: 'red' }}`). Static objects compile to CSS strings at build time; dynamic objects convert to `cssText` at runtime. Applied consistently across observe patchers, array item patchers, and conditional slot patchers.
- Support `ref={this.myProp}` attribute: compiles to a `data-gea-ref` marker and generates a `__setupRefs()` method that assigns the DOM element to the component property after render.
- Handle `key={item}` for primitive-value `.map()` lists where the item itself serves as the key, propagated through all code generators.
- Move item marker injection (`data-gea-item-id`, container id) into `processElement` in transform-jsx, removing the standalone `insertItemMarker` function.
- Collect props referenced in full conditional slot expressions (not just the condition) so `__buildProps` methods include all needed props for branch HTML rendering.
- Detect IIFE expressions as potential JSX producers so immediately-invoked arrow functions are treated as conditional slots.
- Consolidate child component injection into a single `ClassDeclaration` visitor pass instead of three separate traversals.
- Skip `data-*`, `class`, `style`, and `id` attributes when detecting hoistable root events to prevent false positives.
- Throw a clear compile error for Fragment (`<>...</>`) as `.map()` item root.
- Keyed component array refresh now uses `Map`-based reconciliation: reuses existing instances by key, disposes removed ones, and reorders DOM to match the new array order.
- HMR: skip getter/setter properties when snapshotting component state to avoid triggering side effects during hot reload.
- Log warnings instead of silently swallowing errors in `getHoistableRootEvents` and HMR code generation.

**@geajs/core**

- Add `Store.silent(fn)` method that executes mutations without triggering observers — useful for drag-and-drop and other bulk operations that handle their own DOM updates.
- Set `__geaComponent` back-reference on rendered elements so the DnD manager can walk from DOM to component instances. Cleared on dispose.
- Call `__setupRefs()` after render and re-render cycles when the method exists, enabling the `ref` attribute feature.

**@geajs/ui**

- Overhaul `DndManager` to move the actual source element instead of cloning: removes the clone-based approach, moves the element to `document.body` with fixed positioning during drag, and restores it on drop or cancel.
- Auto-discover droppables via `[data-droppable-id]` and draggables via `[data-draggable-id]` attributes — no manual registration required.
- Add animated placeholder with height transitions when moving between containers, and a shrinking ghost element at the vacated position.
- Direction-aware drop index calculation (threshold adjusts based on pointer movement direction).
- Perform DOM transfer on drop: physically move the element and update the Gea component tree (`__childComponents`, `parentComponent`) to match.
- Skip `onDragEnd` callback when dropping back at the original position.
- Export `dndManager` singleton, `DragResult` type, `Draggable`, `Droppable`, and `DragDropContext` from the package index.
