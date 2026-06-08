# Repeated venue visits in country route summaries

A country can play multiple matches at the same venue.

Japan is the current example:

```txt
Match 11: Dallas
Match 36: Monterrey
Match 57: Dallas
```

That means the map should highlight two unique venue pins, not three.

To avoid making this look like missing data, the country route summary now shows both counts:

```txt
3 matches · 2 venues
```

The total travel distance still counts the itinerary legs:

```txt
Dallas -> Monterrey -> Dallas
```
