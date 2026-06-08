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

- [Agent Workflow](docs/agent-instructions/agent-workflow.md)
- [Development](docs/agent-instructions/development.md)
- [Testing](docs/agent-instructions/testing.md)
- [Docs and Domain](docs/agent-instructions/docs-and-domain.md)

## Git Safety

- Treat pre-existing uncommitted changes as user-owned.
- Do not stage, commit, revert, or edit pre-existing dirty files unless explicitly requested.
- If a pre-existing dirty file is explicitly in the current task scope, you may edit and commit only the task-required changes to that file. Do not stage or commit unrelated pre-existing edits.
- Stage only files changed for the current task.
- Prefer explicit `git add <path>` over `git add .`.

## Delivery Rules

- If the task changes files, commit the final task changes before finishing.
- If the task changes files, create a pull request or update the existing one.
- If there are no task-owned file changes, do not create an empty commit or empty pull request.
- If you are on `main` and need to commit, switch to a non-`main` branch before committing.
- Final reports should be minimal and mechanical.
- Do not invent custom report formats in task prompts.
- Follow the final report and instruction feedback prompts emitted by repository hooks.


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

# Analysis (70-90%)
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
