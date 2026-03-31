---
"@geajs/core": patch
"@geajs/vite-plugin": patch
"@geajs/ssr": patch
---

Fix list reconciliation when stripping duplicate map output: walk to a keyed list ancestor so Card roots under keyed ProductCard rows strip correctly, while static compiled siblings (for example CommentCreate) remain. Improve DOM recovery of keyed rows from element hosts. Align store getter analysis, events, and SSR proxy serialization with the store naming refactor.
