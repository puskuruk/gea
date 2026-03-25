import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { FinanceStore, BUDGETS } from '../../../../examples/finance/store'

describe('examples/finance FinanceStore', () => {
  let s: FinanceStore

  beforeEach(() => {
    s = new FinanceStore()
  })

  it('filteredTransactions sorts by date desc', () => {
    const dates = s.filteredTransactions.map((t) => t.date)
    assert.ok(dates.length >= 2)
    assert.ok(dates[0] >= dates[dates.length - 1])
  })

  it('setFilterCategory and setFilterType narrow rows', () => {
    assert.ok(s.filteredTransactions.length >= 10)
    s.setFilterCategory('Food')
    assert.ok(s.filteredTransactions.every((t) => t.category === 'Food'))
    s.setFilterCategory('All')
    s.setFilterType('income')
    assert.ok(s.filteredTransactions.every((t) => t.type === 'income'))
  })

  it('totals and balance', () => {
    assert.ok(s.totalIncome > 0)
    assert.ok(s.totalExpenses > 0)
    assert.equal(s.balance, s.totalIncome - s.totalExpenses)
  })

  it('removeTransaction drops row and count', () => {
    const n = s.transactions.length
    s.removeTransaction('t1')
    assert.equal(s.transactions.length, n - 1)
    assert.ok(!s.transactions.some((t) => t.id === 't1'))
  })

  it('addTransaction from draft', () => {
    s.openAdd()
    s.draftDescription = 'Test line'
    s.draftAmount = '42'
    s.draftCategory = 'Food'
    s.draftType = 'expense'
    s.addTransaction()
    assert.equal(s.addOpen, false)
    const added = s.transactions.find((t) => t.description === 'Test line')
    assert.ok(added)
    assert.equal(added!.amount, 42)
  })

  it('budgetPercent is capped at 100', () => {
    const pct = s.budgetPercent('Food')
    assert.ok(pct >= 0 && pct <= 100)
    assert.equal(s.budgetPercent('Income'), 0)
    assert.ok(BUDGETS.Food > 0)
  })
})
