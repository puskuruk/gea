import { Store } from '@geajs/core'

export type Category = 'Food' | 'Transport' | 'Housing' | 'Entertainment' | 'Health' | 'Shopping' | 'Income'
export type TransactionType = 'expense' | 'income'

export interface Transaction {
  id: string
  description: string
  amount: number
  category: Category
  type: TransactionType
  date: string
}

function uid() {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Housing: '#8b5cf6',
  Entertainment: '#ec4899',
  Health: '#10b981',
  Shopping: '#f59e0b',
  Income: '#16a34a',
}

export const BUDGETS: Record<Category, number> = {
  Food: 400,
  Transport: 150,
  Housing: 1200,
  Entertainment: 200,
  Health: 100,
  Shopping: 300,
  Income: 0,
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', description: 'Salary', amount: 3500, category: 'Income', type: 'income', date: '2026-03-01' },
  { id: 't2', description: 'Rent', amount: 1100, category: 'Housing', type: 'expense', date: '2026-03-01' },
  { id: 't3', description: 'Groceries', amount: 85, category: 'Food', type: 'expense', date: '2026-03-03' },
  { id: 't4', description: 'Uber to airport', amount: 32, category: 'Transport', type: 'expense', date: '2026-03-05' },
  { id: 't5', description: 'Netflix', amount: 16, category: 'Entertainment', type: 'expense', date: '2026-03-06' },
  { id: 't6', description: 'Gym membership', amount: 45, category: 'Health', type: 'expense', date: '2026-03-07' },
  { id: 't7', description: 'Restaurant dinner', amount: 68, category: 'Food', type: 'expense', date: '2026-03-10' },
  { id: 't8', description: 'Amazon order', amount: 120, category: 'Shopping', type: 'expense', date: '2026-03-12' },
  { id: 't9', description: 'Coffee', amount: 15, category: 'Food', type: 'expense', date: '2026-03-14' },
  { id: 't10', description: 'Metro card', amount: 33, category: 'Transport', type: 'expense', date: '2026-03-15' },
  { id: 't11', description: 'Freelance payment', amount: 800, category: 'Income', type: 'income', date: '2026-03-18' },
  { id: 't12', description: 'Spotify', amount: 10, category: 'Entertainment', type: 'expense', date: '2026-03-20' },
]

export class FinanceStore extends Store {
  transactions: Transaction[] = INITIAL_TRANSACTIONS
  filterCategory: Category | 'All' = 'All'
  filterType: TransactionType | 'All' = 'All'
  addOpen = false

  // Draft form
  draftDescription = ''
  draftAmount = ''
  draftCategory: Category = 'Food'
  draftType: TransactionType = 'expense'
  draftDate = new Date().toISOString().slice(0, 10)

  get filteredTransactions(): Transaction[] {
    return this.transactions
      .filter((t) => {
        if (this.filterCategory !== 'All' && t.category !== this.filterCategory) return false
        if (this.filterType !== 'All' && t.type !== this.filterType) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  get totalIncome(): number {
    return this.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  }

  get totalExpenses(): number {
    return this.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  }

  get balance(): number {
    return this.totalIncome - this.totalExpenses
  }

  get spendingByCategory(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const t of this.transactions) {
      if (t.type === 'expense') {
        result[t.category] = (result[t.category] ?? 0) + t.amount
      }
    }
    return result
  }

  budgetPercent(cat: Category): number {
    const budget = BUDGETS[cat]
    if (!budget) return 0
    const spent = this.spendingByCategory[cat] ?? 0
    return Math.min(100, Math.round((spent / budget) * 100))
  }

  get draftValid(): boolean {
    return this.draftDescription.trim().length > 0 && Number(this.draftAmount) > 0
  }

  setFilterCategory(value: string): void {
    this.filterCategory = value as Category | 'All'
  }

  setFilterType(value: string): void {
    this.filterType = value as TransactionType | 'All'
  }

  openAdd(): void {
    this.addOpen = true
    this.draftDescription = ''
    this.draftAmount = ''
    this.draftCategory = 'Food'
    this.draftType = 'expense'
    this.draftDate = new Date().toISOString().slice(0, 10)
  }

  closeAdd(): void {
    this.addOpen = false
  }

  setDraftDescription(e: { target: { value: string } }): void {
    this.draftDescription = e.target.value
  }

  setDraftAmount(e: { target: { value: string } }): void {
    this.draftAmount = e.target.value
  }

  setDraftCategory(value: string): void {
    this.draftCategory = value as Category
  }

  setDraftType(value: string): void {
    this.draftType = value as TransactionType
  }

  setDraftDate(e: { target: { value: string } }): void {
    this.draftDate = e.target.value
  }

  addTransaction(): void {
    if (!this.draftValid) return
    this.transactions.push({
      id: uid(),
      description: this.draftDescription.trim(),
      amount: Number(this.draftAmount),
      category: this.draftCategory,
      type: this.draftType,
      date: this.draftDate,
    })
    this.addOpen = false
  }

  removeTransaction(id: string): void {
    const idx = this.transactions.findIndex((t) => t.id === id)
    if (idx !== -1) this.transactions.splice(idx, 1)
  }
}

export default new FinanceStore()
