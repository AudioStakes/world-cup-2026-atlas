# Release Checklist

Use this immediately before promoting the Cloudflare Worker release.

- [ ] GitHub Actions CI is passing
- [ ] `Deploy Cloudflare Worker` workflow succeeded
- [ ] Cloudflare Worker deployment succeeded
- [ ] `Diagnose Live Results` workflow succeeded on `main`
- [ ] `https://world-cup-2026-atlas.audiostakes.workers.dev/` displays the app
- [ ] `https://world-cup-2026-atlas.audiostakes.workers.dev/api/results` returns HTTP 200
- [ ] `/api/results` returns JSON with a `matches` array
- [ ] `/api/results` `provider`, `isFallback`, and `matches.length` were checked in diagnostics
- [ ] Remote KV was checked in order: `match-results/latest.json`, `match-results/last-known-good.json`, `match-results/poll-status/latest.json`, then `match-results/provider-error/latest.json`
- [ ] `match-results/poll-status/latest.json` was reviewed for `checkedAt`, `result`, `decision.reason`, `activeDates`, `attemptedProviderRequests`, `writtenMatches`, and `latestSnapshotProvider`
- [ ] Any immediate post-deploy `/api/results` 404 was resolved by the workflow retrying smoke check
- [ ] `provider: "manual"`, `isFallback: true`, and `matches: []` were treated as endpoint healthy but live results not reflected yet
- [ ] `provider: "api-football"` with `matches: []` was treated as provider poll success with possible empty or unmapped fixture mapping, not as a provider failure by itself
- [ ] `Diagnose Live Results` was run without `run_provider_poll` first
- [ ] `run_provider_poll` was set to `true` only if consuming API-FOOTBALL request count was intentional
- [ ] Manual provider poll was not repeated while any `Failed to write remote KV key ...` failure was present
- [ ] KV write preflight passed before any manual provider poll real run
- [ ] `CLOUDFLARE_API_TOKEN` was confirmed to target the correct account and include `Workers KV Storage: Edit`
- [ ] `RESULTS_KV` binding and production namespace id were confirmed before manual provider poll
- [ ] Manual provider poll was blocked or skipped if `API_FOOTBALL_KEY` was not configured as a GitHub repository secret
- [ ] No `KV binding missing` error is present
- [ ] No `API key missing` error is present
- [ ] No provider error is present, or the cause is understood
- [ ] No API key, Cloudflare token, request headers, authorization headers, or full provider response body was written to docs, logs, PRs, comments, or workflow inputs
- [ ] Top page, country selection, date selection, and venue selection were checked on mobile
- [ ] API-FOOTBALL fixture mapping status was checked
- [ ] Live results release is blocked until API-FOOTBALL fixture mapping is complete
