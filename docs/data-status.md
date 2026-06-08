# Data status guardrails

`dataStatus` is a contract, not a decoration.

## Current rule

At this checkpoint, competition data should remain:

```txt
provisional
```

Competition data means:

- countries
- group slot assignments
- matches

The data has been aligned with currently available group and fixture references, but has not yet been imported from a captured official structured FIFA source in this repository.

## Venue exception

The current venue seed data already uses:

```txt
official
```

for all 16 venues.

This is temporarily allowed because the venue records were created earlier than the stricter source-note policy. The next data-status cleanup should either:

1. add `sourceNote` to every official venue record, or
2. downgrade venue `dataStatus` to `provisional` until source capture is complete.

Do not extend this exception to countries, slot entries, or matches.

## Guardrails

`src/data/dataStatus.test.ts` enforces:

- no `official` competition record without `sourceNote`
- no `placeholder` record in visible app data
- current competition dataset remains entirely `provisional`
- current venue seed dataset remains consistently `official`

## When to use official

A competition record may become `official` only when:

1. the exact value is checked against an official source
2. the source is listed in `src/data/dataSources.ts`
3. the record has a `sourceNote` pointing to the source record or import note
4. the relevant test expectation is updated intentionally

## When to use placeholder

`placeholder` is acceptable only for hidden or clearly incomplete structures that keep the type system working.

Do not use `placeholder` for visible teams, fixtures, venues, dates, or route data.
