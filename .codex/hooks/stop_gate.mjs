#!/usr/bin/env node
import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "stop";

const commandPlans = {
  fix: [["pnpm fix", "pnpm", ["--silent", "fix"]]],
  verify: [
    ["pnpm fix", "pnpm", ["--silent", "fix"]],
    ["pnpm verify", "pnpm", ["--silent", "verify"]],
  ],
  "verify:full": [["pnpm verify:full", "pnpm", ["--silent", "verify:full"]]],
};

const checks = commandPlans[mode];

if (checks === undefined) {
  console.error(`Unknown Codex hook mode: ${mode}`);
  console.error(`Expected one of: ${Object.keys(commandPlans).join(", ")}`);
  process.exit(1);
}

const importantLinePatterns = [
  /^\s*FAIL\s+/,
  /^\s*×\s+/,
  /^\s*✘\s+/,
  /^\s*Error:/,
  /^\s*AssertionError:/,
  /^\s*TypeError:/,
  /^\s*ReferenceError:/,
  /^\s*SyntaxError:/,
  /^\s*\S+Error:/,
  /^\s*\d+\|/,
  /error TS\d+:/,
  /Found \d+ error/,
  /Found \d+ errors/,
  /would have printed/,
  /Biome exited because/,
  /Command failed/,
  /ERR_PNPM_/,
];

const maxLinesPerFailure = 12;

function compactOutput(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const important = lines.filter((line) =>
    importantLinePatterns.some((pattern) => pattern.test(line)),
  );

  const selected = important.length > 0 ? important : lines.slice(-maxLinesPerFailure);

  return selected.slice(0, maxLinesPerFailure).join("\n");
}

function runCheck([name, command, args]) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      env: {
        ...process.env,
        CI: "1",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      resolve({
        name,
        ok: false,
        exitCode: null,
        output: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        name,
        ok: exitCode === 0,
        exitCode,
        output: compactOutput(`${stdout}\n${stderr}`),
      });
    });
  });
}

for (const check of checks) {
  const result = await runCheck(check);

  if (!result.ok) {
    console.error(`${result.name} failed`);

    if (result.output.length > 0) {
      console.error("");
      console.error(result.output);
    }

    process.exit(1);
  }
}
