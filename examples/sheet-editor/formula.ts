/** Spreadsheet formula engine (pure, no JSX). */

export const COLS = 10
export const ROWS = 20

export function parseAddress(addr: string): { col: number; row: number } | null {
  const m = addr
    .trim()
    .toUpperCase()
    .match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  const letters = m[1]
  const row = Number.parseInt(m[2], 10)
  if (!Number.isFinite(row) || row < 1 || row > ROWS) return null
  let col = 0
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0 || col >= COLS) return null
  return { col, row }
}

export function formatAddress(col: number, row: number): string {
  return `${String.fromCharCode(65 + col)}${row}`
}

/** Same column or same row only; otherwise null. */
export function expandRange(start: string, end: string): string[] | null {
  const a = parseAddress(start)
  const b = parseAddress(end)
  if (!a || !b) return null
  if (a.col === b.col && a.row !== b.row) {
    const lo = Math.min(a.row, b.row)
    const hi = Math.max(a.row, b.row)
    const out: string[] = []
    for (let r = lo; r <= hi; r++) out.push(formatAddress(a.col, r))
    return out
  }
  if (a.row === b.row && a.col !== b.col) {
    const lo = Math.min(a.col, b.col)
    const hi = Math.max(a.col, b.col)
    const out: string[] = []
    for (let c = lo; c <= hi; c++) out.push(formatAddress(c, a.row))
    return out
  }
  return null
}

export type EvalOk = { ok: true; value: number }
export type EvalErr = { ok: false; error: string }
export type EvalResult = EvalOk | EvalErr

function err(code: string): EvalErr {
  return { ok: false, error: code }
}

/** All cell addresses this formula depends on (expanded ranges). */
export function collectDependencies(formulaBody: string): string[] {
  const deps = new Set<string>()
  const s = formulaBody
  let i = 0
  while (i < s.length) {
    if (!/[A-Za-z]/.test(s[i]!)) {
      i++
      continue
    }
    const letterStart = i
    while (i < s.length && /[A-Za-z]/.test(s[i]!)) i++
    const letters = s.slice(letterStart, i)
    if (i >= s.length || !/\d/.test(s[i]!)) {
      continue
    }
    const rowStart = i
    while (i < s.length && /\d/.test(s[i]!)) i++
    const addr = `${letters.toUpperCase()}${s.slice(rowStart, i)}`
    if (!parseAddress(addr)) continue
    let j = skipWs(s, i)
    if (s[j] === ':') {
      j = skipWs(s, j + 1)
      const c0 = j
      while (j < s.length && /[A-Za-z]/.test(s[j]!)) j++
      const r0 = j
      while (j < s.length && /\d/.test(s[j]!)) j++
      const endAddr = `${s.slice(c0, r0).toUpperCase()}${s.slice(r0, j)}`
      const exp = expandRange(addr, endAddr)
      if (exp) exp.forEach((a) => deps.add(a))
      i = j
    } else {
      deps.add(addr)
    }
  }
  return [...deps]
}

function skipWs(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i]!)) i++
  return i
}

/**
 * Evaluate formula body (no leading `=`). `getNumeric` returns numeric value for a cell
 * (0 for empty non-formula cells).
 */
export function evaluateFormula(formulaBody: string, getNumeric: (addr: string) => number): EvalResult {
  const src = formulaBody.trim()
  if (src === '') return err('#REF!')
  const p = new Evaluator(src, getNumeric)
  return p.parseExpr()
}

class Evaluator {
  private i = 0

  constructor(
    private readonly src: string,
    private readonly getNumeric: (addr: string) => number,
  ) {}

  private peek(): string | undefined {
    return this.src[this.i]
  }

  private skipWs(): void {
    this.i = skipWs(this.src, this.i)
  }

  parseExpr(): EvalResult {
    this.skipWs()
    return this.parseAddSub()
  }

  private parseAddSub(): EvalResult {
    const left = this.parseMulDiv()
    if (!left.ok) return left
    let acc = left.value
    while (true) {
      this.skipWs()
      const op = this.peek()
      if (op !== '+' && op !== '-') break
      this.i++
      const right = this.parseMulDiv()
      if (!right.ok) return right
      if (op === '+') acc += right.value
      else acc -= right.value
    }
    return { ok: true, value: acc }
  }

  private parseMulDiv(): EvalResult {
    const left = this.parseUnary()
    if (!left.ok) return left
    let acc = left.value
    while (true) {
      this.skipWs()
      const op = this.peek()
      if (op !== '*' && op !== '/') break
      this.i++
      const right = this.parseUnary()
      if (!right.ok) return right
      if (op === '*') acc *= right.value
      else {
        if (right.value === 0) return err('#DIV/0!')
        acc /= right.value
      }
    }
    return { ok: true, value: acc }
  }

  private parseUnary(): EvalResult {
    this.skipWs()
    if (this.peek() === '-') {
      this.i++
      const v = this.parseUnary()
      if (!v.ok) return v
      return { ok: true, value: -v.value }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): EvalResult {
    this.skipWs()
    const c = this.peek()
    if (c === '(') {
      this.i++
      const inner = this.parseExpr()
      if (!inner.ok) return inner
      this.skipWs()
      if (this.peek() !== ')') return err('#REF!')
      this.i++
      return inner
    }
    if (c === undefined) return err('#REF!')
    if (/\d/.test(c) || c === '.') return this.parseNumber()
    if (/[A-Za-z]/.test(c)) return this.parseIdentOrCell()
    return err('#REF!')
  }

  private parseNumber(): EvalResult {
    const start = this.i
    let sawDigit = false
    while (this.peek() !== undefined && /\d/.test(this.peek()!)) {
      sawDigit = true
      this.i++
    }
    if (this.peek() === '.') {
      this.i++
      while (this.peek() !== undefined && /\d/.test(this.peek()!)) {
        sawDigit = true
        this.i++
      }
    }
    if (!sawDigit) return err('#REF!')
    const raw = this.src.slice(start, this.i)
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) return err('#REF!')
    return { ok: true, value: n }
  }

  private parseIdentOrCell(): EvalResult {
    const start = this.i
    while (this.peek() !== undefined && /[A-Za-z]/.test(this.peek()!)) this.i++
    const word = this.src.slice(start, this.i).toUpperCase()
    this.skipWs()

    if (this.peek() === '(') {
      this.i++
      const argStr = this.readUntilMatchingParen()
      this.skipWs()
      if (this.peek() !== ')') return err('#REF!')
      this.i++
      return this.applyFunc(word, argStr)
    }

    this.i = start
    return this.parseCellRef()
  }

  private readUntilMatchingParen(): string {
    const start = this.i
    let depth = 1
    while (this.i < this.src.length && depth > 0) {
      const ch = this.src[this.i]!
      if (ch === '(') depth++
      else if (ch === ')') {
        depth--
        if (depth === 0) break
      }
      this.i++
    }
    return this.src.slice(start, this.i)
  }

  private parseCellRef(): EvalResult {
    const start = this.i
    while (this.peek() !== undefined && /[A-Z]/i.test(this.peek()!)) this.i++
    const colPart = this.src.slice(start, this.i)
    const rowStart = this.i
    while (this.peek() !== undefined && /\d/.test(this.peek()!)) this.i++
    if (rowStart === this.i) return err('#REF!')
    const addr = `${colPart.toUpperCase()}${this.src.slice(rowStart, this.i)}`
    if (!parseAddress(addr)) return err('#REF!')
    this.skipWs()
    if (this.peek() === ':') {
      return err('#REF!')
    }
    return { ok: true, value: this.getNumeric(addr) }
  }

  private applyFunc(name: string, argStr: string): EvalResult {
    const trimmed = argStr.trim()
    const parsed = this.parseRangeOrCommaList(trimmed)
    if (parsed.ok === false) return parsed
    const values = parsed.values
    if (values.length === 0) return err('#REF!')

    switch (name) {
      case 'SUM':
        return { ok: true, value: values.reduce((a, b) => a + b, 0) }
      case 'MIN':
        return { ok: true, value: Math.min(...values) }
      case 'MAX':
        return { ok: true, value: Math.max(...values) }
      case 'AVG': {
        const s = values.reduce((a, b) => a + b, 0)
        return { ok: true, value: s / values.length }
      }
      default:
        return err('#REF!')
    }
  }

  private parseRangeOrCommaList(s: string): { ok: true; values: number[] } | EvalErr {
    const values: number[] = []
    let i = 0
    while (i < s.length) {
      i = skipWs(s, i)
      if (i >= s.length) break

      if (/[A-Za-z]/.test(s[i]!)) {
        const cStart = i
        while (i < s.length && /[A-Za-z]/.test(s[i]!)) i++
        const rStart = i
        while (i < s.length && /\d/.test(s[i]!)) i++
        const addr = `${s.slice(cStart, rStart).toUpperCase()}${s.slice(rStart, i)}`
        if (!parseAddress(addr)) return err('#REF!')
        i = skipWs(s, i)
        if (i < s.length && s[i] === ':') {
          i++
          i = skipWs(s, i)
          const c2 = i
          while (i < s.length && /[A-Za-z]/.test(s[i]!)) i++
          const r2 = i
          while (i < s.length && /\d/.test(s[i]!)) i++
          const endAddr = `${s.slice(c2, r2).toUpperCase()}${s.slice(r2, i)}`
          const exp = expandRange(addr, endAddr)
          if (!exp) return err('#REF!')
          for (const a of exp) values.push(this.getNumeric(a))
        } else {
          values.push(this.getNumeric(addr))
        }
        i = skipWs(s, i)
        if (i < s.length && s[i] === ',') {
          i++
          continue
        }
        if (i < s.length) return err('#REF!')
        break
      }

      if (/\d/.test(s[i]!) || s[i] === '.') {
        const nStart = i
        if (s[i] === '.') i++
        while (i < s.length && /\d/.test(s[i]!)) i++
        if (s[i] === '.') {
          i++
          while (i < s.length && /\d/.test(s[i]!)) i++
        }
        const n = Number.parseFloat(s.slice(nStart, i))
        if (!Number.isFinite(n)) return err('#REF!')
        values.push(n)
        i = skipWs(s, i)
        if (i < s.length && s[i] === ',') {
          i++
          continue
        }
        if (i < s.length) return err('#REF!')
        break
      }
      return err('#REF!')
    }
    return { ok: true, values }
  }
}
