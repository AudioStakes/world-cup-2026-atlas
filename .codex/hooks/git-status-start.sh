#!/bin/sh
set -eu

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [ -z "$root" ]; then
  printf '%s\n' '{"continue":true}'
  exit 0
fi

mkdir -p "$root/.codex/state"

git -C "$root" status --porcelain=v1 > "$root/.codex/state/git-start-status"
git -C "$root" branch --show-current > "$root/.codex/state/git-start-branch"
git -C "$root" rev-parse HEAD > "$root/.codex/state/git-start-head"

printf '%s\n' '{"continue":true}'
