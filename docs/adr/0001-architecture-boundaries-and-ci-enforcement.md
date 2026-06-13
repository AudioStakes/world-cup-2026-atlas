# ADR 0001: Architecture Boundaries and CI Enforcement

Date: 2026-06-13

Status: Accepted

## Context

World Cup 2026 Atlas is a static Preact app. Code and test volume are expected to grow, so durable
rules should move from review memory into lint, test, and CI where possible. The current stack is
pnpm, TypeScript, Vite, Biome, Vitest, and Playwright. There is no DB, server API, or runtime
filesystem dependency in the app.

The goal is not to add long agent instructions. Durable background belongs in docs and ADRs. Agents
should mostly run the checks and fix violations.

## Current Structure

| Path | Current responsibility |
| --- | --- |
| `src/domain/` | Branded IDs and domain types. |
| `src/calculations/` | Pure domain calculations. |
| `src/data/` | Static production tournament, venue, group, map, and source data. |
| `src/indexes/` | Derived lookup indexes over app data. |
| `src/queries/` | Query helpers used by explorer application logic. |
| `src/features/explorer/` | Explorer application state, URL serialization, orchestration, and ViewModels. |
| `src/ui/components/` | Preact presentation and user interaction components. |
| `src/app/` | App composition, browser URL synchronization, and root Preact wiring. |
| `src/test/` | Vitest setup. |
| `e2e/` | Playwright browser flows. |
| `scripts/` | Node tooling and data download scripts. |
| `.github/workflows/` | Verify, E2E, and Pages deployment workflows. |

## Import Direction Findings

- `src/domain/` is currently inward-only and has no external imports.
- `src/calculations/` imports `src/domain/` only.
- Production files in `src/data/` import `src/data/` and `src/domain/`.
- `src/indexes/` imports `src/data/`, `src/domain/`, and `src/indexes/`.
- `src/queries/queryMatchesByViewState.ts` imports the explorer view-state type, so `src/queries/`
  is currently an explorer application helper, not pure domain/core.
- `src/features/explorer/` imports data, indexes, query helpers, calculations, and domain types. It
  does not import UI or Preact in production code.
- `src/ui/components/` now imports ViewModel/action/domain types and Preact only. It must not read
  raw `src/data/`, `src/indexes/`, or `src/queries/` directly.
- `src/app/` is the outer composition module and may wire data, indexes, explorer application
  modules, UI, and browser URL behavior together.

Infrastructure and framework dependencies are intentionally outer:

- Preact is limited to `src/app/` and `src/ui/`.
- Browser-specific behavior is in `src/app/`, `src/ui/`, and Playwright E2E tests.
- Node filesystem/network/process modules are limited to scripts, configs, and test/stop-gate
  tooling.
- Playwright is limited to `e2e/` and `playwright.config.ts`.
- Vitest and Testing Library are limited to tests and test config.

## Decision

Use the current repo-specific layer names rather than forcing a generic enterprise layout.

The intended dependency direction is:

```text
src/app
  -> src/ui
  -> src/features/explorer
  -> src/queries, src/indexes, src/data, src/calculations
  -> src/domain
```

`src/domain/` and `src/calculations/` are the innermost core. They must not import UI, app,
framework, browser, Node infrastructure, or test dependencies.

`src/features/explorer/` is the application layer. It owns state transitions, orchestration,
ViewModels, and user-intent actions. It may consume domain/data/index/query/calculation modules, but
must not import UI, app composition, Preact, browser-only libraries, Node infrastructure, or test
frameworks.

`src/ui/` is presentation. It renders ViewModel data and dispatches actions. It must not read raw
data, indexes, or query helpers directly.

`src/app/` is the outer composition layer. It is allowed to connect browser URL state, static data,
indexes, explorer application logic, and UI.

Architecture violations should fail CI through Biome in `pnpm check`, not rely on manual review.

## Test Classification

| Test type | Verifies | Does not verify | Placement | CI timing | Prohibited dependencies |
| --- | --- | --- | --- | --- | --- |
| Unit test | Pure functions, domain IDs/types behavior, calculations, state transitions, query helpers, ViewModel builders. | Browser rendering, server behavior, DB, filesystem, full navigation. | `src/**/*.test.ts`, `src/**/*.test.tsx` unless named integration/contract. | `pnpm test` inside `pnpm verify`. | Playwright, browser automation frameworks, DB/server/fs/http imports. |
| Integration test | Multiple local modules working together under Vitest, such as production data plus indexes plus ViewModel creation. | Real browser flows, external services, long user journeys. | `src/**/*.integration.test.ts`, `src/**/*.integration.test.tsx`. | `pnpm test` inside `pnpm verify`. | Playwright and fixed sleeps. External process/server dependencies need a separate ADR. |
| Contract test | Stable data shape, generated data expectations, or adapter contract expectations. | Rendering details or broad UI journeys. | `src/**/*.contract.test.ts`, `src/**/*.contract.test.tsx`. | `pnpm test` inside `pnpm verify`. | Playwright and fixed sleeps. |
| E2E test | Browser-specific behavior and user-value flows across the rendered app. | Pure calculations, exhaustive data integrity, every ViewModel branch. | `e2e/**/*.spec.ts`. | `pnpm e2e` in the E2E workflow and `pnpm verify:full`. | Untagged tests, fixed sleeps, and focused tests. |
| Smoke E2E test | Critical happy paths and browser-only regressions that should stay small. | Exhaustive cross-product coverage. | `e2e/**/*.spec.ts` with `@smoke`. | Pull-request E2E workflow. | Same as E2E. |
| Full E2E test | Broader browser flows reserved for deliberate full verification. | Unit/integration/contract coverage that can run lower. | `e2e/**/*.spec.ts` with `@full`. | `pnpm verify:full` or a future scheduled/manual workflow. | Same as E2E. |

Prefer the lowest sufficient test layer. Do not reduce coverage by moving assertions out of E2E
unless the same user value is covered by unit, integration, or contract tests.

## CI and Commands

Package manager:

- `pnpm@10.17.1`
- Node `>=20.19.0`

Local commands:

- `pnpm check`: Biome check, including architecture import rules, focused-test bans, test
  `setTimeout` bans, and unit-test dependency restrictions.
- `pnpm check:test-policy`: E2E tag and Playwright `waitForTimeout` policy check.
- `pnpm check:policy`: alias for the E2E policy check that is not covered by Biome.
- `pnpm typecheck`: app and node TypeScript projects.
- `pnpm test`: Vitest.
- `pnpm test:coverage`: Vitest with V8 coverage thresholds.
- `pnpm build`: typecheck plus Vite build.
- `pnpm e2e`: Playwright.
- `pnpm verify`: check, policy, typecheck, test, build.
- `pnpm verify:full`: verify plus coverage thresholds and E2E.

GitHub Actions:

- `.github/workflows/verify.yml` runs `pnpm verify` on pull requests and pushes to `main`.
- `.github/workflows/e2e.yml` installs Chromium and runs `pnpm e2e` on pull requests and manual
  dispatch.
- `.github/workflows/deploy-pages.yml` runs `pnpm verify`, then builds with `GITHUB_PAGES=true`,
  then deploys Pages on manual dispatch.

## Implemented Enforcement

This ADR uses Biome first. A small dependency-free Node policy check remains only for rules that do
not map cleanly to a Biome option.

`biome.json` uses `noRestrictedImports` overrides to enforce:

- `src/domain/` imports only `src/domain/`.
- `src/calculations/` imports only `src/calculations/` and `src/domain/`.
- `src/data/` does not import framework or Node infrastructure modules.
- `src/indexes/` only imports data/domain/index modules.
- `src/queries/` and `src/features/explorer/` do not import `src/app/`, `src/ui/`, framework
  modules, Node infrastructure, or test frameworks.
- `src/ui/` does not import `src/data/`, `src/indexes/`, or `src/queries/`.
- Unit tests do not import Playwright, browser automation, filesystem, HTTP, or server/process
  dependencies.

`biome.json` also uses:

- `noFocusedTests` to reject `test.only`, `describe.only`, and `it.only`.
- `noRestrictedGlobals` to reject `setTimeout(...)` in tests.

`scripts/check-test-policy.mjs` enforces the remaining policy not covered by Biome:

- No Playwright `waitForTimeout(...)` in E2E tests.
- Every E2E test has an `@smoke` or `@full` tag.

Existing E2E tests are tagged `@smoke`. `MapView` no longer reads raw map data; map background path
data is exposed by the explorer ViewModel.

`vitest.config.ts` enforces V8 coverage thresholds:

- Global minimum: 96% lines/statements/functions and 83% branches.
- `src/domain/ids.ts` and `src/calculations/**`: 100% lines/statements/functions/branches.
- `src/indexes/**`: 96% lines/statements, 100% functions, 90% branches.
- `src/queries/**`: 90% lines/statements, 100% functions, 85% branches.
- `src/features/explorer/**`: 95% lines/statements, 98% functions, 85% branches.
- `src/data/**`: 99% lines/statements, 100% functions, 80% branches.
- `src/ui/components/**`: 83% lines/statements, 88% functions, 74% branches.
- `src/app/**`: 92% lines/statements, 100% functions, 64% branches.

The UI and app branch thresholds are intentionally lower than the pure logic thresholds. Raising
them should come from meaningful behavior tests or simpler branching, not tests that only execute
lines for coverage.

## Not Implemented Yet

- `dependency-cruiser`, `eslint-plugin-boundaries`, or ESLint `no-restricted-imports`: not added
  because the repo currently uses Biome, and the P0 import rules are enforceable with Biome
  `noRestrictedImports`.
- DB/API/browser infrastructure adapter rules: no DB, server API, or runtime filesystem adapter
  exists yet.
- Flaky-test quarantine, test duration reporting, changed-files selection, and E2E budgets: useful
  once test count and runtime justify them.

## Rollout Order

P0 now:

- Keep domain/core free of UI, framework, and infrastructure imports.
- Keep UI from reading raw data/index/query modules.
- Forbid focused tests and fixed sleeps.
- Forbid unit-test imports of E2E/browser/filesystem/HTTP dependencies.
- Require `@smoke` or `@full` E2E tags.
- Run policy checks in `pnpm verify`, so Verify CI and Pages quality gates enforce them.

P1 next:

- Raise `src/ui/components/**` and `src/app/**` branch coverage by adding meaningful interaction or
  ViewModel/browser-wiring tests, or by simplifying branches.
- Decide whether `src/queries/queryMatchesByViewState.ts` should move under `src/features/explorer/`
  or accept a feature-independent filter criteria type.
- Add stricter test naming and helper/fixture placement checks if test count increases.
- Reconsider dependency-cruiser or ESLint boundary tooling only if local scripts become too shallow.

P2 later:

- Add E2E runtime and count budgets.
- Track flaky tests and isolate known flaky specs.
- Add changed-files based test selection.
- Report test durations in CI.
