import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const hookPath = resolve(process.cwd(), ".codex/hooks/stop_gate.mjs");
const completionPromptPath = resolve(
  process.cwd(),
  ".codex/hooks/prompts/stop_completion_report.txt",
);
const instructionFeedbackPromptPath = resolve(
  process.cwd(),
  ".codex/hooks/prompts/stop_instruction_feedback.txt",
);
const STOP_GATE_INTEGRATION_TIMEOUT_MS = 12_000;

const tempRoots: string[] = [];

type HookRunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type HookPayload = {
  decision?: string;
  reason?: string;
};

type RepoHarness = {
  root: string;
  binDir: string;
  pnpmLogPath: string;
  remoteRoot: string;
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("stop_gate.mjs", { timeout: STOP_GATE_INTEGRATION_TIMEOUT_MS }, () => {
  it("runs pnpm fix before pnpm verify:full and keeps progress on stderr", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    runGit(harness.root, ["checkout", "-b", "task-progress"]);
    writeFileSync(join(harness.root, "task.txt"), "progress\n");
    runGit(harness.root, ["add", "task.txt"]);
    runGit(harness.root, ["commit", "-m", "Add task progress"]);
    runGit(harness.root, ["push", "-u", "origin", "task-progress"]);

    const result = runHook(
      harness,
      "verify:full",
      {},
      { FAKE_GH_URL: "https://example.test/pr/1" },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("[stop_gate] running pnpm fix...");
    expect(result.stderr).toContain("[stop_gate] running pnpm verify:full...");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
  });

  it("returns a block decision when pnpm verify:full fails and exits 0", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    runGit(harness.root, ["checkout", "-b", "task-fail"]);
    writeFileSync(join(harness.root, "task.txt"), "fail\n");
    runGit(harness.root, ["add", "task.txt"]);
    runGit(harness.root, ["commit", "-m", "Add fail task"]);
    runGit(harness.root, ["push", "-u", "origin", "task-fail"]);

    const noisyOutput = [
      "src/app/app.tsx:100: error TS2322: type mismatch",
      "Biome checked 12 files in 7ms.",
      "Playwright timeout after 30000ms",
      "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL",
    ].join("\n");

    const result = runHook(
      harness,
      "verify:full",
      {},
      {
        FAKE_GH_URL: "https://example.test/pr/123",
        FAKE_PNPM_FAIL_VERIFY: "1",
        FAKE_PNPM_VERIFY_STDERR: noisyOutput,
      },
    );

    const payload = parseJsonOutput(result.stdout);
    expect(result.status).toBe(0);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("pnpm verify:full failed");
    expect(payload.reason).toContain("error TS2322:");
    expect(payload.reason).toContain("Biome checked 12 files");
    expect(payload.reason).toContain("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL");
  });

  it("blocks with uncommitted-diff guidance when task-owned dirty files remain", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    runGit(harness.root, ["checkout", "-b", "task-dirty"]);
    writeFileSync(join(harness.root, "task-dirty.txt"), "dirty\n");

    const result = runHook(
      harness,
      "verify:full",
      {},
      { FAKE_GH_URL: "https://example.test/pr/999" },
    );

    const payload = parseJsonOutput(result.stdout);
    expect(result.status).toBe(0);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("New uncommitted changes remain since task start:");
    expect(payload.reason).toContain("task-dirty.txt");
    expect(payload.reason).toContain("Commit only task-owned changes.");
  });

  it("returns an empty JSON object after the final report response", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    runGit(harness.root, ["checkout", "-b", "task-report"]);
    writeFileSync(join(harness.root, "task.txt"), "report\n");
    runGit(harness.root, ["add", "task.txt"]);
    runGit(harness.root, ["commit", "-m", "Report task"]);
    runGit(harness.root, ["push", "-u", "origin", "task-report"]);

    const first = runHook(
      harness,
      "verify:full",
      {},
      { FAKE_GH_URL: "https://example.test/pr/456" },
    );
    const second = runHook(
      harness,
      "verify:full",
      {
        messages: [
          {
            role: "assistant",
            content: "PR: https://example.test/pr/456\nReview Notes: なし\n残作業: なし",
          },
        ],
      },
      { FAKE_GH_URL: "https://example.test/pr/456" },
    );

    expect(parseJsonOutput(first.stdout).decision).toBe("block");
    expect(second.status).toBe(0);
    expect(second.stdout.trim()).toBe("{}");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
  });
});

function createHarness(): RepoHarness {
  const root = mkdtempSync(join(tmpdir(), "stop-gate-"));
  const binDir = join(root, "bin");
  const remoteRoot = join(root, "remote.git");
  const pnpmLogPath = join(
    tmpdir(),
    `stop-gate-pnpm-${Date.now()}-${Math.random().toString(16).slice(2)}.log`,
  );

  mkdirSync(binDir, { recursive: true });
  mkdirSync(join(root, ".codex", "hooks", "prompts"), { recursive: true });
  mkdirSync(join(root, ".codex", "state"), { recursive: true });

  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_completion_report.txt"),
    readFileSync(completionPromptPath, "utf8"),
  );
  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_instruction_feedback.txt"),
    readFileSync(instructionFeedbackPromptPath, "utf8"),
  );

  installFakePnpm(binDir);
  installFakeGh(binDir);
  tempRoots.push(root);

  return { root, binDir, pnpmLogPath, remoteRoot };
}

function initializeRepo(harness: RepoHarness): void {
  runGit(harness.root, ["init", "-b", "main"]);
  runGit(harness.root, ["config", "user.name", "Codex Test"]);
  runGit(harness.root, ["config", "user.email", "codex@example.test"]);
  writeFileSync(join(harness.root, "README.md"), "repo\n");
  writeFileSync(join(harness.root, ".gitignore"), ".codex/hooks/logs/\n");
  runGit(harness.root, ["add", "README.md", ".gitignore"]);
  runGit(harness.root, ["commit", "-m", "Initial commit"]);
  runGit(harness.root, ["init", "--bare", harness.remoteRoot]);
  runGit(harness.root, ["remote", "add", "origin", harness.remoteRoot]);
  runGit(harness.root, ["push", "-u", "origin", "main"]);
}

function captureBaseline(root: string): void {
  const stateDir = join(root, ".codex", "state");
  writeFileSync(join(stateDir, "git-start-status"), runGit(root, ["status", "--porcelain=v1"]));
  writeFileSync(join(stateDir, "git-start-head"), runGit(root, ["rev-parse", "HEAD"]));
}

function runHook(
  harness: RepoHarness,
  mode: "fix" | "verify:full",
  payload?: unknown,
  extraEnv: Record<string, string> = {},
): HookRunResult {
  const result = spawnSync(process.execPath, [hookPath, mode], {
    cwd: harness.root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
      CODEX_HOOK_VERBOSE: "1",
      FAKE_PNPM_LOG: harness.pnpmLogPath,
      PATH: `${harness.binDir}:${process.env["PATH"] ?? ""}`,
    },
    input: payload === undefined ? undefined : JSON.stringify(payload),
  });

  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed\n${result.stderr}`);
  }

  return result.stdout;
}

function parseJsonOutput(stdout: string): HookPayload {
  const trimmed = stdout.trim();
  expect(trimmed).not.toBe("");
  expect(() => JSON.parse(trimmed)).not.toThrow();
  expect(trimmed.split("\n")).toHaveLength(1);
  return JSON.parse(trimmed) as HookPayload;
}

function readLines(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function installFakePnpm(binDir: string): void {
  writeExecutable(
    join(binDir, "pnpm"),
    [
      "#!/bin/sh",
      'printf \'%s\\n\' "$*" >> "$FAKE_PNPM_LOG"',
      'if [ "$1" = "--silent" ] && [ "$2" = "verify:full" ] && [ "$FAKE_PNPM_FAIL_VERIFY" = "1" ]; then',
      "  printf '%s\\n' \"" + "$" + "{FAKE_PNPM_VERIFY_STDERR:-pnpm verify:full failed}" + '" >&2',
      "  exit 1",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
  );
}

function installFakeGh(binDir: string): void {
  writeExecutable(
    join(binDir, "gh"),
    [
      "#!/bin/sh",
      'if [ -n "$FAKE_GH_URL" ]; then',
      "  printf '%s\\n' \"$FAKE_GH_URL\"",
      "  exit 0",
      "fi",
      "exit 1",
      "",
    ].join("\n"),
  );
}

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content, { mode: 0o755 });
}
