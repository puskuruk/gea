import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseAddress,
  formatAddress,
  expandRange,
  collectDependencies,
  evaluateFormula,
} from '../../../../examples/sheet-editor/formula'

describe('examples/sheet-editor formula', () => {
  it('parseAddress and formatAddress round-trip', () => {
    assert.deepEqual(parseAddress('A1'), { col: 0, row: 1 })
    assert.deepEqual(parseAddress('j20'), { col: 9, row: 20 })
    assert.equal(parseAddress('K1'), null)
    assert.equal(parseAddress('A21'), null)
    assert.equal(formatAddress(0, 1), 'A1')
    assert.equal(formatAddress(9, 20), 'J20')
  })

  it('expandRange vertical and horizontal', () => {
    assert.deepEqual(expandRange('A1', 'A3'), ['A1', 'A2', 'A3'])
    assert.deepEqual(expandRange('B2', 'B1'), ['B1', 'B2'])
    assert.deepEqual(expandRange('C1', 'E1'), ['C1', 'D1', 'E1'])
    assert.equal(expandRange('A1', 'B2'), null)
  })

  it('collectDependencies', () => {
    assert.ok(collectDependencies('A1+B2').includes('A1'))
    assert.ok(collectDependencies('A1+B2').includes('B2'))
    const sum = collectDependencies('SUM(A1:A3)')
    assert.deepEqual(new Set(sum), new Set(['A1', 'A2', 'A3']))
  })

  it('evaluateFormula arithmetic', () => {
    const r = evaluateFormula('2+3*4', () => 0)
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.value, 14)
  })

  it('evaluateFormula with cell refs', () => {
    const r = evaluateFormula('A1+B1', (a) => (a === 'A1' ? 10 : a === 'B1' ? 5 : 0))
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.value, 15)
  })

  it('evaluateFormula SUM range', () => {
    const vals: Record<string, number> = { A1: 1, A2: 2, A3: 3 }
    const r = evaluateFormula('SUM(A1:A3)', (a) => vals[a] ?? 0)
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.value, 6)
  })

  it('evaluateFormula division by zero', () => {
    const r = evaluateFormula('1/0', () => 0)
    assert.ok(!r.ok)
    if (!r.ok) assert.equal(r.error, '#DIV/0!')
  })
})
