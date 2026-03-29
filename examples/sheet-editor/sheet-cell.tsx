import { Component } from '@geajs/core'
import sheetStore, { formatDisplayNumber } from './sheet-store'

interface SheetCellProps {
  address: string
}

export default class SheetCell extends Component {
  declare props: SheetCellProps

  editing = false
  editBuffer = ''
  inputEl: HTMLInputElement | null = null

  /** Double-click / F2 / Enter: edit in cell. */
  startEdit(): void {
    if (this.editing) return
    this.editing = true
    this.editBuffer = sheetStore.cells[this.props.address] ?? ''
    queueMicrotask(() => {
      this.inputEl?.focus()
      this.inputEl?.setSelectionRange(this.editBuffer.length, this.editBuffer.length)
    })
  }

  /** First printable key replaces cell content and opens inline edit (Excel-style). */
  beginEditFromKey(key: string): void {
    if (this.editing) return
    this.editing = true
    queueMicrotask(() => {
      this.inputEl?.focus()
      this.inputEl?.setSelectionRange(1, 1)
    })
    this.editBuffer = key
    sheetStore.setBarDraft(key)
  }

  handleCellClick = (): void => {
    sheetStore.select(this.props.address)
    queueMicrotask(() => this.el?.focus())
  }

  handleCellDblClick = (e: globalThis.MouseEvent): void => {
    e.preventDefault()
    this.startEdit()
  }

  handleCellKeyDown = (e: KeyboardEvent): void => {
    if (this.editing) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    e.preventDefault?.()

    const key = e.key
    if (key === 'ArrowUp') {
      sheetStore.moveSelection(0, -1)
      return
    }
    if (key === 'ArrowDown') {
      sheetStore.moveSelection(0, 1)
      return
    }
    if (key === 'ArrowLeft') {
      sheetStore.moveSelection(-1, 0)
      return
    }
    if (key === 'ArrowRight') {
      sheetStore.moveSelection(1, 0)
      return
    }

    if (key === 'Enter') {
      this.startEdit()
      return
    }
    if (key === 'F2') {
      this.startEdit()
      return
    }
    if (key.length === 1) {
      this.beginEditFromKey(key)
    }
  }

  commitEdit(): void {
    if (!this.editing) return
    sheetStore.setCellRaw(this.props.address, this.editBuffer)

    this.editing = false

    sheetStore.moveSelection(0, 1)
  }

  cancelEdit(): void {
    this.editing = false
    this.editBuffer = sheetStore.cells[this.props.address] ?? ''
    sheetStore.setBarDraft(this.editBuffer)
    queueMicrotask(() => this.el?.focus())
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.commitEdit()
    if (e.key === 'Escape') this.cancelEdit()
    e.stopPropagation()
  }

  handleInput = (e: { target: EventTarget | null }): void => {
    this.editBuffer = (e.target as HTMLInputElement).value
    sheetStore.setBarDraft(this.editBuffer)
  }

  get displayValue(): string {
    const raw = sheetStore.cells[this.props.address] ?? ''
    if (!raw.startsWith('=')) return raw
    const c = sheetStore.computed[this.props.address]
    if (!c) return ''
    if (c.kind === 'err') return c.message
    return formatDisplayNumber(c.value)
  }

  template({ address }: SheetCellProps) {
    const selected = sheetStore.activeAddress === this.props.address
    const { editing, editBuffer } = this

    return (
      <td
        class={`sheet-cell ${selected ? 'sheet-cell-selected' : ''}`}
        data-address={address}
        tabIndex={selected ? 0 : -1}
        click={this.handleCellClick}
        dblclick={this.handleCellDblClick}
        keydown={this.handleCellKeyDown}
      >
        {editing ? (
          <input
            class="sheet-cell-input"
            type="text"
            ref={this.inputEl}
            value={editBuffer}
            input={this.handleInput}
            blur={this.commitEdit}
            keydown={this.handleKeyDown}
          />
        ) : (
          <span class="sheet-cell-value pointer-events-none">{this.displayValue}</span>
        )}
      </td>
    )
  }
}
