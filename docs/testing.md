# Testing strategy

World Cup 2026 Atlas keeps UI behavior stable by testing pure logic first and browser behavior second.

## Local quality gate

Run this before handing work off:

```bash
pnpm ready
```

`pnpm ready` runs Biome safe fixes first, then the required verification gate.

## Required verification

```bash
pnpm verify
```

This is read-only and must pass in CI. It runs:

1. `pnpm check`
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
- AND search behavior
- ViewModel generation

Use Playwright only for critical browser flows:

- initial A1 fallback selection
- team selection from Groups & Teams
- venue selection from the map
- URL state synchronization
