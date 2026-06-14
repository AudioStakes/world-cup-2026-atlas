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

If the current time is outside every match's kickoff-through-four-hour polling window, cron execution
does not call API-FOOTBALL. During the pre-tournament period, this is the expected behavior unless a
manual poll is run with a timestamp inside an active match window.

## Public fallback behavior

`/api/results` reads snapshots in this order:

1. `match-results/latest.json`
2. `match-results/last-known-good.json`
3. the bundled manual fallback snapshot from `src/matchResults/fallbackSnapshot.ts`

The bundled fallback has `provider: "manual"`, `matches: []`, and `isFallback: true`. A public
response changes to `provider: "api-football"` only after `refreshResultsSnapshot()` writes a valid
API-FOOTBALL snapshot to `match-results/latest.json` or `match-results/last-known-good.json`.

An empty fixture mapping does not prevent provider calls. It does mean provider fixtures cannot be
attached to internal matches, so a successful provider call can still write an API-FOOTBALL snapshot
with `matches: []`. Use the diagnostics workflow to distinguish this from a provider call failure.

## KV Keys

- `match-results/latest.json`: latest validated snapshot
- `match-results/last-known-good.json`: fallback snapshot from the last successful provider update
- `match-results/last-fetched-at`: provider polling interval guard
- `match-results/request-count/YYYY-MM-DD`: daily request budget guard
- `match-results/provider-error/latest.json`: latest provider error diagnostics

## Provider diagnostics

When provider polling fails, the Worker writes `match-results/provider-error/latest.json` with the
failure timestamp and message. Failed provider calls after at least one attempted request also update
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

## Manual diagnostics and provider polling

Use the GitHub Actions workflow:

```txt
.github/workflows/diagnose-live-results.yml
```

The default `workflow_dispatch` path is diagnostics-only. It installs dependencies, runs focused
typechecks and Worker tests, verifies the Worker deployment exists, checks the three result-related
KV keys, and summarizes `/api/results` with only:

- `provider`
- `fetchedAt`
- `matches.length`
- `isFallback`
- provider error `at` and `message`

It does not display secret values or full provider responses.

The workflow input `run_provider_poll` defaults to `false`. Set it to `true` only when you intend to
consume API-FOOTBALL request count and write remote `RESULTS_KV`. The optional `now` input accepts an
ISO timestamp for the polling decision, which makes it possible to test an active match window before
or after natural cron timing. The poll path calls `refreshResultsSnapshot()` directly through
`scripts/poll-live-results.mjs`; it does not add a production debug endpoint.

Diagnostics-only runs need Cloudflare repository secrets for Wrangler access. Provider poll runs also
need `API_FOOTBALL_KEY` available as a GitHub repository secret because the provider request runs from
GitHub Actions, not from the deployed Worker.

Local script entry points:

```bash
pnpm diagnose:live-results
pnpm poll:live-results -- --now 2026-06-11T19:00:00.000Z
pnpm poll:live-results -- --remote-kv --allow-provider-request --now 2026-06-11T19:00:00.000Z
pnpm poll:live-results -- --remote-kv --allow-provider-request --write-kv --now 2026-06-11T19:00:00.000Z
```

`poll:live-results` computes the polling decision by default. It makes no provider request unless
`--allow-provider-request` is present, and it writes no remote KV unless `--write-kv` is also present.

## Deployment Notes

Set `API_FOOTBALL_KEY` as a Cloudflare Worker secret. Do not expose it through Vite env vars,
frontend config, static JSON, or `src/data`.

`wrangler.toml` contains placeholder KV namespace ids. Replace them with production and preview
namespace ids before deploying the Worker.

Populate `workers/results/src/apiFootballFixtureMap.ts` with API-FOOTBALL fixture ids after the
provider schedule is confirmed. Unknown provider fixture ids are ignored instead of being exposed to
the frontend.
