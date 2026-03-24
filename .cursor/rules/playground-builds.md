# Playground Build Commands

The website playground bundles live in `website/playground/` and are built from `packages/vite-plugin-gea/`.

```bash
# Rebuild the Gea compiler bundle (website/playground/gea-compiler-browser.js)
npm run build:browser -w @geajs/vite-plugin

# Rebuild the CodeMirror editor bundle (website/playground/codemirror-bundle.js)
npm run build:codemirror -w @geajs/vite-plugin
```

Rebuild these after changing compiler transforms or updating CodeMirror dependencies.
