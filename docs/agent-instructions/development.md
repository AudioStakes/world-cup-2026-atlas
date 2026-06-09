# Development

## Overview

Use TypeScript and Preact for implementation work. Keep the application state-driven and preserve the data-to-ViewModel pipeline documented in `README.md`.

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

## Rules

- Prefer pure functions for state transitions, indexes, queries, filtering, sorting, and calculations.
- Keep `queryExplorer()` as the only source of UI-facing Explorer ViewModel data.
- Keep Preact components thin: components should render ViewModel data and dispatch explicit user intents.
- Do not duplicate business rules inside components when they can live in query, ViewModel, or state modules.
- Keep URL/request-parameter handling separate from selection logic.
- Preserve the primary product direction: Groups & Teams for country selection, map pins for venue selection, date chips for date selection, and result cards for the selected context.
- Prefer the smallest reviewable change that satisfies the request.
- Avoid broad refactors unless the task explicitly requires them or the current design blocks the requested behavior.
- Keep implementation aligned with the Preact/Vite/Vitest/Biome/Playwright/pnpm toolchain.

## UI Behavior

- Initial selection should come from request parameters when present; otherwise fall back to Group A position 1.
- Group, country, date, and venue surfaces should remain clickable selection controls.
- Selection changes should update all dependent UI surfaces consistently: cards, chips, result panel, map highlight, and route display.
- Prefer accessible native controls or explicit button semantics for clickable UI.
