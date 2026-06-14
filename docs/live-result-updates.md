# Live Result Updates

Match results are updated through a provider-neutral snapshot served by a Cloudflare Worker.

## Public Contract

The browser fetches:

```txt
GET /api/results
```

The response is a `MatchResultsSnapshot`:

- `schemaVersion`
- `provider`
- `fetchedAt`
- `matches[]`

Each match result includes the internal match id, normalized internal status, API-FOOTBALL short
status, optional elapsed minute, nullable scores, provider fixture id, kickoff time, and update time.
UI components must not read API-FOOTBALL responses directly.

## Frontend Boundary

`src/app/App.tsx` fetches the snapshot as non-blocking enhancement data. If the request fails or the
payload is invalid, the app keeps using static build data.

`queryExplorer()` is still the only UI-facing ViewModel entry point. It merges the snapshot into
static app data before creating result cards, standings, routes, and map ViewModels.

## Worker Polling

The scheduled Worker runs often enough to notice active matches, but provider calls are guarded by:

- `PROVIDER_POLL_INTERVAL_MS`: 20 minutes
- `MATCH_POLLING_WINDOW_MS`: kickoff through kickoff plus four hours
- `DAILY_REQUEST_SOFT_LIMIT`: 90 requests
- `DAILY_REQUEST_HARD_LIMIT`: 98 requests

The Worker computes active match windows from static schedule data and venue time zones. Date-level
API-FOOTBALL calls use UTC dates because the request sends `timezone=UTC`.

Failed provider calls still update `last-fetched-at` and the daily request count for each attempted
date-level request. This prevents a provider outage from bypassing the 20-minute interval guard or
the daily request budget.

## KV Keys

- `match-results/latest.json`: latest validated snapshot
- `match-results/last-known-good.json`: fallback snapshot from the last successful provider update
- `match-results/last-fetched-at`: provider polling interval guard
- `match-results/request-count/YYYY-MM-DD`: daily request budget guard
- `match-results/provider-error/latest.json`: latest provider error diagnostics

## Provider diagnostics

When provider polling fails after at least one attempted provider request, the Worker writes
`match-results/provider-error/latest.json`. Failed provider calls also update
`match-results/last-fetched-at` and increment `match-results/request-count/YYYY-MM-DD` for the
attempted date-level requests, so outages do not bypass the polling interval or request budget.

Inspect the latest provider error through the Cloudflare dashboard, or with Wrangler:

```bash
pnpm wrangler kv key get "match-results/provider-error/latest.json" --binding RESULTS_KV --remote --text --config wrangler.toml
```

Inspect the polling guard and request count with:

```bash
pnpm wrangler kv key get "match-results/last-fetched-at" --binding RESULTS_KV --remote --text --config wrangler.toml
pnpm wrangler kv key get "match-results/request-count/YYYY-MM-DD" --binding RESULTS_KV --remote --text --config wrangler.toml
```

Do not paste secret values into diagnostics. Provider error diagnostics should contain only the
timestamp and failure message.

## Deployment Notes

Set `API_FOOTBALL_KEY` as a Cloudflare Worker secret. Do not expose it through Vite env vars,
frontend config, static JSON, or `src/data`.

`wrangler.toml` contains placeholder KV namespace ids. Replace them with production and preview
namespace ids before deploying the Worker.

Populate `workers/results/src/apiFootballFixtureMap.ts` with API-FOOTBALL fixture ids after the
provider schedule is confirmed. Unknown provider fixture ids are ignored instead of being exposed to
the frontend.
