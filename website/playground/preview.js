// website/playground/preview.js

let geaCoreBlobUrl = null

async function ensureGeaCoreBlob() {
  if (geaCoreBlobUrl) return geaCoreBlobUrl
  const resp = await fetch('./playground/gea-core.js')
  const code = await resp.text()
  const blob = new Blob([code], { type: 'application/javascript' })
  geaCoreBlobUrl = URL.createObjectURL(blob)
  return geaCoreBlobUrl
}

function rewriteImports(code, blobUrlMap, coreUrl) {
  return code
    .replace(/from\s+['"]@geajs\/core['"]/g, `from '${coreUrl}'`)
    .replace(/from\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
      const normalized = importPath.replace(/^\.\//, '')
      const candidates = [normalized, `${normalized}.ts`, `${normalized}.tsx`, `${normalized}.js`, `${normalized}.jsx`]
      for (const c of candidates) {
        if (blobUrlMap[c]) {
          return `from '${blobUrlMap[c]}'`
        }
      }
      return match
    })
}

function createBlobModules(compiledModules, fileOrder, coreUrl) {
  const blobUrls = {}

  for (const filename of fileOrder) {
    const code = compiledModules[filename]
    if (!code) continue
    const rewritten = rewriteImports(code, blobUrls, coreUrl)
    const blob = new Blob([rewritten], { type: 'application/javascript' })
    blobUrls[filename] = URL.createObjectURL(blob)
  }

  return blobUrls
}

function generateSrcdoc(entryBlobUrl, previewCSS) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: system-ui, sans-serif; color: #e0dff5; margin: 16px; }
  ${previewCSS || ''}
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
  import('${entryBlobUrl}')
</script>
</body>
</html>`
}

function generateErrorSrcdoc(errors) {
  const errorHtml = errors
    .map(
      (e) =>
        `<div style="margin-bottom:12px"><strong>${e.file}</strong><pre style="color:#ff6b6b;white-space:pre-wrap;margin:4px 0">${escapeHtml(e.message)}</pre></div>`,
    )
    .join('')
  return `<!DOCTYPE html>
<html>
<head><style>body{font-family:'IBM Plex Mono',monospace;background:#0a0a1a;color:#e0dff5;padding:16px;}pre{font-size:13px;}</style></head>
<body>
<h3 style="color:#ff2d95;margin-top:0">Compilation Error</h3>
${errorHtml}
</body>
</html>`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function renderPreview(iframe, compiledModules, fileOrder, errors, previewCSS) {
  if (iframe._blobUrls) {
    Object.values(iframe._blobUrls).forEach((url) => URL.revokeObjectURL(url))
  }

  if (errors && errors.length > 0) {
    iframe.srcdoc = generateErrorSrcdoc(errors)
    return
  }

  const coreUrl = await ensureGeaCoreBlob()
  const blobUrls = createBlobModules(compiledModules, fileOrder, coreUrl)
  iframe._blobUrls = blobUrls

  const entryFile = fileOrder[fileOrder.length - 1]
  const entryUrl = blobUrls[entryFile]

  iframe.srcdoc = generateSrcdoc(entryUrl, previewCSS)
}
