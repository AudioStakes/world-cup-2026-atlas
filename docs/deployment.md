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
ready. Live results require populated API-FOOTBALL fixture mappings.

## CORS and allowed origins

`ALLOWED_ORIGINS` only affects browser requests from a different origin. When the Worker serves both
the app and `/api/results` from `https://world-cup-2026-atlas.audiostakes.workers.dev`, the browser
request is same-origin and does not need a CORS allow-list entry for the workers.dev URL.

Add a production origin to `ALLOWED_ORIGINS` only when a separate frontend origin, such as GitHub
Pages or a custom static host, needs to fetch `https://world-cup-2026-atlas.audiostakes.workers.dev/api/results`.
Adding more origins makes the public results endpoint readable from those sites, which is usually
acceptable for public match data but should still be kept intentional and minimal.

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
