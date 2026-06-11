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
const stopGateCoreScript = resolve(repositoryRoot, ".codex", "hooks", "stop_gate_core.mjs");
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
  copyFileSync(stopGateCoreScript, join(hooksDir, "stop_gate_core.mjs"));
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

describe("stop gate output", () => {
  it("prints valid hook JSON and does not create .codex logs on success", () => {
    const { workspaceRoot, binDir } = createWorkspace("#!/bin/sh\nexit 0\n");

    const result = runStopCheck(workspaceRoot, binDir);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ continue: true });
    expect(result.stderr).toBe("");
    expect(existsSync(join(workspaceRoot, ".codex", "hooks", "logs"))).toBe(false);
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
