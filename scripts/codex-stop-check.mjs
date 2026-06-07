#!/usr/bin/env node
import { spawn } from "node:child_process";

const commandName = process.argv[2] ?? "verify";

const commands = {
  fix: ["fix", "pnpm", ["fix"]],
  verify: ["verify", "pnpm", ["verify"]],
};

const check = commands[commandName];

if (check === undefined) {
  console.error(`Unknown Codex check: ${commandName}`);
  console.error(`Expected one of: ${Object.keys(commands).join(", ")}`);
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
        command,
        args,
        ok: false,
        exitCode: null,
        output: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (exitCode) => {
      resolve({
        name,
        command,
        args,
        ok: exitCode === 0,
        exitCode,
        output: compactOutput(`${stdout}\n${stderr}`),
      });
    });
  });
}

const result = await runCheck(check);

if (!result.ok) {
  console.error(`Codex check failed: ${result.name}`);
  console.error(
    `${result.command} ${result.args.join(" ")} exited with ${result.exitCode ?? "error"}.`,
  );

  if (result.output.length > 0) {
    console.error("");
    console.error(result.output);
  }

  process.exit(1);
}
