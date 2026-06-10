# Downloaded Natural Earth map data

This project generates the North America base map from Natural Earth GeoJSON.

## Commands

```bash
pnpm map:data
```

Normal verification does not run `pnpm map:data`.

## Sources

The generator downloads:

- `ne_110m_admin_0_countries.geojson`
- `ne_110m_lakes.geojson`

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

Do not hand-author or approximate the North America landmass in `MapView.tsx`. The base map must come from downloaded Natural Earth geographic data, then be projected into the explorer SVG.
