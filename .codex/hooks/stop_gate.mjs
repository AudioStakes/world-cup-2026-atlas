#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  buildPrReportLine as buildPrReportLineCore,
  isFinalReportResponse as isFinalReportResponseCore,
  parseStopHookToggleValue as parseStopHookToggleValueCore,
  shouldSkipVerification as shouldSkipVerificationCore,
} from "./stop_gate_core.mjs";

const inputPayload = readStdinJson();
const repositoryRoot = resolveRepositoryRoot();
const mode = process.argv[2] ?? "verify:full";
const baselineStatusPath = join(repositoryRoot, ".codex", "state", "git-start-status");
const baselineHeadPath = join(repositoryRoot, ".codex", "state", "git-start-head");
const stopStatePath = join(repositoryRoot, ".codex", "state", "stop-gate-state.json");
const logDirectory = join(repositoryRoot, ".codex", "hooks", "logs");
const isVerbose = process.env.CODEX_HOOK_VERBOSE === "1";
const stopHookActions = {
  autoCommit: readStopHookToggle("STOP_HOOK_AUTO_COMMIT", "task-owned changes auto commit"),
  autoPushPr: readStopHookToggle("STOP_HOOK_AUTO_PUSH_PR", "push/create/update pull request"),
  agentLoadReport: readStopHookToggle("STOP_HOOK_AGENT_LOAD_REPORT", "AI agent load report"),
};
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
  fix: [
    { name: "pnpm fix", command: "pnpm", args: ["--silent", "fix"], timeoutMs: 15 * 60 * 1000 },
  ],
  "verify:full": [
    { name: "pnpm fix", command: "pnpm", args: ["--silent", "fix"], timeoutMs: 15 * 60 * 1000 },
    {
      name: "pnpm verify:full",
      command: "pnpm",
      args: ["--silent", "verify:full"],
      timeoutMs: 30 * 60 * 1000,
    },
  ],
};

const checks = commandPlans[mode];
if (checks === undefined) {
  writeBlock(
    "Codex hook configuration error.",
    `Unknown Codex hook mode: ${mode}\nExpected one of: ${Object.keys(commandPlans).join(", ")}`,
  );
}

const importantLinePatterns = [
  /^\s*FAIL\s+/,
  /^\s*Error:/,
  /^\s*AssertionError:/,
  /^\s*TypeError:/,
  /^\s*ReferenceError:/,
  /^\s*SyntaxError:/,
  /^\s*TS\d+:/,
  /^\s*error TS\d+:/,
  /^\s*Biome\b/i,
  /^\s*Found \d+ error/i,
  /^\s*✖/,
  /^\s*×/,
  /^\s*Running \d+ tests?/i,
  /^\s*Test Files?/i,
  /^\s*Tests?/i,
  /^\s*Timed out \d+ms waiting for expect/i,
  /^\s*waiting for locator/i,
  /^\s*locator\.[^(]+\(/i,
  /^\s*browserType\.launch:/i,
  /^\s*net::ERR_/i,
  /^\s*pnpm ERR!/,
  /^\s*ERR_PNPM_/,
  /^\s*ERR!/,
];
const maxLinesTotal = 96;
const contextRadius = 2;
const tailLines = 24;

function readStdinJson() {
  if (process.stdin.isTTY || !process.stdin.readable) {
    return {};
  }

  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw.length > 0 ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function writeProgress(message) {
  process.stderr.write(`[stop_gate] ${message}\n`);
}

function readStopHookToggle(name, label) {
  const result = parseStopHookToggleValueCore(process.env[name], name);
  if (result.warning) {
    writeProgress(result.warning);
  }
  if (!result.enabled && process.env[name] !== undefined) {
    writeProgress(`skip ${label}: ${name}=off`);
  }
  return result.enabled;
}

function writePass() {
  writeJson({});
  process.exit(0);
}

function writeBlock(title, reason) {
  writeJson({
    decision: "block",
    reason: [title, "", reason].filter(Boolean).join("\n"),
  });
  process.exit(0);
}

function isFinalReportResponse(value) {
  return isFinalReportResponseCore(value);
}

function createLogPath(name) {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
  return join(logDirectory, `${timestamp}-${safeName}.log`);
}

function createRunLog(name, command, args) {
  mkdirSync(logDirectory, { recursive: true });
  const fullLogPath = createLogPath(name);
  writeFileSync(fullLogPath, "");
  appendFileSync(fullLogPath, `[stop_gate] ${name}\n`);
  appendFileSync(fullLogPath, `[stop_gate] command: ${command} ${args.join(" ")}\n`);
  appendFileSync(fullLogPath, `[stop_gate] started: ${new Date().toISOString()}\n\n`);
  return fullLogPath;
}

function compactOutput(output) {
  const lines = output.split(/\r?\n/);
  if (lines.length <= maxLinesTotal) {
    return output.trimEnd();
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

function runCheck(check) {
  const { name, command, args, timeoutMs } = check;

  return new Promise((resolve) => {
    const fullLogPath = createRunLog(name, command, args);
    writeProgress(`running ${name}...`);
    writeProgress(`full log: ${fullLogPath}`);

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

    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";
    let timeoutHandle = null;
    let killHandle = null;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      if (killHandle !== null) {
        clearTimeout(killHandle);
      }
      resolve(result);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      appendFileSync(fullLogPath, chunk);
      if (isVerbose) {
        process.stderr.write(chunk);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      appendFileSync(fullLogPath, chunk);
      if (isVerbose) {
        process.stderr.write(chunk);
      }
    });

    child.on("error", (error) => {
      const output = error instanceof Error ? error.message : String(error);
      appendFileSync(fullLogPath, `\n${output}\n`);
      writeProgress(`failed to start ${name}`);
      finish({
        name,
        ok: false,
        exitCode: null,
        output: compactOutput(output),
        fullLogPath,
        timedOut: false,
        timeoutMs,
      });
    });

    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        writeProgress(`${name} timed out after ${timeoutMs}ms; sending SIGTERM`);
        child.kill("SIGTERM");
        killHandle = setTimeout(() => {
          if (!settled) {
            writeProgress(`${name} did not exit after SIGTERM; sending SIGKILL`);
            child.kill("SIGKILL");
          }
        }, 5000);
      }, timeoutMs);
    }

    child.on("close", (exitCode) => {
      appendFileSync(
        fullLogPath,
        `\n[exit ${exitCode ?? "null"}${timedOut ? ", timed out" : ""}]\n`,
      );
      writeProgress(
        `${name} ${exitCode === 0 && !timedOut ? "completed successfully" : `finished with exit code ${exitCode}`}`,
      );
      finish({
        name,
        ok: exitCode === 0 && !timedOut,
        exitCode,
        output: compactOutput(`${stdout}\n${stderr}`),
        fullLogPath,
        timedOut,
        timeoutMs,
      });
    });
  });
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
      "Run restart the Codex session baseline capture, then finish again.",
    ),
  );
}

function getBaselineHead() {
  return readRequiredFile(
    baselineHeadPath,
    `Missing Codex baseline HEAD: ${baselineHeadPath}.`,
    "Run restart the Codex session baseline capture, then finish again.",
  );
}

function getGitContext() {
  const branchStatus = runGit(["status", "--branch", "--porcelain=v1"]);
  const currentDirtyPaths = parseStatusPaths(runGit(["status", "--porcelain=v1"]));
  const baselineDirtyPaths = getBaselineDirtyPaths();
  const baselineDirtyPathSet = new Set(baselineDirtyPaths);
  const newDirtyPaths = currentDirtyPaths.filter((path) => !baselineDirtyPathSet.has(path));
  const baselineHead = getBaselineHead();
  const currentHead = runGit(["rev-parse", "HEAD"]);
  const hasTaskCommit = currentHead !== baselineHead;
  const prUrl = hasTaskCommit
    ? runCommand("gh", ["pr", "view", "--json", "url", "--jq", ".url"], { allowFailure: true })
    : null;
  const branchLine =
    branchStatus
      .split("\n")[0]
      ?.replace(/^##\s+/, "")
      .trim() ?? "unknown";
  const branch = branchLine.split("...")[0]?.trim() || branchLine;
  const upstream = branchLine.includes("...")
    ? (branchLine.split("...")[1]?.split(" ")[0] ?? null)
    : null;

  return {
    branch,
    latestCommit: currentHead,
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
}

function buildPrReportLine(context) {
  return buildPrReportLineCore(context, stopHookActions);
}

function buildFinalResponseReason(context) {
  const completionPrompt = readRequiredPrompt(completionPromptPath);
  const lines = [
    "Report data:",
    buildPrReportLine(context),
    "",
    "Completion report instruction:",
    completionPrompt,
  ];

  if (stopHookActions.agentLoadReport) {
    const instructionFeedbackPrompt = readRequiredPrompt(instructionFeedbackPromptPath);
    lines.push("", "Instruction feedback prompt:", instructionFeedbackPrompt);
  } else {
    writeProgress("skip AI agent load report: STOP_HOOK_AGENT_LOAD_REPORT=off");
  }

  return lines.filter(Boolean).join("\n");
}

function assertCompletionGitState(context) {
  if (context.newDirtyPaths.length > 0 && stopHookActions.autoCommit) {
    blockCompletion(
      "New uncommitted changes remain since task start:",
      [
        ...context.newDirtyPaths.map((path) => `- ${path}`),
        "",
        "Commit only task-owned changes.",
        "Do not stage or commit unrelated pre-existing dirty changes.",
        "If a pre-existing dirty file is explicitly in scope, commit only the task-required changes.",
        "Then push, create or update the PR, and finish again.",
      ].join("\n"),
    );
  }

  if (context.newDirtyPaths.length > 0 && !stopHookActions.autoCommit) {
    writeProgress("skip auto commit checks: STOP_HOOK_AUTO_COMMIT=off");
  }

  if (!context.hasTaskCommit) {
    return;
  }

  if (!stopHookActions.autoPushPr) {
    writeProgress("skip push/create/update pull request: STOP_HOOK_AUTO_PUSH_PR=off");
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

function assertFixDidNotCreateDirtyPaths(beforePaths, context) {
  if (!stopHookActions.autoCommit) {
    writeProgress("skip formatting-change commit check: STOP_HOOK_AUTO_COMMIT=off");
    return;
  }

  const beforePathSet = new Set(beforePaths);
  const createdDirtyPaths = context.newDirtyPaths.filter((path) => !beforePathSet.has(path));
  if (createdDirtyPaths.length === 0) {
    return;
  }

  blockCompletion(
    "pnpm fix created or exposed formatting changes:",
    [
      ...createdDirtyPaths.map((path) => `- ${path}`),
      "",
      "Stage and commit only task-owned formatting changes.",
      "Do not stage or commit unrelated pre-existing dirty changes.",
      "Then finish again.",
    ].join("\n"),
  );
}

function shouldSkipVerification(context, key) {
  return shouldSkipVerificationCore(
    context,
    isFinalReportResponse(inputPayload) || wasFinalReportRequested(key),
  );
}

function saveStopState(state) {
  mkdirSync(dirname(stopStatePath), { recursive: true });
  const temporaryPath = `${stopStatePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(temporaryPath, stopStatePath);
}

function loadStopState() {
  if (!existsSync(stopStatePath)) {
    return { entries: {} };
  }

  try {
    const parsed = JSON.parse(readFileSync(stopStatePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function turnKey(value, context) {
  return JSON.stringify({
    input: value,
    branch: context.branch,
    head: context.currentHead,
    prUrl: context.prUrl,
  });
}

function markFinalReportRequested(key) {
  const state = loadStopState();
  state.entries ??= {};
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

async function main() {
  if (mode === "verify:full") {
    const context = getGitContext();
    const key = turnKey(inputPayload, context);

    if (shouldSkipVerification(context, key)) {
      if (isFinalReportResponse(inputPayload) || wasFinalReportRequested(key)) {
        writePass();
      }

      const completionPrompt = readRequiredPrompt(completionPromptPath);
      const instructionFeedbackPrompt = readRequiredPrompt(instructionFeedbackPromptPath);
      markFinalReportRequested(key);
      writeBlock("Final response required.", buildFinalResponseReason(context));
      writeBlock(
        "Final response required.",
        [
          "Report data:",
          "- PR: 変更なし・PR不要",
          "",
          "Completion report instruction:",
          completionPrompt,
          "",
          "Instruction feedback prompt:",
          instructionFeedbackPrompt,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  for (const check of checks) {
    const dirtyPathsBeforeCheck =
      mode === "verify:full" && check.name === "pnpm fix" ? getGitContext().currentDirtyPaths : [];
    const result = await runCheck(check);
    if (!result.ok) {
      if (result.timedOut) {
        writeBlock(
          "Completion is blocked.",
          [
            "Reason:",
            `${result.name} timed out after ${result.timeoutMs}ms.`,
            result.fullLogPath ? `Full log: ${result.fullLogPath}` : "",
            "",
            "Next action for Codex:",
            "Inspect the full log, fix the timeout cause, and run the task again.",
            "",
            "Do not produce the final report yet.",
            "Continue the task, then finish again.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }

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
    }

    if (mode === "verify:full" && check.name === "pnpm fix") {
      assertFixDidNotCreateDirtyPaths(dirtyPathsBeforeCheck, getGitContext());
    }
  }

  if (mode === "verify:full") {
    const context = getGitContext();
    const key = turnKey(inputPayload, context);

    assertCompletionGitState(context);

    const completionPrompt = readRequiredPrompt(completionPromptPath);
    const instructionFeedbackPrompt = readRequiredPrompt(instructionFeedbackPromptPath);

    markFinalReportRequested(key);
    writeBlock("Final response required.", buildFinalResponseReason(context));
    writeBlock(
      "Final response required.",
      [
        "Report data:",
        context.hasTaskCommit ? `- PR: ${context.prUrl}` : "- PR: 変更なし・PR不要",
        "",
        "Completion report instruction:",
        completionPrompt,
        "",
        "Instruction feedback prompt:",
        instructionFeedbackPrompt,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  writePass();
}

main().catch((error) => {
  writeBlock(
    "Codex hook configuration error.",
    error instanceof Error ? error.message : String(error),
  );
});
