# Data integrity guardrails

`src/data/dataIntegrity.test.ts` protects the tournament dataset while production data is migrated.

It checks:

- unique country IDs
- unique FIFA country codes
- unique group codes
- unique slot IDs
- unique venue IDs
- unique match IDs
- unique match numbers
- 12 groups
- 48 slot entries
- 16 venues
- four ordered slots per group
- group slot declarations match slot entries
- slot entries reference known groups and countries
- matches reference known slots, groups, venues, and countries
- assigned match countries match the countries assigned to their slots
- venue latitude / longitude values are plausible

This is intentionally not a source-of-truth test. It does not prove that the dataset is official.

It only proves that the app data is internally consistent enough to query and render.
