# Testing

Use the lowest useful command while working; use the full gate before UI-heavy handoffs.

## Commands

- `pnpm test`: Vitest tests.
- `pnpm test:coverage`: Vitest with coverage thresholds from `vitest.config.ts`.
- `pnpm e2e`: Playwright smoke tests.
- `pnpm verify`: Biome, policy check, typecheck, Vitest, and build.
- `pnpm verify:full`: `pnpm verify`, coverage thresholds, and Playwright.

Config files and scripts are the source of truth for enforced test policy.
