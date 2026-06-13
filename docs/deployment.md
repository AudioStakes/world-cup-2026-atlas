# Deployment

World Cup 2026 Atlas is a static Vite SPA. The static-only build can be deployed to GitHub Pages.
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

`wrangler.toml` configures a Worker that serves `/api/results` and static assets. Before deploying:

1. create a KV namespace for `RESULTS_KV`
2. replace the placeholder namespace ids in `wrangler.toml`
3. set the `API_FOOTBALL_KEY` Worker secret
4. confirm `ALLOWED_ORIGINS` for the production hostname
5. populate API-FOOTBALL fixture mappings after provider fixture ids are confirmed

The Worker cron is configured to run every five minutes. Provider calls are still guarded in code by
the 20-minute interval, match polling window, and daily request budget.
