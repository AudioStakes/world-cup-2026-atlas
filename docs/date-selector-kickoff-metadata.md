# Date selector kickoff metadata

The date selector exposes fixture metadata per active date:

- match count label
- kickoff range label

The visible chip stays compact and renders the day number plus match count:

```txt
14
4
```

The accessible name includes the fuller metadata:

```txt
Select Sun Jun 14, 4 matches, kickoffs 12:00–20:00
```

Rest dates remain visible in the calendar range, render `Rest` in the chip, and include
`Rest day` in the accessible name.

This improves the date selector from a simple calendar into a fixture-density overview while
preserving a dense visible layout.
