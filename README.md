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
- pnpm

## Development

```bash
pnpm install
pnpm dev
```

## Quality gates

Run this before handing work off:

```bash
pnpm verify
```

`pnpm verify` runs:

1. `pnpm check`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Formatting is intentionally strict so work remains stable across human and AI contributors.

## Scripts

```bash
pnpm format        # write Biome formatting changes
pnpm format:check  # check formatting only
pnpm lint          # run Biome lint
pnpm check         # run Biome format/lint/import checks
pnpm typecheck     # run TypeScript strict checks
pnpm test          # run unit tests once
pnpm test:watch    # run Vitest watch mode
pnpm test:coverage # run Vitest coverage
pnpm build         # build production assets
pnpm verify        # run the required quality gate
```

## Product direction

The app should prioritize:

- Groups & Teams as the primary country selection surface.
- Map pins as the primary venue selection surface.
- `queryExplorer()` as the only source of UI-facing ViewModel data.
- Pure functions for state transitions, queries, and calculations.
