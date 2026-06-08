# Venue time zone data

Venues now include production time-zone metadata:

```ts
timeZone: {
  ianaName: "America/New_York",
  abbreviation: "ET",
}
```

The result card now displays local kickoff time with the venue's time-zone bucket:

```txt
15:00 ET
12:00 PT
```

## Display policy

The app uses broad North American display buckets:

- PT
- CT
- ET

This is intentionally more compact than `PDT/CDT/EDT` and fits the explorer UI better.

The `ianaName` is still stored so a future enhancement can compute date-accurate offsets or user-local conversions.
