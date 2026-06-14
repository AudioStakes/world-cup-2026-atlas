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

## Venue status

The current venue seed data uses:

```txt
official
```

for all 16 venues.

Each official venue record must keep a `sourceNote` linked to a known data source id.
Do not extend official status to countries, slot entries, or matches until source capture is complete.

## Guardrails

`src/data/dataStatus.test.ts` enforces:

- no `official` competition record without `sourceNote`
- no `placeholder` record in visible app data
- current competition dataset remains entirely `provisional`
- current venue seed dataset remains consistently `official`
- every visible production record has `sourceNote`
- every `sourceNote` points to a known data source id

## When to use official

A competition record may become `official` only when:

1. the exact value is checked against an official source
2. the source is listed in `src/data/dataSources.ts`
3. the record has a `sourceNote` pointing to the source record or import note
4. the relevant test expectation is updated intentionally

## When to use placeholder

`placeholder` is acceptable only for hidden or clearly incomplete structures that keep the type system working.

Do not use `placeholder` for visible teams, fixtures, venues, dates, or route data.

## UI disclosure

Design decision: do not expose data-status or derived-distance summary text in the app header.
The header should stay focused on the title and match-time selector because these status notes are
not needed for the primary exploration workflow. Keep data provenance in repository docs and
guardrail tests instead of adding visible header chrome.
