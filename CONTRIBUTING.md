# Contributing

## Required workflow

1. Keep changes small and focused.
2. Run `pnpm verify` before handing off.
3. Do not bypass TypeScript, Biome, or tests.
4. Add tests for state transitions, queries, and ViewModel logic before UI-heavy work.

## Code standards

- Use TypeScript strict mode without exceptions.
- Avoid `any`.
- Avoid non-null assertions unless there is a short comment explaining the invariant.
- Prefer pure functions for domain, query, calculation, and state-transition logic.
- Keep UI components focused on rendering ViewModels and dispatching typed actions.
- Do not let UI components read raw data or indexes directly.

## Design constraints

- Do not reintroduce Active Filters chips.
- Do not reintroduce a separate Country selector.
- Do not add venue filter lists to the left panel.
- Use Groups & Teams as the primary team selection UI.
- Use map venue pins as the venue selection UI.
- Keep the visual design light, map-first, and calm.
