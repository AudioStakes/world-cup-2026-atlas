# Geographic map data for North America

This change replaces the hand-authored abstract map background with a data-driven map layer.

## What changed

- Added `src/data/northAmericaMapData.ts`
- Added `src/features/explorer/projectGeoPoint.ts`
- Updated `MapView.tsx` to render polygons from geographic latitude/longitude data
- Added projection tests

## Policy

The app should not draw the map background as arbitrary SVG blobs.

Instead:

```txt
geographic data -> projection -> SVG path
```

Venue `geoPoint` and background map polygons now use the same coordinate system: latitude and longitude.

## Current dataset status

The included map polygons are lightweight, simplified North America geographic polygons suitable for the current product UI. They are intentionally much smaller than full-resolution GIS data, but unlike the previous hand-drawn background, they are expressed as geographic coordinate data and projected into the SVG map.
