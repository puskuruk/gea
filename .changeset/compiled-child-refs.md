---
"@geajs/core": patch
---

Call compiler-generated `__setupRefs()` when mounting **compiled child** components (`mountCompiledChildComponents_`). Previously only the full `render()` path assigned `ref={this.x}` targets; nested components (e.g. `<ItemInput />` under a fragment) never ran `__setupRefs`, so `this.itemTextarea` stayed `null` after mount.
