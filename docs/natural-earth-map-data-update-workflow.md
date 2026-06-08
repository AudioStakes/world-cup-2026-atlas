# Natural Earth map data update workflow

The app uses a checked-in generated map-data file:

```txt
src/data/northAmericaMapData.ts
```

## Normal development

Do not download map data during normal verification.

```bash
pnpm ready
pnpm e2e
```

`pnpm ready` intentionally does not run `pnpm map:data`.

## Updating map data

Run this only when intentionally refreshing the Natural Earth source data:

```bash
pnpm map:data
```

This downloads Natural Earth GeoJSON and regenerates:

```txt
src/data/northAmericaMapData.ts
```

Then review and commit the generated file.

```bash
git diff src/data/northAmericaMapData.ts
pnpm ready
pnpm e2e
git add scripts/download-natural-earth-map-data.mjs src/data/northAmericaMapData.ts
```

## Policy

- `pnpm ready` must be deterministic and must not depend on network access.
- CI must use checked-in map data.
- `pnpm map:data` is a manual source refresh command.
- `src/data/northAmericaMapData.ts` should be committed to the repository.
