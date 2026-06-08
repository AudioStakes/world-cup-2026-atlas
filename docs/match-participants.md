# Match participant model

The original `Match` model required:

```ts
homeSlotId
awaySlotId
homeCountryId
awayCountryId
```

That works for group-stage matches, but it cannot model knockout fixtures such as:

- Winner Group A
- Runner-up Group C
- 3rd Group D/E/F/I/J
- Winner Match 89
- Loser Match 101

This migration introduces `MatchParticipant`.

## Participant types

```ts
slot
groupPlacement
thirdPlaceQualifier
matchWinner
matchLoser
```

Group-stage matches should use `slot` participants with `countryId`.

Knockout matches should use bracket participants such as `groupPlacement`, `thirdPlaceQualifier`, `matchWinner`, and `matchLoser`.

## Compatibility

The next migration will convert `matches.ts` to use `homeParticipant` and `awayParticipant`.

After that, queries and indexes will derive concrete countries from `slot` participants only.
