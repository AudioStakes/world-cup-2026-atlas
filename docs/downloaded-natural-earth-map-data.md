# Downloaded Natural Earth map data

This project now generates the North America base map from Natural Earth GeoJSON.

## Commands

```bash
pnpm map:data
```

`pnpm ready` now runs `pnpm map:data` first.

## Sources

The generator downloads:

- `ne_110m_admin_0_countries.geojson`
- `ne_110m_lakes.geojson`

from the Natural Earth vector repository.

## Generated file

```txt
src/data/northAmericaMapData.ts
```

The generated file contains:

- Canada
- United States
- Mexico
- Great Lakes water polygons

## Important policy

Do not hand-author or approximate the North America landmass in `MapView.tsx`.

The base map must come from downloaded Natural Earth geographic data, then be projected into the explorer SVG.
