import { Component } from '@geajs/core'
import SheetCell from './sheet-cell'
import sheetStore, { COL_LABELS, ROW_LABELS } from './sheet-store'

export default class Sheet extends Component {
  created() {
    sheetStore.observe('activeAddress', (address) => {
      if (address) {
        queueMicrotask(() => {
          if (typeof document === 'undefined') return
          const el = document.querySelector(`[data-address="${address}"]`) as HTMLElement | null
          el?.focus()
        })
      }
    })
  }

  template() {
    return (
      <div class="sheet-scroll">
        <table class="sheet-table">
          <thead>
            <tr>
              <th class="sheet-corner" />
              {COL_LABELS.map((label) => (
                <th key={label} class="sheet-col-head">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((rowNum) => (
              <tr key={rowNum} class="sheet-row">
                <th class="sheet-row-head">{rowNum}</th>
                {COL_LABELS.map((col) => {
                  const address = `${col}${rowNum}`
                  return <SheetCell key={address} address={address} />
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}
