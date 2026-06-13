# Team button accessible names

Team rows render compact production metadata visually:

```txt
🇯🇵 JPN
```

The button accessible name remains intentionally stable and short:

```txt
Select Japan
```

Rationale:

- existing tests and e2e selectors remain stable
- screen-reader button names stay concise
- FIFA codes remain visible in the row text
- full country names remain available through the button `title`
