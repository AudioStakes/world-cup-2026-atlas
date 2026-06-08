# Venue fixture guardrails

`src/data/venueFixtureCoverage.test.ts` fixes the venue-level schedule shape after all 104 matches were imported.

It verifies:

- all 16 venues have at least one match
- total match count per venue
- knockout match count per venue
- host-country total match counts
- semi-final, third-place, and final venue assignments
- venue match lists remain sorted by match number
- venues with knockout matches remain explicit

Expected total match counts:

```txt
Atlanta: 8
Boston: 7
Dallas: 9
Guadalajara: 4
Houston: 7
Kansas City: 6
Los Angeles: 8
Mexico City: 5
Miami: 7
Monterrey: 4
New York / New Jersey: 8
Philadelphia: 6
San Francisco Bay Area: 6
Seattle: 6
Toronto: 6
Vancouver: 7
```

Expected knockout match counts:

```txt
Atlanta: 3
Boston: 2
Dallas: 4
Houston: 2
Kansas City: 2
Los Angeles: 3
Mexico City: 2
Miami: 3
Monterrey: 1
New York / New Jersey: 3
Philadelphia: 1
San Francisco Bay Area: 1
Seattle: 2
Toronto: 1
Vancouver: 2
```

Host-country totals:

```txt
Canada: 13
Mexico: 13
United States: 78
```
