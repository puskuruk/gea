---
'@geajs/core': patch
'@geajs/vite-plugin': patch
---

Reduce compiled output weight and runtime overhead for map-rendered lists:
eliminate redundant class attribute wrapping for string ternaries, skip
index computation in event handlers that don't reference it, and remove
per-row id attributes in favour of data-gea-item-id lookups.
