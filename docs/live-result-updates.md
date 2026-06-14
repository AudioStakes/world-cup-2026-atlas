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

Every `refreshResultsSnapshot()` invocation writes sanitized polling status to
`match-results/poll-status/latest.json`. This happens for successful provider polls, provider
errors, and policy skips such as `outside-window`, `interval-not-elapsed`, `soft-limit-reached`, and
`hard-limit-reached`.

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

Interpret the common empty states this way:

- `provider: "manual"` with `isFallback: true` means `/api/results` is healthy but live results have
  not been written to KV yet.
- `provider: "api-football"` with `matches: []` means an API-FOOTBALL poll wrote a valid snapshot,
  but fixture mapping may still be empty or the returned fixtures may be unmapped.
- A provider error is diagnosed through `match-results/provider-error/latest.json` and
  `match-results/poll-status/latest.json`, not from `matches: []` alone.

## KV Keys

- `match-results/latest.json`: latest validated snapshot
- `match-results/last-known-good.json`: fallback snapshot from the last successful provider update
- `match-results/last-fetched-at`: provider polling interval guard
- `match-results/request-count/YYYY-MM-DD`: daily request budget guard
- `match-results/poll-status/latest.json`: latest sanitized polling decision and outcome
- `match-results/provider-error/latest.json`: latest provider error diagnostics
- `match-results/diagnostics/write-probe.json`: non-sensitive remote KV write preflight result

## Provider diagnostics

When `/api/results` remains on the bundled fallback, check production in this order:

1. `/api/results`
2. `match-results/latest.json`
3. `match-results/last-known-good.json`
4. `match-results/poll-status/latest.json`
5. `match-results/provider-error/latest.json`

When provider polling fails, the Worker writes `match-results/provider-error/latest.json` with the
failure timestamp and message. Failed provider calls after at least one attempted request also update
`match-results/last-fetched-at` and increment `match-results/request-count/YYYY-MM-DD` for the
attempted date-level requests, so outages do not bypass the polling interval or request budget.

`match-results/poll-status/latest.json` explains the latest scheduled or manual poll without
storing secrets, request headers, authorization headers, or provider response bodies. Read these
fields first:

- `checkedAt`: when the poll decision was evaluated
- `result`: `skipped`, `success`, or `provider-error`
- `decision.shouldPoll`, `decision.reason`, and `decision.activeDates`: why polling did or did not
  proceed
- `attemptedProviderRequests`: date-level provider calls made by this invocation
- `writtenMatches`: provider matches normalized and written by this invocation
- `requestCountBefore`: daily request count before the invocation
- `latestSnapshotProvider` and `latestSnapshotFetchedAt`: snapshot visible after the invocation
- `errorMessage`: sanitized provider error message, or `null`

Inspect the latest provider error through the Cloudflare dashboard, or with Wrangler:

```bash
pnpm wrangler kv key get "match-results/provider-error/latest.json" --binding RESULTS_KV --remote --preview false --text --config wrangler.toml
pnpm wrangler kv key get "match-results/poll-status/latest.json" --binding RESULTS_KV --remote --preview false --text --config wrangler.toml
```

Inspect the polling guard and request count with:

```bash
pnpm wrangler kv key get "match-results/last-fetched-at" --binding RESULTS_KV --remote --preview false --text --config wrangler.toml
pnpm wrangler kv key get "match-results/request-count/YYYY-MM-DD" --binding RESULTS_KV --remote --preview false --text --config wrangler.toml
```

Because `wrangler.toml` has both a production `id` and `preview_id` for `RESULTS_KV`, production
remote KV reads and writes must include `--preview false`. Use `--preview` intentionally only when
inspecting or writing the preview namespace.

Do not paste secret values into diagnostics. Provider error diagnostics should contain only the
timestamp and failure message.

If a manual poll prints `Failed to write remote KV key ...`, treat it as a remote KV write access or
configuration failure. Check that the GitHub repository secret `CLOUDFLARE_API_TOKEN` is present,
belongs to the expected Cloudflare account, and has `Workers KV Storage: Edit`. Also confirm
`CLOUDFLARE_ACCOUNT_ID`, the `RESULTS_KV` binding, and the production namespace id in
`wrangler.toml`. Do not paste API keys, Cloudflare tokens, headers, or full provider responses into
issues, docs, PRs, comments, or logs.

If Wrangler reports `RESULTS_KV has both a namespace ID and a preview ID`, add `--preview false` for
production KV commands. The manual poll preflight detects this before API-FOOTBALL is called, so a
preflight failure should not consume provider request count.

## Manual diagnostics and provider polling

Use the GitHub Actions workflow:

```txt
.github/workflows/diagnose-live-results.yml
```

The default `workflow_dispatch` path is diagnostics-only. It installs dependencies, runs focused
typechecks and Worker tests, verifies the Worker deployment exists, checks the result-related KV
keys, and summarizes `/api/results` with only:

- `provider`
- `fetchedAt`
- `matches.length`
- `isFallback`
- poll status `checkedAt`, `result`, `decision.shouldPoll`, `decision.reason`, `activeDates`,
  `attemptedProviderRequests`, `writtenMatches`, `requestCountBefore`, `latestSnapshotProvider`,
  `latestSnapshotFetchedAt`, and `errorMessage`
- provider error `at` and `message`

It does not display secret values or full provider responses.

The workflow input `run_provider_poll` defaults to `false`. Set it to `true` only when you intend to
consume API-FOOTBALL request count and write remote `RESULTS_KV`. The optional `now` input accepts an
ISO timestamp for the polling decision, which makes it possible to test an active match window before
or after natural cron timing. The poll path calls `refreshResultsSnapshot()` directly through
`scripts/poll-live-results.mjs`; it does not add a production debug endpoint.

Before a `--write-kv` real run can call API-FOOTBALL, `scripts/poll-live-results.mjs` writes a small
non-sensitive preflight value to `match-results/diagnostics/write-probe.json`. The GitHub Actions
summary reports `KV write preflight: passed` or `KV write preflight: failed`. If the preflight fails,
the script stops before any provider request is made. The write probe is a diagnostic key and may be
left in KV.

Diagnostics-only runs need Cloudflare repository secrets for Wrangler access. Provider poll runs also
need `API_FOOTBALL_KEY` available as a GitHub repository secret because the provider request runs from
GitHub Actions, not from the deployed Worker. A Cloudflare Worker secret named `API_FOOTBALL_KEY`
allows deployed Worker cron polling, but it is not readable by GitHub Actions. Manual provider poll
workflow runs need a separate GitHub repository secret with the same name. If that GitHub repository
secret is missing, the manual provider poll workflow cannot run.

Never write secret values in docs, PRs, comments, workflow inputs, or logs. If KV writes are failing,
do not repeat `run_provider_poll=true`; fix the Cloudflare token/account/binding issue first so
API-FOOTBALL request count is not consumed by retries that cannot write results.

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
