# Map viewport guardrails

The explorer map uses a fixed SVG coordinate system.

`EXPLORER_MAP_VIEWBOX` is the shared source of truth for:

- projecting venue `geoPoint` values into explorer map coordinates
- tests that ensure projected venue markers remain visible

When changing map artwork or venue coordinates:

1. Update `EXPLORER_MAP_VIEWBOX` first if the coordinate system changes.
2. Keep `projectGeoPointToExplorerMap()` aligned with the same coordinate system.
3. Check the map visually in `pnpm dev`.

Do not duplicate viewBox constants inside components.
