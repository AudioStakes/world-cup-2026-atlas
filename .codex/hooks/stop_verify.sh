#!/usr/bin/env sh
set -eu

cd "$(git rev-parse --show-toplevel)"

if ! pnpm fix >/dev/null 2>&1; then
  cat >&2 <<'EOF_ERROR'
pnpm fix failed. Run pnpm fix and fix the reported issue.
EOF_ERROR
  exit 2
fi

if ! pnpm verify >/dev/null; then
  exit 2
fi

exit 0
