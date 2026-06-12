# world-cup-2026-atlas

`world-cup-2026-atlas` is a static Preact application for exploring teams, groups, dates, venues, and travel routes for FIFA World Cup 2026.

## Quick Reference

- Install: `pnpm install`
- Dev: `pnpm dev`
- Fix: `pnpm fix`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- E2E: `pnpm e2e`
- Verify: `pnpm verify`
- Full UI verification: `pnpm verify:full`
- Use concise, direct replies

## Detailed Instructions

- [Development](docs/agent-instructions/development.md)
- [Testing](docs/agent-instructions/testing.md)

## Quality Gates

Run this before handing work off:

```bash
pnpm verify
```

`pnpm verify` runs:

1. `pnpm fix`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

For UI-heavy changes, install Playwright browsers once and run the full gate:

```bash
pnpm exec playwright install chromium
pnpm verify:full
```

`pnpm verify:full` runs:

1. `pnpm verify`
2. `pnpm e2e`

## Scripts

```bash
pnpm fix         # write Biome safe fixes, formatting, and import organization
pnpm typecheck   # run TypeScript strict checks for app and node configs
pnpm test        # run unit tests once
pnpm e2e         # run Playwright smoke tests
pnpm build       # build production assets
pnpm verify      # quality gate
pnpm verify:full # run verify and e2e
pnpm ready       # write safe fixes, then run verify
```

## Product Direction

The app should prioritize:

- Groups & Teams as the primary country selection surface.
- Map pins as the primary venue selection surface.
- `queryExplorer()` as the only source of UI-facing ViewModel data.
- Pure functions for state transitions, queries, and calculations.
