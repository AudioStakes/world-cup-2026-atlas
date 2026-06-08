# Knockout fixture import

This migration adds Match 73 through Match 104.

## Scope

The app now contains:

- 72 group-stage matches
- 16 round-of-32 matches
- 8 round-of-16 matches
- 4 quarter-finals
- 2 semi-finals
- 1 third-place match
- 1 final

Total:

```txt
104 matches
```

## Participant model

Knockout fixtures use:

- `groupPlacementParticipant`
- `thirdPlaceQualifierParticipant`
- `matchWinnerParticipant`
- `matchLoserParticipant`

This avoids pretending that knockout fixtures already have concrete teams before group results are known.

## Source status

The knockout schedule is currently imported from the Wikipedia knockout-stage page, which references FIFA match reports and the FIFA match schedule.

The records remain:

```txt
dataStatus: provisional
```

and use:

```txt
sourceNote: wikipedia-2026-world-cup-knockout-stage
```

A later source cleanup can promote records to `official` after source URLs are captured directly from FIFA.
