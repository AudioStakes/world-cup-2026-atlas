# Map viewport guardrails

The explorer map uses a fixed SVG coordinate system.

`EXPLORER_MAP_VIEWBOX` is the shared source of truth for:

- `MapView` SVG `viewBox`
- venue marker percentage placement
- tests that ensure every venue marker remains visible

When changing the map artwork or venue coordinates:

1. Update `EXPLORER_MAP_VIEWBOX` first if the coordinate system changes.
2. Keep `Venue.mapPoint` values in the same coordinate system.
3. Run `pnpm ready` and `pnpm e2e`.
4. Check the map visually in `pnpm dev`.

Do not duplicate viewBox constants inside components.
