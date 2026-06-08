# Stabilized production metadata rendering tests

This patch stabilizes `src/app/App.test.tsx`.

Changes:

- venue result test clears the default Japan selection before selecting Dallas
- long match-card assertions are scoped to the target match card
- long venue text checks are split into smaller assertions where helpful

Reason:

The app starts with Japan selected. Dallas is compatible with Japan's schedule, so selecting Dallas from the default state can remain an AND-filtered country result instead of switching the result heading to `Dallas`. The venue result test should therefore clear the default selection first.
