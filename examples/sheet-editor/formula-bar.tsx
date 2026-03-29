import sheetStore from './sheet-store'

export default function FormulaBar() {
  const addr = sheetStore.activeAddress ?? '—'
  return (
    <div class="formula-bar">
      <label class="formula-bar-label" htmlFor="sheet-formula-input">
        Cell {addr}
      </label>
      <input
        id="sheet-formula-input"
        class="formula-bar-input"
        type="text"
        value={sheetStore.barDraft}
        input={(e) => sheetStore.setBarDraft(e.currentTarget.value)}
        keydown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          const t = e.target as HTMLInputElement | null
          if (t?.value !== undefined) sheetStore.setBarDraft(t.value)
          sheetStore.commitBar()
        }}
        placeholder="e.g. 42 or =A1+B2"
        spellCheck={false}
      />
    </div>
  )
}
