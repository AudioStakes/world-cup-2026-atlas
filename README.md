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

## Detailed Instructions

- [Development](docs/development.md)
- [Testing](docs/testing.md)
- [Docs and Domain](docs/docs-and-domain.md)
- [Live Result Updates](docs/live-result-updates.md)

## Quality Gates

Use `pnpm verify` for the normal quality gate. Use `pnpm verify:full` when coverage thresholds and
Playwright smoke tests are needed.

## Scripts

```bash
pnpm fix         # write Biome safe fixes, formatting, and import organization
pnpm typecheck   # run TypeScript strict checks for app and node configs
pnpm test        # run unit tests once
pnpm e2e         # run Playwright smoke tests
pnpm test:coverage # run Vitest with coverage thresholds
pnpm build       # build production assets
pnpm verify      # quality gate
pnpm verify:full # run verify, coverage, and e2e
pnpm ready       # write safe fixes, then run verify
```

## Product Direction

The app should prioritize:

- Groups & Teams as the primary country selection surface.
- Map pins as the primary venue selection surface.
- No explorer search form; discovery should stay anchored in Groups & Teams, map pins, and selected-result context.
- No raw URL state or Clear action in the header.
- Country flags in Groups & Teams must always remain visible; users may identify countries by flag alone, and secondary text should collapse before flags are hidden.
- Group labels inside Groups & Teams should use only the group letter because the section label already provides the group context.
- `queryExplorer()` as the only source of UI-facing ViewModel data.
- Runtime match results should be fetched through `/api/results` and merged before `queryExplorer()`
  creates ViewModels; UI components must not call API-FOOTBALL or know provider response shapes.
- Pure functions for state transitions, queries, and calculations.
