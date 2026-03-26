---
"@geajs/core": patch
"@geajs/vite-plugin": patch
---

Use a lean root `Proxy` handler in the browser (fewer traps, no SSR branches) and reserve the full SSR overlay handler for server builds. `Store._ssrOverlayResolver` must be set before `new Store()` for SSR overlay behavior.
