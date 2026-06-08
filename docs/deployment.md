# Deployment

World Cup 2026 Atlas is a static Vite SPA and can be deployed to GitHub Pages.

## GitHub Pages workflow

The workflow is defined in:

```txt
.github/workflows/deploy-pages.yml
```

It runs on:

- pushes to `main`
- manual `workflow_dispatch`

The workflow:

1. installs dependencies with pnpm
2. runs `pnpm verify`
3. builds the app with `GITHUB_PAGES=true`
4. uploads `dist`
5. deploys to GitHub Pages

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
pnpm ready
pnpm build
pnpm preview
```

The local preview uses `/` as the base path unless `GITHUB_PAGES=true` is set.
