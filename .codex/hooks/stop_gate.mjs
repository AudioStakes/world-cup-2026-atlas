#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const inputPayload = readStdinJson();
const repositoryRoot = resolveRepositoryRoot();
const mode = process.argv[2] ?? "verify:full";
const baselineStatusPath = join(repositoryRoot, ".codex", "state", "git-start-status");
const baselineHeadPath = join(repositoryRoot, ".codex", "state", "git-start-head");
const stopStatePath = join(repositoryRoot, ".codex", "state", "stop-gate-state.json");
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
  writeBlock(
    "Codex hook configuration error.",
    `Unknown Codex hook mode: ${mode}\nExpected one of: ${Object.keys(commandPlans).join(", ")}`,
  );
  process.exit(0);
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

function readStdinJson() {
  let raw = "";

  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return {};
  }

  if (raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { value: parsed };
  } catch {
    return {};
  }
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function writePass() {
  writeJson({});
}

function writeBlock(title, reason) {
  writeJson({
    decision: "block",
    reason: [title, "", reason].filter(Boolean).join("\n"),
  });
}

function getInputStrings(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => getInputStrings(item));
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap((item) => getInputStrings(item));
  }

  return [];
}

function isFinalReportResponse(payload) {
  return getInputStrings(payload).some((text) => {
    const normalized = text.trim();
    return (
      normalized.includes("## Instruction Feedback") ||
      (normalized.includes("Review Notes") && normalized.includes("残作業"))
    );
  });
}

function effectiveCwd(payload) {
  for (const key of ["cwd", "working_directory", "workingDirectory"]) {
    const value = payload[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return repositoryRoot;
}

function turnKey(payload, gitContext) {
  const cwd = effectiveCwd(payload);
  const sessionId = String(payload.session_id ?? payload.sessionId ?? "");
  const turnId = String(payload.turn_id ?? payload.turnId ?? "");
  const head = gitContext?.currentHead ?? runGit(["rev-parse", "HEAD"], { allowFailure: true }) ?? "no-head";

  if (sessionId || turnId) {
    return `${cwd}\0${sessionId}\0${turnId}\0${head}`;
  }

  return `${cwd}\0no-session\0no-turn\0${head}`;
}

function loadStopState() {
  if (!existsSync(stopStatePath)) {
    return { entries: {} };
  }

  try {
    const parsed = JSON.parse(readFileSync(stopStatePath, "utf8"));
    return parsed && typeof parsed === "object" && typeof parsed.entries === "object"
      ? parsed
      : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function saveStopState(state) {
  mkdirSync(dirname(stopStatePath), { recursive: true });
  const temporaryPath = `${stopStatePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  spawnSync("mv", [temporaryPath, stopStatePath]);
}

function markFinalReportRequested(key) {
  const state = loadStopState();
  state.entries[key] = {
    finalReportRequested: true,
    requestedAt: new Date().toISOString(),
  };
  saveStopState(state);
}

function wasFinalReportRequested(key) {
  const state = loadStopState();
  return Boolean(state.entries?.[key]?.finalReportRequested);
}

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

function readRequiredFile(path, reason, nextAction) {
  if (!existsSync(path)) {
    blockCompletion(reason, nextAction);
  }

  return readFileSync(path, "utf8").trim();
}

function getBaselineDirtyPaths() {
  return parseStatusPaths(
    readRequiredFile(
      baselineStatusPath,
      `Missing Codex baseline: ${baselineStatusPath}.`,
      "Run or restart the Codex session so the SessionStart hook captures the git baseline, then finish again.",
    ),
  );
}

function getBaselineHead() {
  return readRequiredFile(
    baselineHeadPath,
    `Missing Codex baseline HEAD: ${baselineHeadPath}.`,
    "Run or restart the Codex session so the SessionStart hook captures the git baseline, then finish again.",
  );
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

function blockCompletion(reason, nextAction) {
  writeBlock(
    "Completion is blocked.",
    [
      "Reason:",
      reason,
      "",
      "Next action for Codex:",
      nextAction,
      "",
      "Do not produce the final report yet.",
      "Continue the task, then finish again.",
    ].join("\n"),
  );
  process.exit(0);
}

function readRequiredPrompt(path) {
  if (!existsSync(path)) {
    blockCompletion(
      `Missing required Codex hook prompt: ${path}`,
      "Restore the missing hook prompt file, then finish again.",
    );
  }

  const content = readFileSync(path, "utf8").trimEnd();

  if (content.trim().length === 0) {
    blockCompletion(
      `Required Codex hook prompt is empty: ${path}`,
      "Restore the hook prompt content, then finish again.",
    );
  }

  return content;
}

for (const check of checks) {
  const result = await runCheck(check);

  if (!result.ok) {
    writeBlock(
      "Completion is blocked.",
      [
        "Reason:",
        `${result.name} failed`,
        result.output.length > 0 ? `\nKey output:\n${result.output}` : "",
        result.fullLogPath ? `\nFull log: ${result.fullLogPath}` : "",
        "",
        "Next action for Codex:",
        "Fix the failure above, then continue. Do not change unrelated files.",
        "",
        "Do not produce the final report yet.",
        "Continue the task, then finish again.",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    process.exit(0);
  }
}

if (mode === "verify:full") {
  const context = getGitContext();
  const key = turnKey(inputPayload, context);

  if (isFinalReportResponse(inputPayload) || wasFinalReportRequested(key)) {
    writePass();
    process.exit(0);
  }

  assertCompletionGitState(context);

  const completionPrompt = readRequiredPrompt(completionPromptPath);
  const instructionFeedbackPrompt = readRequiredPrompt(instructionFeedbackPromptPath);

  markFinalReportRequested(key);

  writeBlock(
    "Final response required.",
    [
      "Codex final report context:",
      "- Verification: pnpm verify:full passed",
      `- Branch: ${context.branch}`,
      `- Latest commit: ${context.latestCommit}`,
      `- Task changes: ${context.hasTaskCommit ? "committed" : "none"}`,
      `- PR: ${context.prUrl ?? "not required because no task-owned changes were committed"}`,
      "- Working tree: no new uncommitted task changes",
      context.baselineDirtyPaths.length > 0
        ? [
            "- Pre-existing dirty files preserved:",
            ...context.baselineDirtyPaths.map((path) => `  - ${path}`),
          ].join("\n")
        : "",
      "",
      "Completion report instruction:",
      completionPrompt,
      "",
      "Instruction feedback instruction:",
      instructionFeedbackPrompt,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  process.exit(0);
}

writePass();
