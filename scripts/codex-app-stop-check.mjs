#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function resolveRepositoryRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      ...process.env,
    },
  });

  return result.status === 0 && result.stdout.trim().length > 0
    ? result.stdout.trim()
    : process.cwd();
}

function emitHookResponse(response) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function forwardProcessOutput(result) {
  if (result.stdout && result.stdout.length > 0) {
    process.stderr.write(result.stdout);
  }

  if (result.stderr && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
}

const repositoryRoot = resolveRepositoryRoot();
const mode = process.argv[2] ?? "verify:full";
const stopCheckPath = resolve(repositoryRoot, "scripts", "codex-stop-check.mjs");

if (!existsSync(stopCheckPath)) {
  const reason = `[codex:stop-check] Missing stop check script: ${stopCheckPath}`;
  console.error(reason);
  emitHookResponse({ decision: "block", reason });
  process.exit(0);
}

const result = spawnSync(process.execPath, [stopCheckPath, mode], {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});

forwardProcessOutput(result);

if (result.error) {
  const reason = `[codex:stop-check] Failed to run stop check: ${result.error.message}`;
  console.error(reason);
  emitHookResponse({ decision: "block", reason });
  process.exit(0);
}

if (result.status !== 0) {
  const reason =
    result.stderr?.trim() || result.stdout?.trim() || "[codex:stop-check] Stop gate failed";
  console.error(`[codex:stop-check] Stop check exited with status ${result.status ?? 1}`);
  emitHookResponse({ decision: "block", reason });
  process.exit(0);
}

emitHookResponse({ continue: true });
