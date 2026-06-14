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

## Provider fixture extraction

Use a reduced, secret-free working extract when comparing provider fixtures to internal matches.
Do not commit the full API-FOOTBALL response body. If a temporary file is needed, keep it outside the
repository or delete it after the mapping review.

Useful provider columns:

- `providerFixtureId`: `fixture.id`
- `fixtureDate`: `fixture.date`
- `statusShort`: `fixture.status.short`
- `homeTeamId`: `teams.home.id`
- `homeTeamName`: `teams.home.name`
- `awayTeamId`: `teams.away.id`
- `awayTeamName`: `teams.away.name`
- `venueName`: `fixture.venue.name`

For a local provider response file that is safe to inspect, this extracts only the useful mapping
columns:

```bash
jq -r '.response[] | [.fixture.id, .fixture.date, .fixture.status.short, .teams.home.id, .teams.home.name, .teams.away.id, .teams.away.name, .fixture.venue.name] | @tsv' /tmp/api-football-fixtures.json
```

Compare each provider row against `src/data/matches.ts` using:

- internal match number and `match-001` through `match-104` id
- date
- kickoff time
- venue
- `homeParticipant`
- `awayParticipant`

If date, kickoff, venue, or participants are uncertain, leave the row unmapped. A missing score is
safer than a score attached to the wrong internal match.

If a reduced fixture artifact is needed for review, prefer a hand-curated JSONL or TSV containing
only the columns above plus the proposed internal `matchId`. Confirm API-FOOTBALL license and
redistribution terms before committing even reduced provider-derived data.

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

Do not use strict mode as a release gate until all 104 matches have confirmed provider fixture ids.

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
