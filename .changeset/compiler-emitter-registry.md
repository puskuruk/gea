---
"@geajs/vite-plugin": minor
---

### @geajs/vite-plugin (minor)

**Modular compiler architecture rewrite — 20,467 → 17,197 lines (16% reduction), all 410 tests pass.**

#### New architecture

- **Emitter registry** (`src/emit/`): Pluggable `PatchEmitter` interface for binding-type dispatch. Adding new binding types: create emitter + 1-line registration. No orchestrator changes needed.

- **Reactivity split**: Monolithic `gen-reactivity.ts` (2,285 lines) → 5 focused modules: `reactivity.ts` (orchestrator), `reactivity-arrays.ts`, `reactivity-bindings.ts`, `reactivity-wiring.ts`, `reactivity-types.ts`.

- **Shared JSX walker** (`analyze/jsx-walker.ts`): `walkJSX()`, `classifyAttribute()`, `isEventAttribute()` shared between analysis and codegen walkers.

- **Shared template params** (`codegen/template-params.ts`): Deduplicated prop name/param analysis.

#### Eliminated dead code and indirection

- Deleted `ast-helpers.ts` barrel (62 lines of pure re-exports) — all 20 consumers updated to import directly
- Merged `gen-observe.ts` (78-line wrapper) into `gen-observe-helpers.ts`
- Deleted dead `postprocess/map-join.ts` and `postprocess/xss-imports.ts` (117 lines)
- Merged `map-analyzer.ts` into `template-walker.ts`

#### Code quality

- Generic `deepMap`/`walk` helpers replace 7+ hand-rolled 150-300 line recursive visitors
- All codegen converted to eszter tagged templates
- Unified array create/patch loop via `buildRefCacheAndApply`
- Compressed all codegen + analyze files (event helpers -30%, map helpers -28%, array subsystem -19%, analyze files -23%)
