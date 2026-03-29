---
'@geajs/core': patch
---

Replace `data-gea-item-id` attribute with `__geaKey` property for faster keyed list reconciliation. Add `Store.flushAll()` for deterministic store flush ordering after DOM events. Use `_geaEvt` property lookup and `textContent` clearing for faster event delegation and list rebuilds.
