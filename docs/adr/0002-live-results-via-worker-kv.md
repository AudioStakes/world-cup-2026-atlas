# ADR 0002: Live Results via Cloudflare Worker and KV

Date: 2026-06-13

Status: Accepted

## Context

The app is a static Preact explorer, but match results are mutable during the tournament. The browser
must not call API-FOOTBALL directly because the provider key is secret and the free daily request
budget is small.

The UI already depends on `queryExplorer()` as the single ViewModel entry point. Runtime results must
preserve that boundary instead of letting components fetch provider data or understand provider
schemas.

## Decision

Use a Cloudflare Worker in front of API-FOOTBALL.

- The Worker owns the `API_FOOTBALL_KEY` secret.
- The browser calls only `GET /api/results`.
- `GET /api/results` returns the latest normalized snapshot from KV, never a raw API-FOOTBALL
  response.
- A scheduled Worker polls API-FOOTBALL by fixture date only during active match windows.
- `queryExplorer()` receives the latest normalized snapshot and merges it into the static tournament
  data before building ViewModels.

Polling constants are intentionally explicit:

```ts
DAILY_REQUEST_SOFT_LIMIT = 90;
DAILY_REQUEST_HARD_LIMIT = 98;
PROVIDER_POLL_INTERVAL_MS = 20 * 60 * 1000;
MATCH_POLLING_WINDOW_MS = 4 * 60 * 60 * 1000;
```

The cron may run every five minutes, but the provider call guard allows polling only after the
20-minute interval has elapsed. With three active date-level windows in a day, the expected provider
traffic stays around 72 requests per day, below the free-plan limit.

## Data Shape

The Worker normalizes each provider row into `MatchResultsSnapshot`.

- Internal `MatchStatus` drives UI behavior and standings.
- API-FOOTBALL `fixture.status.short` is stored separately as `shortStatus` so the UI can show labels
  such as `FT`, `1H`, or `HT` without depending on provider status logic.
- Finished results can update standings only when both scores are present.
- Live scores may be displayed, but they do not affect standings.

## Failure Policy

Provider failures must not destroy the last good public state.

Read path:

1. latest KV snapshot
2. last-known-good KV snapshot
3. build-time empty fallback snapshot

Write path:

- validate and normalize provider data before writing latest snapshot
- write latest and last-known-good together after successful normalization
- count attempted provider requests and update the provider polling interval guard even when the
  provider request fails
- store provider errors separately for diagnostics

## Consequences

The frontend remains static and provider-neutral. A production deployment needs Cloudflare Worker,
KV, and `API_FOOTBALL_KEY` configuration in addition to the Vite build.

API-FOOTBALL fixture IDs are not part of static tournament data yet. The Worker keeps the provider
fixture mapping isolated in `workers/results/src/apiFootballFixtureMap.ts` so it can be populated or
generated without changing UI code.
