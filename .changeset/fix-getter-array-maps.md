---
"@geajs/core": patch
"@geajs/vite-plugin": patch
---

### @geajs/vite-plugin (patch)

- **Getter-backed component array maps**: Generate delegate observers for computed getter dependencies so that component array maps (e.g. `store.filteredTracks.map(...)`) update when underlying store properties change

### @geajs/core (patch)

- **`__refreshList` runtime helper**: Add method to force-reconcile a list config by re-reading getter values through the store proxy, used by compiler-generated delegates for getter-backed array maps
