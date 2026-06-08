# Group slot alignment

This migration aligns the visible group table with the currently reported 2026 World Cup group composition.

## Updated groups

```txt
Group A: Mexico, South Africa, Korea Republic, Czechia
Group B: Canada, Bosnia and Herzegovina, Qatar, Switzerland
Group C: Brazil, Morocco, Haiti, Scotland
Group D: United States, Paraguay, Australia, Türkiye
Group E: Germany, Curaçao, Côte d’Ivoire, Ecuador
Group F: Netherlands, Japan, Sweden, Tunisia
Group G: Belgium, Egypt, Iran, New Zealand
Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
Group I: France, Senegal, Iraq, Norway
Group J: Argentina, Algeria, Austria, Jordan
Group K: Portugal, Congo DR, Uzbekistan, Colombia
Group L: England, Croatia, Ghana, Panama
```

## Scope

This migration updates:

- `src/data/countries.ts`
- `src/data/slotEntries.ts`

It does not add full match fixtures for every group. At this checkpoint, Group A and Group F are still the only groups with complete six-match fixture subsets.

## Data status

The records remain `provisional`.

They should only be changed to `official` after the exact group composition and draw positions have been checked against an official FIFA source captured in `src/data/dataSources.ts`.

## Removed provisional teams

The old provisional group table included several demo teams that are no longer assigned to a slot:

- Denmark
- Italy
- Honduras
- Costa Rica
- Serbia
- Jamaica
- Poland
- China PR

These were removed from `countries.ts` so the country list represents the 48 visible tournament slots.
