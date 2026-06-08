#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = resolveRepositoryRoot();
const mode = process.argv[2] ?? "verify:full";
const baselineStatusPath = join(repositoryRoot, ".codex", "state", "git-start-status");
const baselineHeadPath = join(repositoryRoot, ".codex", "state", "git-start-head");
const logDirectory = join(repositoryRoot, ".codex", "hooks", "logs");
const completionPromptPath = join(
  repositoryRoot,
  ".codex",
  "hooks",
  "prompts",
  "stop_completion_report.txt",
);
const instructionFeedbackPromptPath = join(
  repositoryRoot,
  ".codex",
  "hooks",
  "prompts",
  "stop_instruction_feedback.txt",
);

const commandPlans = {
  fix: [["pnpm fix", "pnpm", ["--silent", "fix"]]],
  "verify:full": [
    ["pnpm fix", "pnpm", ["--silent", "fix"]],
    ["pnpm verify:full", "pnpm", ["--silent", "verify:full"]],
  ],
};

const checks = commandPlans[mode];

if (checks === undefined) {
  failFatal(
    `Unknown Codex hook mode: ${mode}\nExpected one of: ${Object.keys(commandPlans).join(", ")}`,
  );
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
  /Call log:/,
  /Expected:/,
  /Received:/,
  /attachment #\d+:/,
  /trace\.zip/,
];

const contextRadius = 4;
const tailLines = 24;
const maxLinesTotal = 96;

function resolveRepositoryRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  return result.status === 0 && result.stdout.trim().length > 0
    ? result.stdout.trim()
    : process.cwd();
}

function createLogPath(name) {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
  return join(logDirectory, `${timestamp}-${safeName}.log`);
}

function compactOutput(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= maxLinesTotal) {
    return lines.join("\n");
  }

  const selectedIndexes = new Set();
  const importantIndexes = lines
    .map((line, index) =>
      importantLinePatterns.some((pattern) => pattern.test(line)) ? index : -1,
    )
    .filter((index) => index >= 0);

  for (const index of importantIndexes) {
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(lines.length, index + contextRadius + 1);

    for (let cursor = start; cursor < end; cursor += 1) {
      selectedIndexes.add(cursor);
    }
  }

  const tailStart = Math.max(0, lines.length - tailLines);
  for (let index = tailStart; index < lines.length; index += 1) {
    selectedIndexes.add(index);
  }

  const selected = Array.from(selectedIndexes).sort((left, right) => left - right);
  const limited = selected.slice(0, maxLinesTotal);

  return limited
    .map((index, selectedIndex) => {
      const previousIndex = limited[selectedIndex - 1];
      const prefix =
        previousIndex !== undefined && index > previousIndex + 1
          ? `\n... omitted ${index - previousIndex - 1} lines ...\n`
          : "";

      return `${prefix}${lines[index]}`;
    })
    .join("\n");
}

function runCheck([name, command, args]) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
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
      const output = error instanceof Error ? error.message : String(error);
      const fullLogPath = writeFullLog(name, output);
      resolve({
        name,
        ok: false,
        exitCode: null,
        output: compactOutput(output),
        fullLogPath,
      });
    });

    child.on("close", (exitCode) => {
      const fullOutput = `${stdout}\n${stderr}`;
      const fullLogPath = exitCode === 0 ? null : writeFullLog(name, fullOutput);

      resolve({
        name,
        ok: exitCode === 0,
        exitCode,
        output: compactOutput(fullOutput),
        fullLogPath,
      });
    });
  });
}

function writeFullLog(name, output) {
  mkdirSync(logDirectory, { recursive: true });
  const fullLogPath = createLogPath(name);
  writeFileSync(fullLogPath, output);
  return fullLogPath;
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  if (result.status !== 0) {
    if (options.allowFailure) {
      return null;
    }

    throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  }

  return result.stdout.trimEnd();
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
    },
  });

  if (result.status !== 0) {
    if (options.allowFailure) {
      return null;
    }

    throw new Error(
      (result.stderr || result.stdout || `${command} ${args.join(" ")} failed`).trim(),
    );
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

function readRequiredFile(path, message) {
  if (!existsSync(path)) {
    blockCompletion(
      message,
      "Run or restart the Codex session so the SessionStart hook captures the git baseline, then finish again.",
    );
  }

  return readFileSync(path, "utf8").trim();
}

function getBaselineDirtyPaths() {
  return parseStatusPaths(
    readRequiredFile(baselineStatusPath, `Missing Codex baseline: ${baselineStatusPath}.`),
  );
}

function getBaselineHead() {
  return readRequiredFile(baselineHeadPath, `Missing Codex baseline HEAD: ${baselineHeadPath}.`);
}

function getGitContext() {
  const currentStatus = runGit(["status", "--porcelain=v1"]);
  const currentDirtyPaths = parseStatusPaths(currentStatus);
  const baselineDirtyPaths = getBaselineDirtyPaths();
  const baselineDirtyPathSet = new Set(baselineDirtyPaths);
  const newDirtyPaths = currentDirtyPaths.filter((path) => !baselineDirtyPathSet.has(path));
  const baselineHead = getBaselineHead();
  const currentHead = runGit(["rev-parse", "HEAD"]);
  const hasTaskCommit = currentHead !== baselineHead;
  const branch = runGit(["branch", "--show-current"]);
  const latestCommit = runGit(["log", "-1", "--oneline"]);
  const upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  const branchStatus = runGit(["status", "--branch", "--porcelain=v1"]);
  const prUrl = hasTaskCommit
    ? runCommand("gh", ["pr", "view", "--json", "url", "--jq", ".url"], {
        allowFailure: true,
      })
    : null;

  return {
    branch,
    latestCommit,
    upstream,
    branchStatus,
    prUrl,
    currentDirtyPaths,
    baselineDirtyPaths,
    newDirtyPaths,
    baselineHead,
    currentHead,
    hasTaskCommit,
  };
}

function assertCompletionGitState(context) {
  if (context.newDirtyPaths.length > 0) {
    blockCompletion(
      [
        "New uncommitted changes remain since task start:",
        ...context.newDirtyPaths.map((path) => `- ${path}`),
      ].join("\n"),
      [
        "Commit only task-owned changes.",
        "Do not stage or commit pre-existing dirty files unless explicitly requested.",
        "Then push, create or update the PR, and finish again.",
      ].join(" "),
    );
  }

  if (!context.hasTaskCommit) {
    return;
  }

  if (context.branch === "main") {
    blockCompletion(
      "Committed task work is on main.",
      "Create a non-main branch for the task work, move or recreate the task commit there, push it, create or update the PR, and finish again.",
    );
  }

  if (!context.upstream) {
    blockCompletion(
      "Current branch has no upstream.",
      "Push the current branch with upstream, create or update the PR, and finish again.",
    );
  }

  if (/\[ahead \d+\]/.test(context.branchStatus)) {
    blockCompletion(
      "Current branch has unpushed commits.",
      "Push the current branch, create or update the PR, and finish again.",
    );
  }

  if (!context.prUrl) {
    blockCompletion(
      "No pull request URL found.",
      "Create or update the pull request for the current branch, then finish again.",
    );
  }
}

function failFatal(message) {
  console.error("Codex hook fatal error.");
  console.error("");
  console.error(message);
  process.exit(1);
}

function blockCompletion(reason, nextAction) {
  console.log("Completion is blocked.");
  console.log("");
  console.log("Reason:");
  console.log(reason);
  console.log("");
  console.log("Next action for Codex:");
  console.log(nextAction);
  console.log("");
  console.log("Do not produce the final report yet.");
  console.log("Continue the task, then finish again.");
  process.exit(1);
}

function readRequiredPrompt(path) {
  if (!existsSync(path)) {
    blockCompletion(
      `Missing required Codex hook prompt: ${path}`,
      "Restore the missing hook prompt file, then finish again.",
    );
  }

  return readFileSync(path, "utf8").trimEnd();
}

for (const check of checks) {
  const result = await runCheck(check);

  if (!result.ok) {
    console.log("Completion is blocked.");
    console.log("");
    console.log("Reason:");
    console.log(`${result.name} failed`);

    if (result.output.length > 0) {
      console.log("");
      console.log("Key output:");
      console.log(result.output);
    }

    if (result.fullLogPath) {
      console.log("");
      console.log(`Full log: ${result.fullLogPath}`);
    }

    console.log("");
    console.log("Next action for Codex:");
    console.log("Fix the failure above, then continue. Do not change unrelated files.");
    console.log("");
    console.log("Do not produce the final report yet.");
    console.log("Continue the task, then finish again.");

    process.exit(1);
  }
}

if (mode === "verify:full") {
  const context = getGitContext();
  assertCompletionGitState(context);

  console.log("Codex final report context:");
  console.log("- Verification: pnpm verify:full passed");
  console.log(`- Branch: ${context.branch}`);
  console.log(`- Latest commit: ${context.latestCommit}`);
  console.log(`- Task changes: ${context.hasTaskCommit ? "committed" : "none"}`);
  console.log(
    `- PR: ${context.prUrl ?? "not required because no task-owned changes were committed"}`,
  );
  console.log("- Working tree: no new uncommitted task changes");
  if (context.baselineDirtyPaths.length > 0) {
    console.log("- Pre-existing dirty files preserved:");
    for (const path of context.baselineDirtyPaths) {
      console.log(`  - ${path}`);
    }
  }

  console.log("");
  console.log("Completion report instruction:");
  console.log(readRequiredPrompt(completionPromptPath));

  console.log("");
  console.log("Instruction feedback instruction:");
  console.log(readRequiredPrompt(instructionFeedbackPromptPath));
}
