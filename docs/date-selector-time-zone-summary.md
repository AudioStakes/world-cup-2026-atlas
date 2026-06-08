# Date selector time-zone summary

Date chips now include a time-zone summary in addition to match count and kickoff range.

Example:

```txt
Jun 14
4 matches
12:00–20:00 · CT/ET
```

For one-match dates:

```txt
Jul 19
1 match
15:00 · ET
```

Rest dates continue to show no match metadata.

The time-zone summary is computed from the venues scheduled on that date, using the venue `timeZone.abbreviation` values.
