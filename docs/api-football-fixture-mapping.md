# API-FOOTBALL Fixture Mapping

## Purpose

API-FOOTBALL fixture mapping connects provider fixture ids to the internal `matchId` values used by
World Cup 2026 Atlas. The Worker can fetch provider fixtures before this mapping is populated, but
live results are not shown in the UI until a provider fixture can be attached to an internal match.

## Why the mapping is required

API-FOOTBALL returns provider-local ids in `fixture.id`. The frontend never reads those provider
responses directly; it reads normalized `MatchResultsSnapshot` rows keyed by internal `matchId`.

`workers/results/src/apiFootball.ts` intentionally ignores provider fixtures when
`fixture.id` is not present in `fixtureIdToMatchId`. This is safer than guessing, because displaying
no score is better than displaying a score on the wrong internal match.

## Mapping inputs

Use these inputs together:

- API-FOOTBALL fixture rows from the 2026 World Cup league and season.
- Internal matches in `src/data/matches.ts`.
- Internal match ids in the `match-001` through `match-104` format.
- Schedule evidence for date, kickoff, venue, home participant, and away participant.

Do not store API keys, Cloudflare tokens, or provider credential material in docs, fixture mapping
files, issue comments, PR bodies, or logs.

## Mapping workflow

1. Fetch or inspect API-FOOTBALL fixtures using an environment that already has access to the
   provider key. Do not print or copy the key.
2. For each provider fixture, match by date, kickoff, venue, home participant, and away participant.
3. Add confirmed mappings to `workers/results/src/apiFootballFixtureMap.ts` with
   `createApiFootballFixtureMapping(providerFixtureId, "match-001")`.
4. Leave uncertain fixtures unmapped until the provider id and internal match are confirmed.
5. Run the mapping checks and relevant Worker tests before opening or updating a PR.

## Fixture ids not yet confirmed

An empty mapping is allowed while fixture ids are not confirmed. In that state, the provider poll can
still run and store provider diagnostics, but provider fixtures are ignored and live scores do not
surface in the UI.

Do not add placeholder provider fixture ids. Do not map by match number alone when date, venue, or
participants disagree.

## Validation commands

Run the non-strict check during normal development:

```bash
pnpm check:fixture-mapping
```

Run strict mode when preparing to enable live results for production:

```bash
pnpm check:fixture-mapping -- --strict
```

Strict mode currently requires mappings for all 104 internal matches. The normal `pnpm verify` path
runs the non-strict check, so duplicate provider fixture ids, duplicate internal `matchId` values,
and unknown internal matches fail without requiring the mapping to be complete yet.

Useful related checks:

```bash
pnpm test workers/results/src/apiFootball.test.ts
pnpm verify
```

## Safety notes

- Unknown provider fixture ids are ignored by design.
- Duplicate provider fixture ids are invalid.
- Duplicate internal `matchId` values are invalid.
- A mapping to a `matchId` not present in `src/data/matches.ts` is invalid.
- If provider fixture evidence is ambiguous, leave the fixture unmapped and document the uncertainty.
