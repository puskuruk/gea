# Running Playwright Tests

**CRITICAL**: This is a monorepo. `npx playwright` resolves from the workspace root (`gea/node_modules/playwright`), NOT from the example directory you `cd` into. Running `cd examples/music-player && npx playwright test` will discover ALL spec files across the entire repo instead of just the example's tests.

**Always use the `--config` flag to the central config and `--project` to select a specific example:**

```bash
# Run a specific example's tests
npx playwright test --config=tests/e2e/playwright.config.ts --project=chat

# Run all e2e tests
npx playwright test --config=tests/e2e/playwright.config.ts

# WRONG - discovers all spec files in the repo
cd examples/chat && npx playwright test
```

## Fast startup locally: `E2E_PROJECT`

`--project` only selects which **tests** run; it does not limit how many dev servers start.

With `E2E_PROJECT` unset, the unified config starts **every** example’s Vite dev server so any `--project` works. That makes a single-project run slow to start (many processes + readiness waits).

For one example, set:

```bash
E2E_PROJECT=sheet-editor npx playwright test --config=tests/e2e/playwright.config.ts --project=sheet-editor
```

## Workers (`E2E_WORKERS`)

Default is **10** workers locally and **4** on GitHub Actions. Override: `E2E_WORKERS=16 npx playwright test --config=tests/e2e/playwright.config.ts`.

## Project structure

- Example apps live in `examples/` at the repo root
- E2E test specs live in `tests/e2e/*.spec.ts`
- Central config: `tests/e2e/playwright.config.ts`
- Dev server ports are **dynamic** (runtime allocation on `127.0.0.1`); see that config for details
