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

const repositoryRoot = resolveRepositoryRoot();
const mode = process.argv[2] ?? "verify:full";
const stopGatePath = resolve(repositoryRoot, ".codex", "hooks", "stop_gate.mjs");

if (!existsSync(stopGatePath)) {
  console.error(`[codex:stop-check] Missing stop gate script: ${stopGatePath}`);
  process.exit(1);
}

console.log("[codex:stop-check] Codex app does not fire the CLI Stop hook directly.");
console.log(`[codex:stop-check] Running ${mode} through .codex/hooks/stop_gate.mjs instead.`);

const result = spawnSync(process.execPath, [stopGatePath, mode], {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
