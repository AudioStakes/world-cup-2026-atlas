# Venue marker label placement

Venue markers are anchored by `Venue.mapPoint`, but labels are positioned through CSS.

This keeps two concerns separate:

- data coordinates place the venue dot
- CSS offsets handle label readability

Rules:

1. Do not change venue coordinates just to move a label.
2. Use `data-venue-id` selectors for local label offsets.
3. Prefer moving labels away from dense areas rather than hiding labels.
4. Keep the dot clickable even when the label is offset.
5. Run `pnpm ready` and `pnpm e2e` after changing label placement.

East Coast labels intentionally extend left and use vertical offsets because Boston, New York / New Jersey, and Philadelphia are close together.
