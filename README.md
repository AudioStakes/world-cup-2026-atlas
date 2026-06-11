# World Cup 2026 Atlas

World Cup 2026 Atlas is a static Preact application for exploring teams, groups, dates, venues, and travel routes across North America.

The implementation is intentionally state-driven:

```txt
Data
 ↓
Indexes
 ↓
Atomic Queries
 ↓
Explorer Query
 ↓
Explorer ViewModel
 ↓
Preact UI
```

## Stack

- Preact
- TypeScript
- Vite
- Biome
- Vitest
- Testing Library
- Playwright
- pnpm

## Development

```bash
pnpm install
pnpm dev
```

## Quality gates

Run this before handing work off:

```bash
pnpm ready
```

`pnpm ready` runs Biome safe fixes, then `pnpm verify`.

CI should run the read-only gate:

```bash
pnpm verify
```

`pnpm verify` runs:

1. `pnpm check`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

For UI-heavy changes, install Playwright browsers once and run the full gate:

```bash
pnpm exec playwright install chromium
pnpm verify:full
```

In the Codex app, run `pnpm codex:stop-check` before ending a thread if you want the CLI `Stop` hook's final verification flow.

## Scripts

```bash
pnpm fix          # write Biome safe fixes, formatting, and import organization
pnpm format       # alias for pnpm fix
pnpm lint         # run Biome lint only
pnpm check        # run Biome format/lint/import checks without writing
pnpm typecheck    # run TypeScript strict checks
pnpm test         # run unit tests once
pnpm test:watch   # run Vitest watch mode
pnpm test:coverage # run Vitest coverage
pnpm build        # build production assets
pnpm verify       # run the required read-only quality gate
pnpm e2e          # run Playwright smoke tests
pnpm verify:full  # run verify and e2e
pnpm ready        # run safe fixes and verify
```

## Product direction

The app should prioritize:

- Groups & Teams as the primary country selection surface.
- Map pins as the primary venue selection surface.
- `queryExplorer()` as the only source of UI-facing ViewModel data.
- Pure functions for state transitions, queries, and calculations.
