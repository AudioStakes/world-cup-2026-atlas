# Source note coverage

This migration adds source notes to group composition data.

Updated data:

- `countries.ts`
- `slotEntries.ts`

Both now use:

```txt
sourceNote: "fifa-world-cup-26-groups"
```

The data remains:

```txt
dataStatus: "provisional"
```

because the current repository has not yet captured exact official FIFA structured source URLs for every team and draw position.

## Source note format

A `sourceNote` may be either:

```txt
data-source-id
```

or:

```txt
data-source-id: optional detail
```

The guardrail validates the part before `:` against `dataSources.ts`.

This preserves existing venue notes such as:

```txt
venue-stadium-official-pages: host city, stadium name, and coordinate seed data
```

while still ensuring the source id is registered.

## Guardrails

`dataStatus.test.ts` checks:

- every visible record has a `sourceNote`
- every `sourceNote` points to an existing `dataSources.ts` id

This means the visible app dataset is traceable at the source-note level:

- countries
- slot entries
- venues
- matches
