# Deployment

World Cup 2026 Atlas can be deployed in two modes:

- GitHub Pages publishes a static-only release.
- Cloudflare Worker publishes the primary live-results release with static assets, `/api/results`,
  `RESULTS_KV`, and API-FOOTBALL polling.

Live match result updates require the Cloudflare Worker described in
[Live Result Updates](live-result-updates.md).

## GitHub Pages workflow

The workflow is defined in:

```txt
.github/workflows/deploy-pages.yml
```

It runs on:

- manual `workflow_dispatch`

Workflow steps:

1. install dependencies with pnpm
2. run `pnpm verify`
3. build the app with `GITHUB_PAGES=true`
4. upload `dist`
5. deploy to GitHub Pages

GitHub Pages is a static-only fallback. It does not serve `/api/results` and does not use
API-FOOTBALL live results.

## Vite base path

GitHub Pages project sites are served under the repository name:

```txt
/world-cup-2026-atlas/
```

For that reason, `vite.config.ts` uses:

```ts
base: process.env.GITHUB_PAGES === "true" ? "/world-cup-2026-atlas/" : "/"
```

Local development remains rooted at `/`.

## Repository settings

In GitHub repository settings:

1. Open `Settings`
2. Open `Pages`
3. Set `Build and deployment` source to `GitHub Actions`

## Local check

```bash
pnpm verify
pnpm build
pnpm preview
```

The local preview uses `/` as the base path unless `GITHUB_PAGES=true` is set.

## Cloudflare Worker for live results

`wrangler.toml` configures the Worker that serves the app and `/api/results`. This is the intended
production release path when live results should be available.

The Worker requires:

- a production `RESULTS_KV` namespace id in `wrangler.toml`
- a preview `RESULTS_KV` namespace id in `wrangler.toml`
- `API_FOOTBALL_KEY` registered as a Cloudflare Worker secret
- `CLOUDFLARE_API_TOKEN` registered as a GitHub repository secret
- `CLOUDFLARE_ACCOUNT_ID` registered as a GitHub repository secret

Do not write `API_FOOTBALL_KEY` or Cloudflare API token values in `wrangler.toml`, docs, comments,
or workflow logs. The workflow only reads GitHub Secrets and the Worker only reads the Cloudflare
Worker secret.

Before production release, also confirm `ALLOWED_ORIGINS` for the production hostname and populate
API-FOOTBALL fixture mappings after provider fixture ids are confirmed.

The Worker cron is configured to run every five minutes. Provider calls are still guarded in code by
the 20-minute interval, match polling window, and daily request budget.

## Cloudflare Worker deploy workflow

The workflow is defined in:

```txt
.github/workflows/deploy-cloudflare-worker.yml
```

It runs on manual `workflow_dispatch` and deploys only when the selected ref is `main`. The workflow:

1. installs dependencies with `pnpm install --frozen-lockfile`
2. runs `pnpm verify`
3. deploys with `pnpm wrangler deploy --config wrangler.toml`
4. smoke-checks `/api/results` when the Worker URL can be read from Wrangler output

Run it from GitHub Actions by selecting `Deploy Cloudflare Worker`, choosing the `main` branch, and
starting the workflow. The workflow uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from
GitHub repository secrets.

Cloudflare may briefly return 404 for `/api/results` immediately after deploy while the Worker
update propagates. The workflow accounts for this with a retrying smoke check: six attempts, ten
seconds apart, logging the attempt number, target URL, and HTTP status. A successful smoke check
requires HTTP 200 and a JSON object with a `matches` array. If all attempts fail, the workflow prints
the last status, response headers, and the first few KB of the response body for diagnosis.

After the workflow succeeds, confirm these production URLs:

- `https://world-cup-2026-atlas.audiostakes.workers.dev/`
- `https://world-cup-2026-atlas.audiostakes.workers.dev/api/results`

`/api/results` returns a JSON snapshot with a `matches` array. Before the tournament starts, or while
fixture mappings are not configured, this response is allowed:

```json
{
  "schemaVersion": 1,
  "provider": "manual",
  "fetchedAt": "2026-06-11T00:00:00.000Z",
  "matches": [],
  "isFallback": true
}
```

This fallback state confirms the Worker endpoint is healthy, but it does not mean live results are
ready. Live results require a successful provider poll and populated API-FOOTBALL fixture mappings.
If the endpoint stays on the bundled fallback, inspect `match-results/latest.json`,
`match-results/last-known-good.json`, `match-results/poll-status/latest.json`, and
`match-results/provider-error/latest.json` in that order.

An API-FOOTBALL snapshot with `provider: "api-football"` and `matches: []` means provider polling
succeeded but no returned fixtures were mapped into internal matches. That is different from
`provider: "manual"` with `isFallback: true`, which means the public endpoint is healthy but live
results have not been reflected from KV.

## Live results diagnostics workflow

The workflow is defined in:

```txt
.github/workflows/diagnose-live-results.yml
```

It runs on manual `workflow_dispatch` and only on `main`. The default run is diagnostics-only:

1. installs dependencies with `pnpm install --frozen-lockfile`
2. runs `pnpm typecheck`
3. runs focused Worker result tests
4. checks that a Worker deployment exists
5. checks whether these remote KV keys exist:
   - `match-results/latest.json`
   - `match-results/last-known-good.json`
   - `match-results/poll-status/latest.json`
   - `match-results/provider-error/latest.json`
6. fetches `/api/results`
7. writes a GitHub Actions summary with only provider, timestamp, match count, fallback status, and
   poll status/provider error fields

The workflow input `run_provider_poll` defaults to `false`. Set it to `true` only when you intend to
consume API-FOOTBALL request count and write remote `RESULTS_KV`. When enabled, the workflow runs
`pnpm poll:live-results` with explicit provider-request and KV-write flags, then diagnoses
`/api/results` again.

Before the real provider request, `pnpm poll:live-results` writes a non-sensitive KV preflight value
to `match-results/diagnostics/write-probe.json`. The Actions summary reports
`KV write preflight: passed` or `KV write preflight: failed`. A failed preflight stops before
API-FOOTBALL is called, so fix the KV write issue before running `run_provider_poll=true` again.

Diagnostics-only runs use `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from GitHub repository
secrets for Wrangler access. Provider poll runs also require `API_FOOTBALL_KEY` as a GitHub
repository secret because that optional request is made from GitHub Actions. The Cloudflare Worker
secret named `API_FOOTBALL_KEY` is used by deployed Worker cron polling; it is separate from GitHub
repository secrets and is not available to GitHub Actions.

The optional `now` input is an ISO timestamp used by the polling decision. Use a timestamp inside a
known match polling window when testing before natural cron timing would poll. Do not paste
`API_FOOTBALL_KEY`, `CLOUDFLARE_API_TOKEN`, or any other secret value into workflow inputs, logs,
issues, docs, or PR text.

If the workflow prints `Failed to write remote KV key ...`, check that the GitHub Secret
`CLOUDFLARE_API_TOKEN` is for the expected account and includes `Workers KV Storage: Edit`. Also
check `CLOUDFLARE_ACCOUNT_ID`, the `RESULTS_KV` binding, and the production namespace id in
`wrangler.toml`. Do not keep retrying provider polls while this failure is present; manual provider
polls are allowed to consume API-FOOTBALL request count only after KV writes are known to work.

Read `match-results/poll-status/latest.json` as the latest scheduled/manual poll trace:

- `checkedAt`, `result`, `decision.shouldPoll`, `decision.reason`, and `activeDates` explain the
  polling decision.
- `attemptedProviderRequests`, `requestCountBefore`, and `writtenMatches` show request-budget and
  current-invocation normalized match write effects.
- `latestSnapshotProvider` and `latestSnapshotFetchedAt` distinguish the bundled manual fallback
  from an empty API-FOOTBALL snapshot.
- `errorMessage` is sanitized and should never contain API keys, Cloudflare tokens, headers, or full
  provider response bodies.

## CORS and allowed origins

`ALLOWED_ORIGINS` only affects browser requests from a different origin. When the Worker serves both
the app and `/api/results` from `https://world-cup-2026-atlas.audiostakes.workers.dev`, the browser
request is same-origin and does not need a CORS allow-list entry for the workers.dev URL.

Add a production origin to `ALLOWED_ORIGINS` only when a separate frontend origin, such as GitHub
Pages or a custom static host, needs to fetch `https://world-cup-2026-atlas.audiostakes.workers.dev/api/results`.
Adding more origins makes the public results endpoint readable from those sites, which is usually
acceptable for public match data but should still be kept intentional and minimal.

The current release policy is that Cloudflare Worker deployment is the live-results release path.
GitHub Pages is static-only and should not call the Worker API. If that fallback policy changes,
add the GitHub Pages origin to `ALLOWED_ORIGINS`; do not add the workers.dev origin just for
same-origin Worker requests.

## Fixture mapping status

`workers/results/src/apiFootballFixtureMap.ts` maps API-FOOTBALL fixture ids to internal match ids.
If the mapping is empty, provider responses can be fetched and normalized, but unknown provider
fixture ids are ignored because they cannot be attached to an internal match. In that state, live
results do not appear in the UI.

API-FOOTBALL fixture ids are still a release task until the provider ids are confirmed and the
mapping is populated. Use [API-FOOTBALL Fixture Mapping](api-football-fixture-mapping.md) for the
mapping workflow and validation commands.

## Production release checklist

Use [Release Checklist](release-checklist.md) for the final human checks before release.
