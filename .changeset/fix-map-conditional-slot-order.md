---
"@geajs/core": patch
"@geajs/vite-plugin": patch
---

Fix DOM ordering when `.map()` and conditional slots are siblings in JSX

Previously, list items rendered by `.map()` were always inserted before the first conditional comment marker in the container. This broke JSX source order when a conditional preceded the map (e.g. `{cond && <Header />}` followed by `{items.map(...)}`), causing list items to appear above the header.

The compiler now records `afterCondSlotIndex` — the index of the first conditional slot that follows the map in JSX source order — and passes it to the runtime. The runtime uses this to find the exact marker to insert before, preserving the intended order regardless of how many conditionals appear before or after the map.
