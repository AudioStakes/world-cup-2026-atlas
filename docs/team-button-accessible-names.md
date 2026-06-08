# Team button accessible names

Team rows render production metadata visually:

```txt
Japan
JPN · AFC
```

The button accessible name remains intentionally stable and short:

```txt
Select Japan
```

Rationale:

- existing tests and e2e selectors remain stable
- screen-reader button names stay concise
- production metadata is still visible in the row text
- metadata remains available through the button `title`
