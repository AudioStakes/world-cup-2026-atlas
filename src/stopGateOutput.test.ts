import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appStopCheckScript = resolve(repositoryRoot, "scripts", "codex-app-stop-check.mjs");
const stopCheckScript = resolve(repositoryRoot, "scripts", "codex-stop-check.mjs");
const stopGateScript = resolve(repositoryRoot, ".codex", "hooks", "stop_gate.mjs");
const pathEnvironmentVariableName = "PATH";

function writeExecutable(path: string, contents: string) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function createWorkspace(pnpmScript: string) {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "stop-gate-output-"));
  const binDir = mkdtempSync(join(tmpdir(), "stop-gate-bin-"));
  const scriptsDir = join(workspaceRoot, "scripts");
  const hooksDir = join(workspaceRoot, ".codex", "hooks");

  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(hooksDir, { recursive: true });
  spawnSync("git", ["init"], {
    cwd: workspaceRoot,
    stdio: "ignore",
  });
  copyFileSync(appStopCheckScript, join(scriptsDir, "codex-app-stop-check.mjs"));
  copyFileSync(stopCheckScript, join(scriptsDir, "codex-stop-check.mjs"));
  copyFileSync(stopGateScript, join(hooksDir, "stop_gate.mjs"));
  writeExecutable(join(binDir, "pnpm"), pnpmScript);

  return { workspaceRoot, binDir };
}

function runStopCheck(workspaceRoot: string, binDir: string) {
  return spawnSync(process.execPath, ["scripts/codex-app-stop-check.mjs", "fix"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env[pathEnvironmentVariableName] ?? ""}`,
    },
  });
}

function runStopGateScript(workspaceRoot: string, binDir: string, mode: string) {
  return spawnSync(process.execPath, [".codex/hooks/stop_gate.mjs", mode], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}${process.platform === "win32" ? ";" : ":"}${process.env[pathEnvironmentVariableName] ?? ""}`,
    },
  });
}

function createSuccessfulFinalWorkspace() {
  const workspace = createWorkspace("#!/bin/sh\nexit 0\n");
  const stateDir = join(workspace.workspaceRoot, ".codex", "state");
  const promptsDir = join(workspace.workspaceRoot, ".codex", "hooks", "prompts");

  mkdirSync(stateDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });
  writeFileSync(join(stateDir, "git-start-status"), "");
  writeFileSync(join(stateDir, "git-start-head"), "baseline-head\n");
  writeFileSync(join(promptsDir, "stop_completion_report.txt"), "completion prompt");
  writeFileSync(join(promptsDir, "stop_instruction_feedback.txt"), "instruction feedback prompt");
  writeExecutable(
    join(workspace.binDir, "git"),
    `#!/bin/sh
case "$*" in
  "rev-parse --show-toplevel") pwd ;;
  "status --porcelain=v1") exit 0 ;;
  "rev-parse HEAD") echo current-head ;;
  "branch --show-current") echo codex/test ;;
  "log -1 --oneline") echo "current-head Test commit" ;;
  "rev-parse --abbrev-ref --symbolic-full-name @{u}") echo origin/codex/test ;;
  "status --branch --porcelain=v1") echo "## codex/test...origin/codex/test" ;;
  *) echo "unexpected git command: $*" >&2; exit 1 ;;
esac
`,
  );
  writeExecutable(
    join(workspace.binDir, "gh"),
    `#!/bin/sh
echo "https://example.test/pull/1"
`,
  );

  return workspace;
}

describe("stop gate output", () => {
  it("prints valid hook JSON and does not create .codex logs on success", () => {
    const { workspaceRoot, binDir } = createWorkspace("#!/bin/sh\nexit 0\n");

    const result = runStopCheck(workspaceRoot, binDir);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ continue: true });
    expect(result.stderr).toBe("");
    expect(existsSync(join(workspaceRoot, ".codex", "hooks", "logs"))).toBe(false);
  });

  it("prints valid hook JSON when the hook script succeeds directly", () => {
    const { workspaceRoot, binDir } = createWorkspace("#!/bin/sh\nexit 0\n");

    const result = runStopGateScript(workspaceRoot, binDir, "fix");

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ continue: true });
    expect(result.stderr).toBe("");
  });

  it("prints block hook JSON when the hook script blocks directly", () => {
    const { workspaceRoot, binDir } = createWorkspace("#!/bin/sh\nexit 0\n");

    const result = runStopGateScript(workspaceRoot, binDir, "verify:full");
    const response = JSON.parse(result.stdout.trim());

    expect(result.status).toBe(0);
    expect(response.decision).toBe("block");
    expect(response.reason).toContain("Missing Codex baseline");
    expect(result.stderr).toBe("");
  });

  it("returns final report and instruction feedback prompts as hook JSON", () => {
    const { workspaceRoot, binDir } = createSuccessfulFinalWorkspace();

    const result = runStopGateScript(workspaceRoot, binDir, "verify:full");
    const response = JSON.parse(result.stdout.trim());

    expect(result.status).toBe(0);
    expect(response.decision).toBe("block");
    expect(response.reason).toContain("completion prompt");
    expect(response.reason).toContain("instruction feedback prompt");
    expect(result.stderr).toBe("");
  });

  it("continues after final prompts have already been returned for the same commit", () => {
    const { workspaceRoot, binDir } = createSuccessfulFinalWorkspace();

    runStopGateScript(workspaceRoot, binDir, "verify:full");
    const result = runStopGateScript(workspaceRoot, binDir, "verify:full");

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ continue: true });
    expect(result.stderr).toBe("");
  });

  it("blocks with compact failure output and does not create .codex logs", () => {
    const { workspaceRoot, binDir } = createWorkspace(
      "#!/bin/sh\necho 'ERR_PNPM_TEST simulated failure' >&2\nexit 1\n",
    );

    const result = runStopCheck(workspaceRoot, binDir);
    const response = JSON.parse(result.stdout.trim());

    expect(result.status).toBe(0);
    expect(response.decision).toBe("block");
    expect(response.reason).toContain("pnpm fix failed");
    expect(response.reason).toContain("ERR_PNPM_TEST simulated failure");
    expect(result.stderr).not.toContain("Full log:");
    expect(existsSync(join(workspaceRoot, ".codex", "hooks", "logs"))).toBe(false);
  });
});
