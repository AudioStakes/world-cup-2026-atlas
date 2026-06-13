# Testing

Config files and scripts are the source of truth for test policy. Prefer the closest useful check
while working; stop hooks run broader verification.

## Commands

- Unit/integration/contract tests: `pnpm test`
- Coverage gate: `pnpm test:coverage`
- Browser E2E: `pnpm e2e`
- Full local gate: `pnpm verify:full`

## UI Review Routes

For Explorer UI changes, check representative routes when useful:

- `/`
- `/?country=jpn`
- `/?venue=dallas`
- `/?date=2026-06-14`
