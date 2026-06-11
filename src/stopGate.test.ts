import { describe, expect, it } from "vitest";

import {
  buildBlockResponse,
  buildFinalResponseReason,
  buildPrReportLine,
  compactOutput,
  formatHookJson,
  isFinalReportResponse,
  shouldSkipVerification,
} from "../.codex/hooks/stop_gate_core.mjs";

const defaultActions = {
  agentLoadReport: true,
  autoCommit: true,
  autoPushPr: true,
};

describe("stop_gate.mjs", () => {
  it("runs final report flow with JSON-only stdout content", () => {
    const context = {
      hasTaskCommit: true,
      newDirtyPaths: [],
      prUrl: "https://example.test/pr/456",
    };
    const reason = buildFinalResponseReason({
      prReportLine: buildPrReportLine(context, defaultActions),
      completionPrompt: "completion prompt",
      instructionFeedbackPrompt: "instruction feedback prompt",
    });
    const response = buildBlockResponse("Completion report required.", reason);
    const stdout = formatHookJson(response);

    expect(JSON.parse(stdout.trim())).toMatchObject({
      decision: "block",
      reason: expect.stringContaining("https://example.test/pr/456"),
    });
    expect(stdout).toMatch(/^\{.*\}\n$/s);
    expect(stdout).toContain("completion prompt");
    expect(stdout).toContain("instruction feedback prompt");
    expect(isFinalReportResponse(response)).toBe(true);
    expect(shouldSkipVerification(context, true)).toBe(true);
  });

  it("returns block JSON when pnpm verify:full fails", () => {
    const response = buildBlockResponse(
      "Completion is blocked.",
      [
        "Reason:",
        "pnpm verify:full failed with exit code 1.",
        "",
        compactOutput("verify failed\nERR_PNPM_RECURSIVE_RUN_FIRST_FAIL"),
        "",
        "Next action for Codex:",
        "Fix the failure, rerun the check, and finish again.",
      ].join("\n"),
    );
    const stdout = formatHookJson(response);

    expect(JSON.parse(stdout.trim())).toMatchObject({
      decision: "block",
      reason: expect.stringContaining("pnpm verify:full failed"),
    });
    expect(stdout).toContain("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL");
    expect(stdout).toMatch(/^\{.*\}\n$/s);
  });
});
