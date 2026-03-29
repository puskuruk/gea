import { Component } from '@geajs/core'
import { router } from '@geajs/core/router'
import FormulaBar from './formula-bar'
import Sheet from './sheet'
import sheetStore from './sheet-store'

export default class App extends Component {
  created() {
    router.setRoutes({
      '/': App,
    })
    sheetStore.select('A1')
    sheetStore.recalc()
  }

  template() {
    return (
      <div class="sheet-editor">
        <header class="sheet-header">
          <h1 class="sheet-title">Sheet Editor</h1>
          <p class="sheet-sub">Formulas reference cells (A1–J20). Press Enter in the formula bar to apply.</p>
        </header>
        <FormulaBar />
        <Sheet />
      </div>
    )
  }
}
