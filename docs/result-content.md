# Result content conventions

Result card view models should provide text-only content for text fields.

- `MatchListItemViewModel.venueLabel` is the venue name only.
- The ResultCard component owns decorative UI icons such as the venue pin.
- Country result match copy is written from the selected country's perspective: `vs {opponent}`.
- Components should not need to know how to derive opponents or venue names from raw data.
