# Testing

## Overview

Tests should describe observable behavior through public interfaces and user-visible outcomes.

## Rules

- Add or update tests for every behavior change, bug fix, or feature.
- Prefer testing query outputs, ViewModels, and user-visible interactions over implementation details.
- Keep state, query, ViewModel, and UI tests separately understandable.
- Follow red-green-refactor.
- Never refactor while tests are red.
- Verify selection synchronization between group, country, date, and venue filters.
- Verify URL/request-parameter initialization behavior.
- Verify map highlighting and route rendering behavior when selection changes.
- For UI-heavy work, run Playwright coverage on the affected flow.
- Routine completion checks should use `pnpm verify`.
- For significant UI changes, use `pnpm verify:full`.

## Guidance

- Test public behavior, not component internals.
- Prefer ViewModel tests when UI rendering details are not the core concern.
- Use Playwright for end-to-end interaction flows.
- Focus on selection logic, filtering correctness, and cross-surface synchronization.
