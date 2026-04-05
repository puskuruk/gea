---
"@geajs/core": minor
"@geajs/vite-plugin": minor
---

### @geajs/core (minor)

**Convert runtime internals to module-level functions with tree-shaking and performance optimizations.**

#### Architecture

- Replace ~25 symbol-keyed store instance methods with plain module-level functions, eliminating symbol dispatch overhead
- Convert component, router, and list subsystem methods to symbol-keyed functions with `/*#__PURE__*/` annotations for tree-shaking
- Thread `StoreInstancePrivate` through the entire reactivity pipeline to eliminate redundant `WeakMap.get()` lookups

#### Store performance optimizations

- **Targeted array index cache invalidation**: Per-index `arrayIndexProxyCache` eviction instead of full-array clear on single-element set/delete
- **Pipeline threading**: Pass private state (`p`) through `_deliverArrayBatch`, `_getObserverNode`, `_collectMatchingNodes`, `_notify`, `_normalizeBatch`, `_commitObjSet`, `_createProxy`, and `_rootPathPartsCache`
- **Pre-computed `shouldSkipReactiveWrapForPath`**: Evaluate once per proxy creation instead of on every get-trap invocation
- **Single global microtask scheduler**: Replace per-store `queueMicrotask` calls with a shared `_flushAllPending` function
- **Fast-path single-change batches**: Skip `Map` allocation in `_deliverTopLevelBatch` for the common single-property-update case

### @geajs/vite-plugin (minor)

Update compiler codegen to emit the new module-level function calls and symbol-keyed method references from the core refactor.
