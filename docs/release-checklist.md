# Release Checklist

Use this immediately before promoting the Cloudflare Worker release.

- [ ] GitHub Actions CI is passing
- [ ] `Deploy Cloudflare Worker` workflow succeeded
- [ ] Cloudflare Worker deployment succeeded
- [ ] Production URL `/` displays the app
- [ ] Production URL `/api/results` returns 200
- [ ] `/api/results` returns JSON
- [ ] No `KV binding missing` error is present
- [ ] No `API key missing` error is present
- [ ] No provider error is present, or the cause is understood
- [ ] Top page, country selection, date selection, and venue selection were checked on mobile
- [ ] Fixture mapping status was checked
