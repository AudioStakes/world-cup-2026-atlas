import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const hookPath = resolve(process.cwd(), ".codex/hooks/stop_gate.mjs");
const STOP_GATE_INTEGRATION_TIMEOUT_MS = 30_000;
const tempRoots: string[] = [];

type HookRunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type HookPayload = {
  decision?: string;
  reason?: string;
  [key: string]: unknown;
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

// These tests spawn stop_gate.mjs in temporary git repositories with fake pnpm/gh binaries.
// They use a longer timeout than unit tests to cover process startup and git initialization overhead.
// Keep this timeout explicit so future process-based cases do not rely on Vitest defaults.
describe("stop_gate.mjs", { timeout: STOP_GATE_INTEGRATION_TIMEOUT_MS }, () => {
  it("keeps the verify:full control flow and renameSync hardening in the source", () => {
    const source = readFileSync(hookPath, "utf8");

    expect(source).toContain("renameSync(");
    expect(source).not.toContain('spawnSync("mv"');
    expect(source.indexOf("for (const check of checks)")).toBeLessThan(
      source.indexOf('if (mode === "verify:full")'),
    );
    expect(
      source.indexOf("if (isFinalReportResponse(inputPayload) || wasFinalReportRequested(key))"),
    ).toBeGreaterThan(source.indexOf('if (mode === "verify:full")'));
  });

  it("runs pnpm fix before pnpm verify:full and keeps progress on stderr", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    const result = runHook(harness, "verify:full", {});

    expect(result.status).toBe(0);
    expectJsonOnlyStdout(result.stdout);
    expect(parseJsonOutput(result.stdout).decision).toBe("block");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
    expect(result.stderr).toContain("[stop_gate] running pnpm fix...");
    expect(result.stderr).toContain("[stop_gate] running pnpm verify:full...");
    expect(result.stderr).not.toContain('"decision":"block"');
  });

  it("returns a block decision when pnpm verify:full fails and exits 0", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    const result = runHook(harness, "verify:full", {}, { FAKE_PNPM_FAIL_VERIFY: "1" });
    const payload = parseJsonOutput(result.stdout);

    expect(result.status).toBe(0);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("Completion is blocked.");
    expect(payload.reason).toContain("pnpm verify:full failed");
    expect(payload.reason).toContain("Next action for Codex:");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
  });

  it("keeps important TypeScript, Biome, Playwright, and pnpm lines in compacted failure output", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    const noisyOutput = [
      ...Array.from({ length: 60 }, (_, index) => `noise ${index + 1}`),
      "error TS2322: Type 'string' is not assignable to type 'number'.",
      "Biome checked 12 files in 3ms. No fixes applied.",
      "Found 1 error.",
      "Timed out 5000ms waiting for expect(locator).toBeVisible()",
      "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL Command failed with exit code 1.",
      ...Array.from({ length: 60 }, (_, index) => `tail ${index + 1}`),
    ].join("\n");

    const result = runHook(
      harness,
      "verify:full",
      {},
      {
        FAKE_PNPM_FAIL_VERIFY: "1",
        FAKE_PNPM_VERIFY_STDERR: noisyOutput,
      },
    );
    const payload = parseJsonOutput(result.stdout);

    expect(payload.reason).toContain("error TS2322:");
    expect(payload.reason).toContain("Biome checked 12 files");
    expect(payload.reason).toContain("Timed out 5000ms waiting for expect");
    expect(payload.reason).toContain("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL");
  });

  it("does not require PR or upstream when there are no task-owned changes", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    const result = runHook(harness, "verify:full", {});
    const payload = parseJsonOutput(result.stdout);

    expect(payload.reason).toContain("Final response required.");
    expect(payload.reason).toContain("Report data:");
    expect(payload.reason).toContain("PR: 変更なし・PR不要");
    expect(payload.reason).not.toContain("Codex final report context:");
    expect(payload.reason).not.toContain("Branch:");
    expect(payload.reason).not.toContain("Latest commit:");
    expect(payload.reason).not.toContain("Verification:");
    expect(payload.reason).not.toContain("Working tree:");
    expect(payload.reason).not.toContain("Pre-existing dirty files preserved:");
    expect(payload.reason).not.toContain("Current branch has no upstream.");
  });

  it("blocks with a Codex next action when task changes exist on a branch without upstream", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);
    runGit(harness.root, ["checkout", "-b", "task-upstream-missing"]);
    writeFileSync(join(harness.root, "task.txt"), "changed\n");
    runGit(harness.root, ["add", "task.txt"]);
    runGit(harness.root, ["commit", "-m", "Task change"]);

    const result = runHook(harness, "verify:full", {});
    const payload = parseJsonOutput(result.stdout);

    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("Current branch has no upstream.");
    expect(payload.reason).toContain("Next action for Codex:");
    expect(payload.reason).toContain("Push the current branch with upstream");
  });

  it("returns final response required when verification and git state both pass", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);
    runGit(harness.root, ["checkout", "-b", "task-ready"]);
    writeFileSync(join(harness.root, "task.txt"), "ready\n");
    runGit(harness.root, ["add", "task.txt"]);
    runGit(harness.root, ["commit", "-m", "Ready task"]);
    runGit(harness.root, ["push", "-u", "origin", "task-ready"]);

    const result = runHook(
      harness,
      "verify:full",
      {},
      { FAKE_GH_URL: "https://example.test/pr/123" },
    );
    const payload = parseJsonOutput(result.stdout);

    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("Final response required.");
    expect(payload.reason).toContain("Report data:");
    expect(payload.reason).toContain("Completion report instruction:");
    expect(payload.reason).toContain("Instruction feedback prompt:");
    expect(payload.reason).toContain("- PR: https://example.test/pr/123");
    expect(payload.reason).not.toContain("Codex final report context:");
    expect(payload.reason).not.toContain("Branch:");
    expect(payload.reason).not.toContain("Latest commit:");
    expect(payload.reason).not.toContain("Verification:");
    expect(payload.reason).not.toContain("Working tree:");
    expect(payload.reason).not.toContain("Pre-existing dirty files preserved:");
  });

  it("blocks with the uncommitted-diff guidance when task-owned dirty files remain", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);
    runGit(harness.root, ["checkout", "-b", "task-dirty"]);
    writeFileSync(join(harness.root, "task-dirty.txt"), "dirty\n");

    const result = runHook(
      harness,
      "verify:full",
      {},
      {
        FAKE_GH_URL: "https://example.test/pr/999",
      },
    );
    const payload = parseJsonOutput(result.stdout);

    expect(result.status).toBe(0);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("New uncommitted changes remain since task start:");
    expect(payload.reason).toContain("task-dirty.txt");
    expect(payload.reason).toContain("Commit only task-owned changes.");
    expect(payload.reason).toContain(
      "Do not stage or commit unrelated pre-existing dirty changes.",
    );
    expect(payload.reason).toContain(
      "If a pre-existing dirty file is explicitly in scope, commit only the task-required changes.",
    );
  });

  it("blocks when pnpm fix creates task-owned formatting diffs before verify:full", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);
    runGit(harness.root, ["checkout", "-b", "task-formatting"]);
    writeFileSync(join(harness.root, "task-formatting.txt"), "tracked\n");
    runGit(harness.root, ["add", "task-formatting.txt"]);
    runGit(harness.root, ["commit", "-m", "Add formatting target"]);
    runGit(harness.root, ["push", "-u", "origin", "task-formatting"]);

    const result = runHook(
      harness,
      "verify:full",
      {},
      {
        FAKE_GH_URL: "https://example.test/pr/654",
        FAKE_PNPM_FIX_WRITE_PATH: join(harness.root, "task-formatting.txt"),
        FAKE_PNPM_FIX_WRITE_CONTENT: "formatted\n",
      },
    );
    const payload = parseJsonOutput(result.stdout);

    expect(result.status).toBe(0);
    expect(payload.decision).toBe("block");
    expect(payload.reason).toContain("pnpm fix created or exposed formatting changes:");
    expect(payload.reason).toContain("task-formatting.txt");
    expect(payload.reason).toContain("Stage and commit only task-owned formatting changes.");
    expect(payload.reason).toContain(
      "Do not stage or commit unrelated pre-existing dirty changes.",
    );
    expect(payload.reason).toContain("Then finish again.");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix"]);
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
    expect(readLines(harness.pnpmLogPath)).toEqual([
      "--silent fix",
      "--silent verify:full",
      "--silent fix",
      "--silent verify:full",
    ]);
  });

  it("does not hang when run directly without stdin", () => {
    const harness = createHarness();
    initializeRepo(harness);
    captureBaseline(harness.root);

    const result = runHook(harness, "verify:full", undefined, {
      FAKE_GH_URL: "https://example.test/pr/789",
    });

    expect(result.status).toBe(0);
    expect(parseJsonOutput(result.stdout).decision).toBe("block");
    expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
  });
});

function createHarness(): RepoHarness {
  const root = mkdtempSync(join(tmpdir(), "stop-gate-"));
  const binDir = join(root, "bin");
  const remoteRoot = join(root, "remote.git");
  const pnpmLogPath = join(root, "pnpm-invocations.log");

  mkdirSync(binDir, { recursive: true });
  mkdirSync(join(root, ".codex", "hooks", "prompts"), { recursive: true });
  mkdirSync(join(root, ".codex", "state"), { recursive: true });

  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_completion_report.txt"),
    "日本語で簡潔に完了報告のみ出力。新規作業は禁止。\n",
  );
  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_instruction_feedback.txt"),
    "指示への改善点があれば簡潔に述べる。\n",
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
  writeFileSync(join(harness.root, "README.md"), "# test\n");
  writeFileSync(
    join(harness.root, ".gitignore"),
    `${[
      ".codex/hooks/logs/",
      ".codex/state/stop-gate-state.json",
      "bin/",
      "pnpm-invocations.log",
      "remote.git/",
    ].join("\n")}\n`,
  );
  runGit(harness.root, ["add", "README.md", ".gitignore"]);
  runGit(harness.root, ["commit", "-m", "Initial commit"]);
  runGit(harness.root, ["init", "--bare", harness.remoteRoot]);
  runGit(harness.root, ["remote", "add", "origin", harness.remoteRoot]);
  runGit(harness.root, ["push", "-u", "origin", "main"]);
}

function captureBaseline(root: string): void {
  writeFileSync(
    join(root, ".codex", "state", "git-start-status"),
    runGit(root, ["status", "--porcelain=v1"]),
  );
  writeFileSync(
    join(root, ".codex", "state", "git-start-head"),
    `${runGit(root, ["rev-parse", "HEAD"]).trim()}\n`,
  );
}

function installFakePnpm(binDir: string): void {
  writeExecutable(
    join(binDir, "pnpm"),
    `#!/bin/sh
echo "$*" >> "$FAKE_PNPM_LOG"
if [ "$2" = "fix" ] && [ -n "$FAKE_PNPM_FIX_WRITE_PATH" ]; then
  printf "%s" "$FAKE_PNPM_FIX_WRITE_CONTENT" >> "$FAKE_PNPM_FIX_WRITE_PATH"
fi
if [ -n "$FAKE_PNPM_STDOUT" ]; then
  printf '%b\\n' "$FAKE_PNPM_STDOUT"
else
  echo "pnpm stdout: $*"
fi
if [ "$2" = "verify:full" ] && [ -n "$FAKE_PNPM_VERIFY_STDERR" ]; then
  printf '%b\\n' "$FAKE_PNPM_VERIFY_STDERR" >&2
elif [ -n "$FAKE_PNPM_STDERR" ]; then
  printf '%b\\n' "$FAKE_PNPM_STDERR" >&2
else
  echo "pnpm stderr: $*" >&2
fi
if [ "$2" = "verify:full" ] && [ "$FAKE_PNPM_FAIL_VERIFY" = "1" ]; then
  exit 1
fi
exit 0
`,
  );
}

function installFakeGh(binDir: string): void {
  writeExecutable(
    join(binDir, "gh"),
    `#!/bin/sh
if [ -n "$FAKE_GH_URL" ]; then
  printf '%s\\n' "$FAKE_GH_URL"
  exit 0
fi
exit 1
`,
  );
}

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content, { mode: 0o755 });
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
      PATH: `${harness.binDir}:${process.env["PATH"] ?? ""}`,
      FAKE_PNPM_LOG: harness.pnpmLogPath,
      CODEX_HOOK_VERBOSE: "1",
    },
    ...(payload === undefined ? {} : { input: JSON.stringify(payload) }),
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed\n${result.stderr}`);
  }

  return result.stdout;
}

function expectJsonOnlyStdout(stdout: string): void {
  const trimmed = stdout.trim();
  expect(trimmed).not.toBe("");
  expect(() => JSON.parse(trimmed)).not.toThrow();
  expect(trimmed.split("\n")).toHaveLength(1);
}

function parseJsonOutput(stdout: string): HookPayload {
  expectJsonOnlyStdout(stdout);
  return JSON.parse(stdout) as HookPayload;
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
