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

## Agent Operating Principle

Repository instructions and hooks exist to reduce agent cognitive load.
Per-task prompts should focus only on task-specific goals, scope, and review targets.
Stable development rules, validation commands, delivery rules, and report format belong in repository instructions, not repeated task prompts.

## Rules

- Use `$agent-md-refactor` when refactoring `AGENTS.md`, `CLAUDE.md`, or related agent-instruction docs.
- If that refactor also changes repository code or tests, use `$tdd` for those code changes.
- Use `$tdd` for important repository behavior that already has automated test coverage, including hook code such as `.codex/hooks/stop_gate.mjs`.
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

## UI Change Scope

- For visual polish tasks, prefer CSS-only changes unless the requested behavior requires ViewModel or component changes.
- Do not change tournament data, Natural Earth map data, projection logic, or venue coordinates during visual-only tasks.
- Do not modify selection, filtering, URL state, or route logic unless the task explicitly asks for behavior changes.
- Keep full-viewport app shell behavior intact unless the task is specifically about layout.
- Preserve the existing map rendering architecture: Natural Earth map data, projected venue positions, SVG-positioned semantic venue buttons.

## In-App Browser Verification

Use this only when a task explicitly needs the Browser plugin or the current in-app browser page.

For the current tab, start with:

```js
var tab = await browser.tabs.selected();
await tab.reload();
await tab.playwright.waitForLoadState("networkidle");
```

Do not call `browser.tabs()`; `tabs` is an object, not a function.
