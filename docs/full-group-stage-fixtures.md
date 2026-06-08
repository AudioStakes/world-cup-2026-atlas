# Full group-stage fixture import

This migration replaces the partial fixture seed with all 72 group-stage matches.

## Scope

Updated:

- `src/data/matches.ts`
- `src/data/groupFixtureCoverage.test.ts`
- `src/indexes/createIndexes.test.ts`
- `src/data/productionGroupStageFixtures.test.ts`
- `src/data/dataSources.ts`

Not yet updated:

- knockout stage matches

The current `Match` model requires concrete `homeSlotId` and `awaySlotId`, which works for group-stage fixtures but does not yet model knockout participants such as `Winner Group A` or `3rd Group C/E/F/H/I`.

## Source status

This import uses the FourFourTwo full fixture list as a structured secondary source while the exact official FIFA structured schedule URL is captured.

For that reason, match records remain:

```txt
dataStatus: provisional
```

and use:

```txt
sourceNote: fourfourtwo-world-cup-2026-fixtures-group-stage
```

## Next step

Add knockout-stage schedule data by extending the domain model to support non-country participants:

- group winner
- group runner-up
- third-place qualifier bucket
- winner / loser of prior match

Only after that should matches 73-104 be added.
