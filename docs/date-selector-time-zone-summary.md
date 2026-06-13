# Date selector time-zone summary

Date chips expose a time-zone summary in addition to match count and kickoff range.

The visible chip remains compact:

```txt
14
4
```

The accessible name includes the fuller time-zone metadata:

```txt
Select Sun Jun 14, 4 matches, kickoffs 12:00–20:00, time zones CT/ET
```

Rest dates continue to show no match metadata.

The time-zone summary is computed from the venues scheduled on that date, using the venue `timeZone.abbreviation` values.
