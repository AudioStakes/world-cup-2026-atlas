# Interaction hardening

This checkpoint strengthens end-to-end coverage for the core explorer behavior.

Covered flows:

- default initial state falls back to the tournament date
- URL query restores a country selection
- country selection updates URL, Result, and pressed state
- re-clicking the selected country keeps that country active
- selecting a different group, date, or venue replaces the previous filter

These tests intentionally assert user-facing behavior rather than implementation details. Keep them focused on the explorer contract:

1. URL state
2. accessible controls
3. Result card heading
4. selected state via `aria-pressed`
