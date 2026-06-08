# Clear default selection before isolated result rendering tests

This patch updates `src/app/App.test.tsx` so isolated Date and Venue result tests clear the default Japan selection first.

Why:

The app starts with Japan selected. Some dates and venues are compatible with Japan's schedule, so selecting them from the default state can create an AND filter instead of switching the Result card's primary target.

Examples:

```txt
country=jpn + date=2026-06-14
country=jpn + venue=dallas
```

For tests that specifically assert Date or Venue result headings, the correct setup is:

```txt
clear all
select date / venue
assert Date / Venue result metadata
```
