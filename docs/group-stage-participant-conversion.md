# Group-stage participant conversion

This migration converts the 72 group-stage matches from the old flat fields to the new participant model.

## Old shape

```ts
homeSlotId
awaySlotId
homeCountryId
awayCountryId
```

## New shape

```ts
homeParticipant: slotParticipant(slotId("F1"), countryId("ned"))
awayParticipant: slotParticipant(slotId("F2"), countryId("jpn"))
```

Queries and indexes now derive concrete countries from `slot` participants.

This keeps group-stage behavior unchanged while allowing the next migration to add knockout fixtures using:

- `groupPlacementParticipant`
- `thirdPlaceQualifierParticipant`
- `matchWinnerParticipant`
- `matchLoserParticipant`
