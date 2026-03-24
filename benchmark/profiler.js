/**
 * Gea Benchmark Profiler
 *
 * Instruments the gea runtime internals to measure where time is spent
 * during each benchmark operation. Uses window.__geaStore and
 * window.__geaComponent exposed by main-profile.js.
 *
 * Measured categories:
 *   - Proxy traps (set/get overhead via _emitChanges, _createProxy)
 *   - Change batching (_normalizeBatch, _deliverArrayItemPropBatch)
 *   - Observer routing (_collectMatchingObserverNodes, _notifyHandlers)
 *   - DOM operations (createDataItem, rebuildList, applyPropChanges, etc.)
 *   - Component observer handlers (__observe_store_data, __observe_store_selected)
 */
;(function () {
  'use strict'

  // ── Timing infrastructure ──────────────────────────────────────────

  const timings = {}

  function resetTimings() {
    for (const key in timings) delete timings[key]
  }

  function startTiming(category) {
    if (!timings[category]) timings[category] = { total: 0, calls: 0 }
    timings[category]._start = performance.now()
    timings[category].calls++
  }

  function endTiming(category) {
    const entry = timings[category]
    if (entry && entry._start !== undefined) {
      entry.total += performance.now() - entry._start
      delete entry._start
    }
  }

  function getTimings() {
    const result = {}
    for (const key in timings) {
      result[key] = { total: +timings[key].total.toFixed(4), calls: timings[key].calls }
    }
    return result
  }

  // ── Method wrapping ────────────────────────────────────────────────

  function wrapMethod(obj, methodName, timingKey) {
    const orig = obj[methodName]
    if (!orig || typeof orig !== 'function' || orig.__instrumented) return
    obj[methodName] = function (...args) {
      startTiming(timingKey)
      try {
        return orig.apply(this, args)
      } finally {
        endTiming(timingKey)
      }
    }
    obj[methodName].__instrumented = true
    obj[methodName].__original = orig
  }

  function wrapBoundFn(obj, propName, timingKey) {
    const orig = obj[propName]
    if (!orig || typeof orig !== 'function' || orig.__instrumented) return
    obj[propName] = function () {
      startTiming(timingKey)
      try {
        return orig.call(this)
      } finally {
        endTiming(timingKey)
      }
    }
    obj[propName].__instrumented = true
  }

  // ── Instrumentation ────────────────────────────────────────────────

  function instrument() {
    const store = window.__geaStore
    const component = window.__geaComponent
    const realStore = window.__geaRealStore

    if (!store || !component || !realStore) {
      console.error('[Profiler] Missing globals. Ensure main-profile.js is loaded first.')
      return false
    }

    // ── Store internals (on realStore instance and prototype chain) ──

    // _flushChanges is a bound arrow fn on the instance
    wrapBoundFn(realStore, '_flushChanges', 'store._flushChanges')

    // Prototype methods (Store.prototype)
    const storeProto = Object.getPrototypeOf(Object.getPrototypeOf(realStore))
    wrapMethod(storeProto, '_normalizeBatch', 'store._normalizeBatch')
    wrapMethod(storeProto, '_deliverArrayItemPropBatch', 'store._deliverArrayItemPropBatch')
    wrapMethod(storeProto, '_collectMatchingObserverNodes', 'store._collectMatchingObserverNodes')
    wrapMethod(storeProto, '_collectMatchingObserverNodesFromNode', 'store._collectMatchingObserverNodesFromNode')
    wrapMethod(storeProto, '_notifyHandlers', 'store._notifyHandlers')
    wrapMethod(storeProto, '_emitChanges', 'store._emitChanges')
    wrapMethod(storeProto, '_createProxy', 'store._createProxy')
    wrapMethod(storeProto, '_interceptArrayMethod', 'store._interceptArrayMethod')

    // BenchmarkStore methods
    const bsProto = Object.getPrototypeOf(realStore)
    wrapMethod(bsProto, 'run', 'benchmarkStore.run')
    wrapMethod(bsProto, 'runLots', 'benchmarkStore.runLots')
    wrapMethod(bsProto, 'add', 'benchmarkStore.add')
    wrapMethod(bsProto, 'update', 'benchmarkStore.update')
    wrapMethod(bsProto, 'clear', 'benchmarkStore.clear')
    wrapMethod(bsProto, 'swapRows', 'benchmarkStore.swapRows')
    wrapMethod(bsProto, 'select', 'benchmarkStore.select')
    wrapMethod(bsProto, 'remove', 'benchmarkStore.remove')

    // ── Component methods ──

    const compInstanceProto = Object.getPrototypeOf(component) // Benchmark.prototype
    wrapMethod(compInstanceProto, '__observe_store_data', 'component.__observe_store_data')
    wrapMethod(compInstanceProto, '__observe_store_selected', 'component.__observe_store_selected')
    wrapMethod(compInstanceProto, '__applyListChanges', 'component.__applyListChanges')
    wrapMethod(compInstanceProto, 'createDataItem', 'component.createDataItem')
    wrapMethod(compInstanceProto, 'renderDataItem', 'component.renderDataItem')
    wrapMethod(compInstanceProto, '__ensureArrayConfigs', 'component.__ensureArrayConfigs')
    wrapMethod(compInstanceProto, '__getMapItemFromEvent_store_data', 'component.__getMapItemFromEvent')

    // Component.prototype (parent class)
    const compProto = Object.getPrototypeOf(compInstanceProto)
    wrapMethod(compProto, '__geaSyncItems', 'component.__geaSyncItems')
    wrapMethod(compProto, '__geaSyncMap', 'component.__geaSyncMap')
    wrapMethod(compProto, '__geaCloneItem', 'component.__geaCloneItem')
    wrapMethod(compProto, 'render', 'component.render')

    console.log('[Profiler] Instrumentation complete.')
    return true
  }

  // ── Async helpers ──────────────────────────────────────────────────

  function waitForFlush() {
    // Store uses queueMicrotask, so we need to wait for microtasks + a frame
    return new Promise((resolve) => {
      queueMicrotask(() => {
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 0)
          })
        })
      })
    })
  }

  // ── Benchmark operations ───────────────────────────────────────────

  async function profileOperation(name, setup, action, iterations = 5) {
    const store = window.__geaStore
    const results = []

    for (let i = 0; i < iterations; i++) {
      if (setup) {
        setup(store)
        await waitForFlush()
      }

      resetTimings()
      const t0 = performance.now()
      action(store, i)
      await waitForFlush()
      const totalTime = performance.now() - t0

      results.push({
        totalTime: +totalTime.toFixed(3),
        breakdown: getTimings(),
      })
    }

    return { name, results }
  }

  async function runAllProfiles() {
    const store = window.__geaStore
    const results = {}

    // 1. Create 1,000 rows
    // Warmup
    for (let i = 0; i < 5; i++) { store.run(); await waitForFlush() }
    results.create1k = await profileOperation(
      'create 1,000 rows',
      (s) => { s.clear() },
      (s) => { s.run() },
      10,
    )

    // 2. Replace all rows
    for (let i = 0; i < 5; i++) { store.run(); await waitForFlush() }
    results.replaceAll = await profileOperation(
      'replace all 1,000 rows',
      (s) => { s.run() },
      (s) => { s.run() },
      10,
    )

    // 3. Partial update (every 10th row)
    for (let i = 0; i < 3; i++) { store.run(); store.update(); await waitForFlush() }
    results.partialUpdate = await profileOperation(
      'partial update (every 10th row)',
      (s) => { s.run() },
      (s) => { s.update() },
      10,
    )

    // 4. Select row
    for (let i = 0; i < 5; i++) { store.run(); store.select(i + 1); await waitForFlush() }
    let selectCounter = 1
    results.selectRow = await profileOperation(
      'select row',
      (s) => {
        if (selectCounter === 1) { s.run() }
      },
      (s) => { s.select(selectCounter++) },
      20,
    )

    // 5. Swap rows
    for (let i = 0; i < 5; i++) { store.run(); store.swapRows(); await waitForFlush() }
    results.swapRows = await profileOperation(
      'swap rows',
      (s) => { s.run() },
      (s) => { s.swapRows() },
      10,
    )

    // 6. Remove row
    results.removeRow = await profileOperation(
      'remove row',
      (s) => { s.run() },
      (s) => {
        const items = s.data.__getTarget || s.data
        s.remove(items[500]?.id || 500)
      },
      10,
    )

    // 7. Create 10,000 rows
    for (let i = 0; i < 3; i++) { store.runLots(); await waitForFlush() }
    results.create10k = await profileOperation(
      'create 10,000 rows',
      (s) => { s.clear() },
      (s) => { s.runLots() },
      5,
    )

    // 8. Append 1,000 rows
    results.append1k = await profileOperation(
      'append 1,000 rows',
      (s) => { s.run() },
      (s) => { s.add() },
      10,
    )

    // 9. Clear rows
    results.clearRows = await profileOperation(
      'clear rows',
      (s) => { s.run() },
      (s) => { s.clear() },
      10,
    )

    return results
  }

  // ── Results formatting ─────────────────────────────────────────────

  // Define which categories are "leaf" (actual work) vs "parent" (contain children)
  const HIERARCHY = {
    'store._flushChanges': [
      'store._normalizeBatch',
      'store._deliverArrayItemPropBatch',
      'store._collectMatchingObserverNodes',
      'store._collectMatchingObserverNodesFromNode',
      'store._notifyHandlers',
    ],
    'store._notifyHandlers': [
      'component.__observe_store_data',
      'component.__observe_store_selected',
    ],
    'component.__observe_store_data': ['component.__applyListChanges'],
    'component.__applyListChanges': ['component.createDataItem'],
    'component.createDataItem': ['component.renderDataItem'],
  }

  function getLeafCategories(allCats) {
    const parents = new Set()
    for (const [parent, children] of Object.entries(HIERARCHY)) {
      if (children.some((c) => allCats.includes(c)) && allCats.includes(parent)) {
        parents.add(parent)
      }
    }
    return allCats.filter((c) => !parents.has(c))
  }

  function formatResults(allResults) {
    const lines = []
    lines.push('═'.repeat(100))
    lines.push('  GEA BENCHMARK PROFILING RESULTS')
    lines.push('═'.repeat(100))

    for (const [key, data] of Object.entries(allResults)) {
      lines.push('')
      lines.push(`  ── ${data.name} ${'─'.repeat(Math.max(0, 85 - data.name.length))}`)

      const n = data.results.length
      const avgTotal = data.results.reduce((s, r) => s + r.totalTime, 0) / n
      const stddev = Math.sqrt(
        data.results.reduce((s, r) => s + (r.totalTime - avgTotal) ** 2, 0) / n,
      )
      lines.push(`  Total: ${avgTotal.toFixed(2)}ms ±${stddev.toFixed(2)}ms (${n} runs)`)
      lines.push('')

      // Aggregate breakdown
      const aggregated = {}
      for (const run of data.results) {
        for (const [cat, info] of Object.entries(run.breakdown)) {
          if (!aggregated[cat]) aggregated[cat] = { total: 0, calls: 0, count: 0 }
          aggregated[cat].total += info.total
          aggregated[cat].calls += info.calls
          aggregated[cat].count++
        }
      }

      const sorted = Object.entries(aggregated).sort((a, b) => b[1].total - a[1].total)
      const allCats = sorted.map(([k]) => k)
      const leafCats = new Set(getLeafCategories(allCats))

      lines.push(`  ${'Category'.padEnd(50)} ${'Avg ms'.padStart(10)} ${'Calls'.padStart(8)} ${'%total'.padStart(8)}`)
      lines.push(`  ${'─'.repeat(50)} ${'─'.repeat(10)} ${'─'.repeat(8)} ${'─'.repeat(8)}`)

      let accountedLeaf = 0
      for (const [cat, info] of sorted) {
        const avgTime = info.total / info.count
        const avgCalls = Math.round(info.calls / info.count)
        const pct = avgTotal > 0 ? ((avgTime / avgTotal) * 100) : 0
        const isLeaf = leafCats.has(cat)

        if (isLeaf) accountedLeaf += avgTime

        if (avgTime >= 0.005) {
          const marker = isLeaf ? '  ' : '▸ '
          lines.push(
            `  ${marker}${cat.padEnd(48)} ${avgTime.toFixed(3).padStart(10)} ${String(avgCalls).padStart(8)} ${(pct.toFixed(1) + '%').padStart(8)}`,
          )
        }
      }

      const overhead = avgTotal - accountedLeaf
      if (overhead > 0.05) {
        lines.push(
          `  * ${'overhead (proxy traps, microtask scheduling)'.padEnd(48)} ${overhead.toFixed(3).padStart(10)} ${''.padStart(8)} ${((overhead / avgTotal) * 100).toFixed(1).padStart(7)}%`,
        )
      }
    }

    lines.push('')
    lines.push('═'.repeat(100))
    lines.push('')
    lines.push('Legend:')
    lines.push('  ▸  = parent category (time includes child categories)')
    lines.push('     = leaf category (actual self-time)')
    lines.push('  *  = unaccounted time (proxy trap overhead, microtask scheduling, GC)')
    lines.push('')
    return lines.join('\n')
  }

  // ── JSON export for programmatic analysis ──────────────────────────

  function exportJSON(allResults) {
    const exported = {}
    for (const [key, data] of Object.entries(allResults)) {
      const n = data.results.length
      const avgTotal = data.results.reduce((s, r) => s + r.totalTime, 0) / n

      const aggregated = {}
      for (const run of data.results) {
        for (const [cat, info] of Object.entries(run.breakdown)) {
          if (!aggregated[cat]) aggregated[cat] = { total: 0, calls: 0, count: 0 }
          aggregated[cat].total += info.total
          aggregated[cat].calls += info.calls
          aggregated[cat].count++
        }
      }

      const breakdown = {}
      for (const [cat, info] of Object.entries(aggregated)) {
        breakdown[cat] = {
          avgMs: +(info.total / info.count).toFixed(4),
          avgCalls: Math.round(info.calls / info.count),
          pctOfTotal: +(((info.total / info.count) / avgTotal) * 100).toFixed(2),
        }
      }

      exported[key] = {
        name: data.name,
        avgTotalMs: +avgTotal.toFixed(3),
        runs: n,
        breakdown,
      }
    }
    return exported
  }

  // ── Public API ─────────────────────────────────────────────────────

  window.__geaProfiler = {
    instrument,
    runAllProfiles,
    formatResults,
    exportJSON,
    resetTimings,
    getTimings,
    profileOperation,
    waitForFlush,
  }
})()
