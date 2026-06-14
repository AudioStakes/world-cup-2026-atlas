# Development

## Product Decisions

- Groups & Teams is the primary country and group selection surface.
- Venue selection happens through map pins and result context.
- URL query parameters represent shareable explorer state.
- Do not reintroduce Active Filters chips, a separate Country selector, or selection notice text.
- Do not add a search form to the explorer.
- Do not show raw URL state or a header-level Clear button.

## Visual Change Scope

- For visual polish tasks, prefer CSS-only changes unless behavior changes are required.
- Do not change tournament data, Natural Earth map data, projection logic, or venue coordinates
  during visual-only tasks.

## TypeScript Checks

- During active TypeScript fixes, run `rtk proxy pnpm typecheck` when you need full compiler
  diagnostics. The compressed `rtk pnpm typecheck` summary can hide the individual errors that
  `pnpm verify` will later surface.

## Focused Tests

- To run one Vitest file, use `rtk test pnpm exec vitest run <path>`. Avoid `pnpm test -- <path>`
  for focused runs; it can execute the full test suite instead of filtering to the file.
