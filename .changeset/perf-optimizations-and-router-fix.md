---
"@geajs/core": patch
"@geajs/vite-plugin": patch
---

### @geajs/vite-plugin (patch)

#### Compiler performance optimizations

- **DOM ref caching**: `createDataItem` now stores element references (`el.__ref_X`) during creation so propPatchers can access child elements in O(1) instead of repeated DOM traversal (`el.firstElementChild.nextElementSibling.firstElementChild`).
- **Remove `.trim()` from class expressions**: Ternary class expressions with string literals (e.g., `condition ? 'active' : ''`) can never produce leading/trailing whitespace, so the `.trim()` call was always a no-op. Removed from template rendering, prop patchers, and reactive bindings.
- **Remove `typeof` guard on `__ensureArrayConfigs`**: The compiler generates both the method and the call site, so the `typeof === "function"` check is unnecessary. Replaced with a truthy check in `createdHooks` (where the method may not exist) and a direct call in observer methods (where it always exists).
- **Replace wrapper arrows with `.bind(this)`**: Config objects for `render` and `create` now use `.bind(this)` instead of wrapping arrow functions, avoiding closure allocation.
- **Remove redundant target variable aliases**: Identity-based class observers (`:scope` selector) no longer generate a `var __target = row; if (__target)` wrapper when targeting the root element directly.
- **Hoist `__v` unwrap helper to module level**: The `__v` value-unwrap helper for identity comparisons is now emitted once at module scope instead of being re-created as a closure inside every `renderItem` call.
- **Remove optional chaining on imported stores**: `__getMapItemFromEvent` helpers no longer use `?.` on module-level store references that are guaranteed to be non-null.

### @geajs/core (patch)

#### Runtime performance optimizations

- **Proxy cache fast path**: Array index proxy cache is now checked before `Object.getPrototypeOf` in the proxy get trap, skipping the expensive prototype lookup on cache hits.

#### Router bug fix

- **Propagate guards on route group fallthrough**: When a route group's children don't match the current path, accumulated guards and layouts are now propagated to sibling routes (e.g., wildcard catch-all). Previously, guards were discarded, allowing unauthenticated access to fallback routes like 404 pages.
