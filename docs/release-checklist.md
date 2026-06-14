# Release Checklist

Use this immediately before promoting the Cloudflare Worker release.

- [ ] GitHub Actions CI is passing
- [ ] `Deploy Cloudflare Worker` workflow succeeded
- [ ] Cloudflare Worker deployment succeeded
- [ ] `https://world-cup-2026-atlas.audiostakes.workers.dev/` displays the app
- [ ] `https://world-cup-2026-atlas.audiostakes.workers.dev/api/results` returns HTTP 200
- [ ] `/api/results` returns JSON with a `matches` array
- [ ] Any immediate post-deploy `/api/results` 404 was resolved by the workflow retrying smoke check
- [ ] `provider: "manual"`, `isFallback: true`, and `matches: []` are accepted only while fixture mapping is not populated
- [ ] No `KV binding missing` error is present
- [ ] No `API key missing` error is present
- [ ] No provider error is present, or the cause is understood
- [ ] Top page, country selection, date selection, and venue selection were checked on mobile
- [ ] API-FOOTBALL fixture mapping status was checked
- [ ] Live results release is blocked until API-FOOTBALL fixture mapping is complete
