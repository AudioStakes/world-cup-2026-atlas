#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const statePath = join(".codex", "hooks", "state", "baseline.json");

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }

  return result.stdout.trimEnd();
}

function parseStatusPaths(statusOutput) {
  return statusOutput
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const path = line.slice(3);
      const renameSeparator = " -> ";
      return path.includes(renameSeparator) ? (path.split(renameSeparator).at(-1) ?? path) : path;
    })
    .sort();
}

try {
  const statusOutput = runGit(["status", "--porcelain=v1"]);
  const baseline = {
    capturedAt: new Date().toISOString(),
    branch: runGit(["branch", "--show-current"]),
    head: runGit(["rev-parse", "HEAD"]),
    statusLines: statusOutput.split(/\r?\n/).filter(Boolean).sort(),
    dirtyPaths: parseStatusPaths(statusOutput),
  };

  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Codex baseline captured: ${statePath}`);
} catch (error) {
  console.error("Failed to capture Codex git baseline.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
