# Venue source notes

The 16 host venue records currently remain `official`, but now each record carries a `sourceNote`.

The shared note is:

```txt
venue-stadium-official-pages: host city, stadium name, and coordinate seed data
```

This is intentionally still coarse-grained. It removes the immediate anti-pattern of `official` records without any source marker, while leaving room for a later source cleanup that can split the references into more precise records.

## Next improvement

A later migration should replace the shared note with more precise source notes, for example:

- FIFA venue page for venue / host city / stadium label
- stadium or trusted geocoding source for latitude / longitude

## Current status

- countries: `provisional`
- slot entries: `provisional`
- matches: `provisional`
- venues: `official` with `sourceNote`

This is now reflected in `src/data/dataStatus.test.ts`.
