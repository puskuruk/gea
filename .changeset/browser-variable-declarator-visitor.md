---
"@geajs/vite-plugin": patch
---

### @geajs/vite-plugin (patch)

- **Add missing VariableDeclarator visitor to browser compiler**: The browser compiler now correctly recognizes `const store = new CounterStore()` patterns and registers them in `storeImports`, matching the behavior of the Vite plugin compiler
- **Remove dead componentImportSet code**: Removed unused `componentImportSet` variable and its population that was never consumed in the browser compiler
