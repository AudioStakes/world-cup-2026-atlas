# Testing strategy

World Cup 2026 Atlas keeps UI behavior stable by testing pure logic first and browser behavior second.

## Local quality gate

Run this before handing work off:

```bash
pnpm verify
```

`pnpm verify` runs:

1. `pnpm fix`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

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

`pnpm verify:full` runs the normal quality gate plus Playwright smoke tests.

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
