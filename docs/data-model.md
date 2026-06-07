# Data model foundation

This project treats tournament data as production-shaped data from the start, even while some records may still be provisional.

## Principles

- Keep UI code away from raw data structures.
- Treat `Match` as the center of most queries.
- Store stable entities directly: countries, groups, slots, venues, and matches.
- Derive routes, highlighted venues, summaries, rankings, and result cards from matches and indexes.
- Use `dataStatus` on records whose values may need verification or replacement.

## Data status

```ts
type DataStatus = "official" | "provisional" | "placeholder";
```

Use the statuses as follows:

- `official`: stable host venues or records verified against the chosen production source.
- `provisional`: production-shaped records that should be replaced or verified before public release.
- `placeholder`: records intentionally used as temporary stand-ins.

Do not name production-shaped data `demo`. If data is not final, keep the production schema and mark the affected records with `dataStatus`.

## Groups and slots

Groups are modeled through slots such as `A1`, `A2`, `F2`, and so on.

This supports the initial-state rule:

1. URL parameters are used first.
2. If no URL parameters exist, resolve slot `A1`.
3. If `A1` has a country assignment, select that country.
4. If `A1` is unassigned, fall back to Group A.

## Matches

Matches reference both slots and countries when countries are known.

- Slot references support bracket and draw logic.
- Country references make current query and display logic straightforward.
- Future knockout data can continue using slot-like placeholders until resolved.

## Indexes

`createIndexes` builds lookup maps at startup. Query functions should receive `AppData` and `Indexes` rather than re-building maps inside UI components.
