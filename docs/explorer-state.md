# Explorer state, URL, and transitions

The explorer state is intentionally small for the MVP. It represents one selected country,
group, date, and venue at a time.

```ts
type ExplorerViewState = {
  selectedCountryId: CountryId | null;
  selectedGroupCode: GroupCode | null;
  selectedDate: LocalDateString | null;
  selectedVenueId: VenueId | null;
};
```

## Initial state

Initial state resolution follows this order:

1. If the URL contains any explorer query parameter, parse and normalize the URL.
2. If the URL has no explorer parameters, select the country assigned to slot `A1`.
3. If `A1` has no country assignment, fall back to `Group A`.

This keeps the default experience tournament-oriented while still making shared URLs fully
reproducible.

## URL parameters

Supported MVP parameters:

- `country`
- `group`
- `date`
- `venue`

Examples:

```txt
/?country=jpn
/?group=F
/?date=2026-06-11
/?venue=seattle
/?country=jpn&date=2026-06-11
```

## State transitions

All selection events should go through `updateExplorerViewState`.

The function is pure and handles:

- selection
- re-click deselection
- clear all
- AND filtering
- automatic removal of conflicting existing selections

The newly selected value always wins. If adding it creates zero matching matches, existing
selections are removed one by one until matching fixtures are found or only the new selection
remains.

UI components should not reimplement this logic.
