---
'@geajs/core': patch
'@geajs/vite-plugin': patch
---

Fix duplicate list rows when `.map()` output lives under conditional slots (e.g. email-client folder switching): rewrite maps inside conditional-slot HTML, emit an empty string instead of `_items.join('')` in those branches so `__geaPatchCond` does not stack on `__observeList`, register map-sync observers for every resolved getter dependency path, and tighten `__reorderChildren` so empty→non-empty transitions and zero-count placeholders resync the live DOM correctly. Adds a JSDOM regression that mounts the real `examples/email-client` app.
