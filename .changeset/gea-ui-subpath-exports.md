---
"@geajs/ui": patch
---

Add per-component subpath exports (`@geajs/ui/button`, `@geajs/ui/label`, etc.) so apps can import only the modules they use. The main `@geajs/ui` entry remains available. Also export `./styles/theme.css` in package `exports`.
