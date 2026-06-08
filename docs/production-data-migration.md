# Production data migration checklist

Use this checklist when replacing provisional data.

## 1. Capture source references

For every imported dataset, record:

- source title
- publisher
- URL
- access date
- fields imported
- known caveats

Update `src/data/dataSources.ts` first.

## 2. Import core source data

Update these files in order:

```txt
src/data/countries.ts
src/data/groups.ts
src/data/slotEntries.ts
src/data/venues.ts
src/data/matches.ts
```

## 3. Preserve IDs

Avoid changing existing IDs unless the current ID is wrong.

Stable IDs keep URLs and tests stable:

```txt
country=jpn
venue=seattle
group=F
date=2026-06-14
```

## 4. Validate invariants

At minimum, `pnpm ready` should confirm:

- 12 groups
- 48 slots
- unique country IDs
- unique FIFA codes
- unique venue IDs
- unique match IDs
- every match references known slots
- every match references a known venue
- every assigned country exists
- every venue has a geo point
- every venue map point is inside the map viewBox

## 5. Keep derived values derived

Do not manually store route totals, highlighted venues, or distance rankings in data files.

Those belong to query or calculation code.
