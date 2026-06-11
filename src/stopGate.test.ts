import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
const pathEnvironmentVariableName = "PATH";

type HookRunResult = {
  status: number;
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

describe("stop_gate.mjs", { timeout: STOP_GATE_INTEGRATION_TIMEOUT_MS }, () => {
  it.concurrent("runs final report flow with progress on stderr and JSON-only stdout", async () => {
    const harness = createHarness();
    try {
      initializeRepo(harness);
      addRemote(harness);
      createFakePnpm(harness, { failVerify: false });
      createFakeGh(harness, "https://example.test/pr/456");
      captureBaseline(harness.root);

      runGit(harness.root, ["checkout", "-b", "task-report"]);
      writeFileSync(join(harness.root, "task.txt"), "report\n");
      runGit(harness.root, ["add", "task.txt"]);
      runGit(harness.root, ["commit", "-m", "Add task report"]);
      pushBranch(harness);

      const first = await runStopGate(harness, "verify:full");
      const firstPayload = parseJsonOutput(first.stdout);

      expect(first.status).toBe(0);
      expect(first.stderr).toContain("[stop_gate] running pnpm fix...");
      expect(first.stderr).toContain("[stop_gate] running pnpm verify:full...");
      expect(first.stdout).toBe(`${JSON.stringify(firstPayload)}\n`);
      expect(firstPayload.decision).toBe("block");
      expect(firstPayload.reason).toContain("Final response required.");
      expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);

      const second = await runStopGate(harness, "verify:full", {
        messages: [
          {
            role: "assistant",
            content: "PR: https://example.test/pr/456\nReview Notes: なし\n残作業: なし",
          },
        ],
      });

      expect(second.status).toBe(0);
      expect(second.stdout).toBe("{}\n");
      expect(second.stderr).not.toContain("[stop_gate] running pnpm");
      expect(readLines(harness.pnpmLogPath)).toEqual(["--silent fix", "--silent verify:full"]);
    } finally {
      cleanupHarness(harness);
    }
  });

  it.concurrent("returns block JSON when pnpm verify:full fails", async () => {
    const harness = createHarness();
    try {
      initializeRepo(harness);
      createFakePnpm(harness, {
        failVerify: true,
        verifyStderr: "pnpm verify:full failed\n",
      });
      captureBaseline(harness.root);

      runGit(harness.root, ["checkout", "-b", "task-fail"]);
      writeFileSync(join(harness.root, "task.txt"), "fail\n");

      const result = await runStopGate(harness, "verify:full");
      const payload = parseJsonOutput(result.stdout);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("[stop_gate] running pnpm verify:full...");
      expect(result.stdout).toBe(`${JSON.stringify(payload)}\n`);
      expect(payload.decision).toBe("block");
      expect(payload.reason).toContain("pnpm verify:full failed");
    } finally {
      cleanupHarness(harness);
    }
  });
});

function createHarness(): RepoHarness {
  const root = mkdtempSync(join(tmpdir(), "stop-gate-"));
  const binDir = join(root, "bin");
  const remoteRoot = join(root, "remote.git");
  const pnpmLogPath = join(root, ".git", "pnpm.log");

  mkdirSync(binDir, { recursive: true });
  mkdirSync(join(root, ".codex", "hooks", "prompts"), { recursive: true });
  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_completion_report.txt"),
    readFileSync(completionPromptPath, "utf8"),
  );
  writeFileSync(
    join(root, ".codex", "hooks", "prompts", "stop_instruction_feedback.txt"),
    readFileSync(instructionFeedbackPromptPath, "utf8"),
  );

  return { root, binDir, pnpmLogPath, remoteRoot };
}

function cleanupHarness(harness: RepoHarness): void {
  rmSync(harness.root, { force: true, recursive: true });
}

function initializeRepo(harness: RepoHarness): void {
  runGit(harness.root, ["init", "-b", "main"]);
  runGit(harness.root, ["config", "user.email", "codex@example.test"]);
  runGit(harness.root, ["config", "user.name", "Codex Test"]);

  writeFileSync(join(harness.root, "README.md"), "initial\n");
  runGit(harness.root, ["add", "README.md"]);
  runGit(harness.root, ["commit", "-m", "Initial commit"]);
}

function addRemote(harness: RepoHarness): void {
  runGit(harness.root, ["init", "--bare", harness.remoteRoot]);
  runGit(harness.root, ["remote", "add", "origin", harness.remoteRoot]);
}

function pushBranch(harness: RepoHarness): void {
  runGit(harness.root, ["push", "-u", "origin", "HEAD"]);
}

function captureBaseline(root: string): void {
  const stateDir = join(root, ".codex", "state");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "git-start-status"), runGit(root, ["status", "--short"]));
  writeFileSync(join(stateDir, "git-start-head"), runGit(root, ["rev-parse", "HEAD"]));
}

function runStopGate(
  harness: RepoHarness,
  mode: "fix" | "verify:full",
  payload?: unknown,
  extraEnv: Record<string, string> = {},
): Promise<HookRunResult> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [hookPath, mode], {
      cwd: harness.root,
      env: {
        ...process.env,
        CODEX_HOOK_VERBOSE: "1",
        FAKE_PNPM_LOG: harness.pnpmLogPath,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        PATH: `${harness.binDir}:${process.env[pathEnvironmentVariableName] ?? ""}`,
        ...extraEnv,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolveRun({ status: status ?? 1, stdout, stderr });
    });

    if (payload !== undefined) {
      child.stdin.end(JSON.stringify(payload));
    } else {
      child.stdin.end();
    }
  });
}

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed\n${result.stderr}`);
  }

  return result.stdout;
}

function parseJsonOutput(stdout: string): HookPayload {
  expect(stdout.trim()).toMatch(/^\{.*\}$/s);
  return JSON.parse(stdout);
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

function createFakePnpm(
  harness: RepoHarness,
  options: { failVerify: boolean; verifyStderr?: string },
): void {
  if (options.failVerify) {
    writeExecutable(
      join(harness.binDir, "pnpm"),
      [
        "#!/bin/sh",
        'printf \'%s\\n\' "$*" >> "$FAKE_PNPM_LOG"',
        'if [ "$*" = "--silent verify:full" ]; then',
        "  cat >&2 <<'EOF'",
        options.verifyStderr ?? "pnpm verify:full failed\n",
        "EOF",
        "  exit 1",
        "fi",
        "exit 0",
        "",
      ].join("\n"),
    );
    return;
  }

  writeExecutable(
    join(harness.binDir, "pnpm"),
    ["#!/bin/sh", 'printf \'%s\\n\' "$*" >> "$FAKE_PNPM_LOG"', "exit 0", ""].join("\n"),
  );
}

function createFakeGh(harness: RepoHarness, prUrl: string): void {
  writeExecutable(
    join(harness.binDir, "gh"),
    ["#!/bin/sh", `printf '%s\\n' '${prUrl}'`, ""].join("\n"),
  );
}

function writeExecutable(path: string, content: string): void {
  writeFileSync(path, content, { mode: 0o755 });
}
