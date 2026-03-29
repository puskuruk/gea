---
'@geajs/vite-plugin': patch
---

Fix bare text expressions with empty initial values not updating when the browser omits the text node. Create and insert the text node on demand in both __onPropChange and store observer codegen.
