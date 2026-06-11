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

### Process-based integration tests

- When a test spawns `child_process`, creates temporary git repositories, or installs fake CLI binaries, add a shared timeout constant in that file from the initial implementation.
- Leave a short comment explaining that the timeout covers process startup, git initialization, and fake CLI setup overhead.
- Use `30_000`ms as the default starting point.
- Apply the timeout consistently at the `describe` level or through shared helpers instead of scattering per-test overrides.
- If a case appears to need a longer timeout, first check whether fixture setup, fake command behavior, or process count can be reduced.

## UI Review Viewports

For PC-oriented UI changes, check these viewports when practical:

- 1280x720
- 1366x768
- 1440x900

For Explorer UI changes, check representative routes:

- /
- /?country=jpn
- /?venue=dallas
- /?date=2026-06-14
