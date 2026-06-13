# Testing strategy

World Cup 2026 Atlas keeps UI behavior stable by testing pure logic first and browser behavior second.

## Local quality gate

Run this before handing work off:

```bash
pnpm verify
```

`pnpm verify` runs:

1. `pnpm check`
2. `pnpm check:policy`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

## End-to-end smoke tests

Install Playwright browsers once:

```bash
pnpm exec playwright install chromium
```

Then run:

```bash
pnpm e2e
```

Use this before UI-heavy handoffs:

```bash
pnpm verify:full
```

`pnpm verify:full` runs the normal quality gate, coverage thresholds, and Playwright smoke tests.

## Testing priorities

Prefer pure function tests for:

- URL parse/serialize
- initial state resolution
- state transitions
- search behavior
- ViewModel generation

Use Playwright only for critical browser flows:

- initial A1 fallback selection
- team selection from Groups & Teams
- venue selection from the map
- URL state synchronization

## Test layers

- Unit tests live beside source as `*.test.ts` or `*.test.tsx`; they verify pure domain,
  calculation, state transition, query, and ViewModel behavior without browser, HTTP, DB, or
  filesystem dependencies.
- Integration tests use `*.integration.test.ts` or `*.integration.test.tsx` when multiple local
  modules must be verified together under Vitest.
- Contract tests use `*.contract.test.ts` or `*.contract.test.tsx` for stable data shape or adapter
  expectations.
- Smoke E2E tests live in `e2e/` and must include `@smoke` in the Playwright test title.
- Full E2E tests live in `e2e/` and must include `@full` in the Playwright test title.

Biome enforces focused-test bans, `setTimeout` bans in tests, unit-test dependency restrictions, and
architecture import rules through `pnpm check`. `pnpm check:policy` enforces E2E tags and
Playwright `waitForTimeout` bans. `pnpm verify` runs both in CI.

## Coverage thresholds

`pnpm test:coverage` enforces Vitest V8 coverage thresholds from `vitest.config.ts`.
`pnpm verify:full` runs `pnpm test:coverage`.

Thresholds are intentionally strict for pure logic and lower for UI/browser wiring:

- `src/domain/ids.ts` and `src/calculations/**`: 100% lines/statements/functions/branches.
- `src/indexes/**` and `src/queries/**`: at least 90% lines/statements/branches and 100%
  functions.
- `src/features/explorer/**`: at least 95% lines/statements, 98% functions, and 85% branches.
- `src/data/**`: at least 99% lines/statements, 100% functions, and 80% branches.
- `src/ui/components/**`: at least 83% lines/statements, 88% functions, and 74% branches.
- `src/app/**`: at least 92% lines/statements, 100% functions, and 64% branches.
