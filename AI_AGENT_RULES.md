# AI Agent Rules

These rules are mandatory for AI agents working on this repository.

## Architecture rules

- UI components must render `ExplorerViewModel` data only.
- UI components must not read raw data, indexes, or query internals directly.
- All explorer state transitions must go through `updateExplorerViewState()`.
- All explorer screen data must come from `queryExplorer()`.
- Keep core logic independent from Preact and browser APIs.
- Prefer pure functions for query, calculation, normalization, and state transition code.

## Product rules

- App name: `World Cup 2026 Atlas`.
- Groups & Teams is the primary country/team selection UI.
- Group headers select groups.
- Country rows select countries.
- Date chips select dates.
- Venue pins on the map select venues.
- Do not reintroduce Active Filters chips.
- Do not reintroduce selection-notice messages such as `Japan filter was removed`.
- Do not reintroduce a separate Country selector.
- Do not add a Venue list to the left panel.

## State rules

- MVP explorer state is single-selection based:
  - `selectedCountryId`
  - `selectedGroupCode`
  - `selectedDate`
  - `selectedVenueId`
- URL query params are the source of shareable exploration state.
- If URL params are absent, initial state should fall back to Group A slot 1 when that feature is implemented.
- Selecting an option that conflicts with the current AND filter should keep the new selection and remove conflicting old selections.

## Code quality rules

- Do not use `any`.
- Do not use non-null assertions unless the invariant is locally obvious and documented.
- Do not suppress TypeScript or Biome errors.
- Do not add formatting-only churn outside the files you are intentionally changing.
- Do not add new dependencies without a clear reason in the PR or handoff notes.
- Run `pnpm verify` before handoff.

## Testing rules

Prioritize tests in this order:

1. URL parse/serialize logic.
2. Explorer state normalization.
3. Explorer state transitions.
4. Match queries.
5. ViewModel creators.
6. Preact component smoke tests.
7. End-to-end interaction tests.
