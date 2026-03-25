# Running Unit Tests

**CRITICAL**: This project uses Node's built-in test runner (`node:test`), NOT vitest. NEVER run `npx vitest`.

```bash
# Run ALL unit tests across all packages
npm test

# Run tests for a specific package
npm test -w @geajs/core
npm test -w @geajs/vite-plugin

# WRONG - will report "No test suite found" for every file
npx vitest run
```

Test files import from `node:test`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
```

Each package defines its own test script in `package.json`:

- `@geajs/core`: `tsx --conditions source --import ./tests/preload.ts --test tests/**/*.test.ts`
- `@geajs/vite-plugin`: `tsx --test 'tests/**/*.test.ts'`

The root `npm test` runs all workspace test scripts via `npm run test --workspaces --if-present`.
