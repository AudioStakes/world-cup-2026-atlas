# Date selector kickoff metadata

The date selector now exposes and renders fixture metadata per active date:

- match count label
- kickoff range label

Examples:

```txt
4 matches
12:00–20:00
```

For one-match dates, the display uses:

```txt
1 match
15:00
```

Rest dates remain visible in the calendar range but do not show match metadata.

This improves the date selector from a simple calendar into a fixture-density overview while preserving the existing date filtering behavior.
