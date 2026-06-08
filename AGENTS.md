# world-cup-2026-atlas

`world-cup-2026-atlas` is a static Preact application for exploring teams, groups, dates, venues, and travel routes for FIFA World Cup 2026.

## Quick Reference

- Install: `pnpm install`
- Dev: `pnpm dev`
- Fix: `pnpm fix`
- Verify: `pnpm verify`
- Full UI verification: `pnpm verify:full`
- Use concise, direct replies

## Detailed Instructions

- [Development](docs/agent-instructions/development.md)
- [Testing](docs/agent-instructions/testing.md)
- [Docs and Domain](docs/agent-instructions/docs-and-domain.md)

## Delivery Rules

- Before finishing work, commit the final changes.
- Create a pull request or update the existing one.
- If you are on `main`, switch to a non-`main` branch before committing.
- Final user-facing reports should include what changed, the PR URL or updated PR, and any follow-up work that remains.
- Keep user-facing replies concise and direct.


<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->
