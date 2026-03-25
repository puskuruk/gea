// website/playground/editor.js

import {
  EditorState,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  defaultKeymap,
  history,
  historyKeymap,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  javascript,
  tags,
} from './codemirror-bundle.js'

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
    paddingTop: '4px',
    paddingBottom: '16px',
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

const sharedExtensions = [
  lineNumbers(),
  highlightActiveLine(),
  highlightSpecialChars(),
  bracketMatching(),
  javascript({ jsx: true, typescript: true }),
  syntaxHighlighting(geaHighlighting),
  geaTheme,
]

export async function createEditor(container, files, activeFile, onChange) {
  const fileContents = { ...files }
  let currentFile = activeFile
  let isReadOnly = false
  let compiledOutput = ''

  const view = new EditorView({
    state: EditorState.create({
      doc: fileContents[activeFile],
      extensions: [
        ...sharedExtensions,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isReadOnly) {
            fileContents[currentFile] = update.state.doc.toString()
            onChange(fileContents)
          }
        }),
      ],
    }),
    parent: container,
  })

  function replaceDoc(text) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    })
  }

  function setReadOnly(readOnly) {
    isReadOnly = readOnly
    view.dispatch({
      effects: view.state.config.statusTemplate ? [] : [],
    })
    // Reconfigure with or without readOnly
    view.setState(
      EditorState.create({
        doc: view.state.doc.toString(),
        extensions: [
          ...sharedExtensions,
          ...(readOnly
            ? [EditorState.readOnly.of(true)]
            : [history(), keymap.of([...defaultKeymap, ...historyKeymap])]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isReadOnly) {
              fileContents[currentFile] = update.state.doc.toString()
              onChange(fileContents)
            }
          }),
        ],
      }),
    )
  }

  function setActiveFile(name) {
    if (name === currentFile && !isReadOnly) return
    currentFile = name
    if (isReadOnly) setReadOnly(false)
    replaceDoc(fileContents[name] || '')
  }

  function showCompiled(code) {
    compiledOutput = code
    if (isReadOnly) {
      replaceDoc(code)
    }
  }

  function setCompiledView() {
    setReadOnly(true)
    replaceDoc(compiledOutput)
  }

  function loadFiles(newFiles, activeFile) {
    Object.keys(fileContents).forEach((k) => delete fileContents[k])
    Object.assign(fileContents, newFiles)
    compiledOutput = ''
    currentFile = activeFile
    if (isReadOnly) setReadOnly(false)
    replaceDoc(fileContents[activeFile] || '')
  }

  function getFiles() {
    return { ...fileContents }
  }

  return { setActiveFile, setCompiledView, showCompiled, loadFiles, getFiles }
}
