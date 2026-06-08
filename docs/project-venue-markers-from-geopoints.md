# Project venue markers from geoPoints

Venue markers now use the same coordinate system as the Natural Earth base map.

## Previous behavior

```txt
Venue.geoPoint  -> real stadium latitude/longitude
Venue.mapPoint  -> old manually tuned SVG coordinate
Map marker      -> Venue.mapPoint
```

This made markers drift after the base map was changed to Natural Earth data.

## New behavior

```txt
Venue.geoPoint -> projectGeoPointToExplorerMap(...) -> marker position
```

Routes use the same projected positions.

## Policy

`geoPoint` is the source of truth for geographic placement.

`mapPoint` may remain on the `Venue` type temporarily for compatibility, but `createMapViewModel` must not use it for marker or route placement while the map background is generated from geographic data.
