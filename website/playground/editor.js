// website/playground/editor.js

let cmModules = null

async function loadCodeMirror() {
  if (cmModules) return cmModules

  const [
    { EditorState },
    { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars },
    { defaultKeymap, history, historyKeymap },
    { syntaxHighlighting, HighlightStyle, bracketMatching },
    { javascript },
    { tags },
  ] = await Promise.all([
    import('https://esm.sh/@codemirror/state@6'),
    import('https://esm.sh/@codemirror/view@6'),
    import('https://esm.sh/@codemirror/commands@6'),
    import('https://esm.sh/@codemirror/language@6'),
    import('https://esm.sh/@codemirror/lang-javascript@6'),
    import('https://esm.sh/@lezer/highlight@1'),
  ])

  const geaTheme = EditorView.theme({
    '&': {
      backgroundColor: 'rgba(13, 13, 36, 0.9)',
      color: '#e0dff5',
      fontSize: '0.9rem',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'IBM Plex Mono', monospace",
      lineHeight: '1.75',
      padding: '16px 0',
      caretColor: '#00e5ff',
    },
    '.cm-cursor': { borderLeftColor: '#00e5ff' },
    '.cm-activeLine': { backgroundColor: 'rgba(0, 229, 255, 0.04)' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(0, 229, 255, 0.15) !important' },
    '.cm-gutters': {
      backgroundColor: 'rgba(13, 13, 36, 0.9)',
      color: 'rgba(200, 182, 255, 0.3)',
      border: 'none',
      paddingLeft: '8px',
    },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(0, 229, 255, 0.06)' },
    '.cm-matchingBracket': { color: '#00e5ff !important', backgroundColor: 'rgba(0, 229, 255, 0.1)' },
  })

  const geaHighlighting = HighlightStyle.define([
    { tag: tags.keyword, color: '#e91eff' },
    { tag: tags.className, color: '#c8b6ff' },
    { tag: tags.function(tags.variableName), color: '#00e5ff' },
    { tag: tags.propertyName, color: '#00e5ff' },
    { tag: tags.string, color: '#ffd866' },
    { tag: tags.number, color: '#ff9e64' },
    { tag: tags.operator, color: '#ffffff' },
    { tag: tags.comment, color: '#5a5a7a' },
    { tag: tags.tagName, color: '#ff2d95' },
    { tag: tags.attributeName, color: '#00e5ff' },
    { tag: tags.typeName, color: '#c8b6ff' },
    { tag: tags.bool, color: '#ff9e64' },
    { tag: tags.definition(tags.variableName), color: '#00e5ff' },
  ])

  cmModules = {
    EditorState, EditorView, keymap, lineNumbers, highlightActiveLine,
    highlightSpecialChars, defaultKeymap, history, historyKeymap,
    syntaxHighlighting, bracketMatching, javascript, geaTheme, geaHighlighting,
  }
  return cmModules
}

export async function createEditor(container, files, activeFile, onChange) {
  const cm = await loadCodeMirror()

  const fileContents = { ...files }
  let currentFile = activeFile

  const extensions = [
    cm.lineNumbers(),
    cm.highlightActiveLine(),
    cm.highlightSpecialChars(),
    cm.history(),
    cm.bracketMatching(),
    cm.keymap.of([...cm.defaultKeymap, ...cm.historyKeymap]),
    cm.javascript({ jsx: true, typescript: true }),
    cm.syntaxHighlighting(cm.geaHighlighting),
    cm.geaTheme,
    cm.EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        fileContents[currentFile] = update.state.doc.toString()
        onChange(fileContents)
      }
    }),
  ]

  const view = new cm.EditorView({
    state: cm.EditorState.create({
      doc: fileContents[activeFile],
      extensions,
    }),
    parent: container,
  })

  function setActiveFile(name) {
    if (name === currentFile) return
    currentFile = name
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: fileContents[name] || '',
      },
    })
  }

  function getFiles() {
    return { ...fileContents }
  }

  return { setActiveFile, getFiles }
}
