# Production-aligned Group A / Group F migration

This migration replaces the most obviously wrong provisional values in Groups A and F.

## Corrected group slots

Group A now uses:

- A1 Mexico
- A2 South Africa
- A3 Korea Republic
- A4 Czechia

Group F now uses:

- F1 Netherlands
- F2 Japan
- F3 Sweden
- F4 Tunisia

These are still marked `provisional` in code until the exact app data is checked directly against the official FIFA pages or structured schedule source.

## Corrected fixture subset

The app now includes the full Group A and Group F group-stage fixture subset.

Group A fixture subset:

- Match 1: Mexico vs South Africa, June 11, Mexico City
- Match 2: Korea Republic vs Czechia, June 11, Guadalajara
- Match 25: Czechia vs South Africa, June 18, Atlanta
- Match 28: Mexico vs Korea Republic, June 18, Guadalajara
- Match 53: Czechia vs Mexico, June 24, Mexico City
- Match 54: South Africa vs Korea Republic, June 24, Monterrey

Group F fixture subset:

- Match 11: Netherlands vs Japan, June 14, Dallas
- Match 12: Sweden vs Tunisia, June 14, Monterrey
- Match 35: Netherlands vs Sweden, June 20, Houston
- Match 36: Tunisia vs Japan, June 20, Monterrey
- Match 57: Japan vs Sweden, June 25, Dallas
- Match 58: Tunisia vs Netherlands, June 25, Kansas City

## Why only Groups A and F?

Group A includes the default A1 initial state. Group F includes Japan, the main country used in the design review and route exploration flows.

The next production-data migration should continue group-by-group, rather than mixing partially verified data across the whole tournament.
