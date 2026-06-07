# AI agent rules

Follow these rules when implementing changes in World Cup 2026 Atlas.

## Required command

Before handing off, run:

```bash
pnpm ready
```

For UI-heavy changes, also run:

```bash
pnpm verify:full
```

If Playwright browsers are not installed locally, run:

```bash
pnpm exec playwright install chromium
```

## Architecture rules

- UI components must not read raw `data` or `indexes` directly.
- UI components render `ExplorerViewModel` data and dispatch `ExplorerAction` only.
- State transitions must go through `updateExplorerViewState()`.
- Screen-level ViewModel data must come from `queryExplorer()`.
- Keep domain/query/calculation code UI-independent.
- Prefer pure functions for state transitions, queries, calculations, and ViewModel builders.

## Product rules

- Do not reintroduce Active Filters chips.
- Do not reintroduce a separate Country selector.
- Do not reintroduce selection notice text such as "Japan filter was removed".
- Groups & Teams is the primary country and group selection surface.
- Venue selection happens through map pins.
- URL query parameters represent shareable explorer state.

## TypeScript rules

- Do not use `any`.
- Do not use non-null assertions unless a test or invariant makes it unavoidable and the reason is documented.
- Do not weaken TypeScript strict settings.
- Keep branded ID types at domain boundaries.
- Avoid `Date` objects outside date utility or ViewModel creation functions.

## Accessibility rules

- Prefer native `button` elements for interactive controls.
- Do not add `aria-label` to non-interactive `div` elements.
- Use visible text when it already communicates the control purpose.
- Keep keyboard focus visible.
- Update Playwright or component tests when changing accessible names.
