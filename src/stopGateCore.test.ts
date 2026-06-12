import { describe, expect, it } from "vitest";

import {
  buildPrReportLine,
  compactOutput,
  getCompletionGitStateIssue,
  getCreatedDirtyPaths,
  getInputStrings,
  isFinalReportResponse,
  parseStatusPaths,
  parseStopHookToggleValue,
  shouldSkipVerification,
} from "../.codex/hooks/stop_gate_core.mjs";

const defaultActions = {
  agentLoadReport: true,
  autoCommit: true,
  autoPushPr: true,
};

describe("stopGate core", () => {
  it("parses stop hook toggle values", () => {
    expect(parseStopHookToggleValue(undefined, "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("", "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("1", "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("true", "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("yes", "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("on", "STOP_HOOK")).toEqual({ enabled: true });
    expect(parseStopHookToggleValue("0", "STOP_HOOK")).toEqual({ enabled: false });
    expect(parseStopHookToggleValue("false", "STOP_HOOK")).toEqual({ enabled: false });
    expect(parseStopHookToggleValue("no", "STOP_HOOK")).toEqual({ enabled: false });
    expect(parseStopHookToggleValue("off", "STOP_HOOK")).toEqual({ enabled: false });
  });

  it("warns on invalid stop hook toggle values", () => {
    expect(parseStopHookToggleValue("banana", "STOP_HOOK")).toEqual({
      enabled: true,
      warning: 'warning: invalid STOP_HOOK="banana"; using on',
    });
  });

  it("parses status paths including rename targets", () => {
    expect(parseStatusPaths(" M src/a.ts\nR  old/path.ts -> new/path.ts\n\n")).toEqual([
      "src/a.ts",
      "new/path.ts",
    ]);
  });

  it("compacts output around important failures and tail lines", () => {
    const output = [
      "line 1",
      "src/app.ts:10:1 error TS2322: Type 'number' is not assignable to type 'string'.",
      "Biome checked 120 files in 15ms. No fixes applied.",
      "Playwright Timeout 30000ms exceeded.",
      "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL Command failed with exit code 1.",
      ...Array.from({ length: 30 }, (_, index) => `tail ${index + 1}`),
    ].join("\n");

    const compacted = compactOutput(output);
    expect(compacted).toContain("error TS2322");
    expect(compacted).toContain("Biome checked 120 files");
    expect(compacted).toContain("Playwright Timeout");
    expect(compacted).toContain("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL");
    expect(compacted).toContain("tail 30");
  });

  it("collects nested input strings and detects final report markers", () => {
    const payload = {
      messages: [
        { role: "assistant", content: "top level" },
        { role: "assistant", content: [{ type: "text", text: "Review Notes: none" }] },
      ],
    };

    expect(getInputStrings(payload)).toEqual([
      "assistant",
      "top level",
      "assistant",
      "text",
      "Review Notes: none",
    ]);
    expect(isFinalReportResponse(payload)).toBe(true);
    expect(isFinalReportResponse({ messages: [{ content: "plain text" }] })).toBe(false);
  });

  it("builds PR report lines for commit and toggle states", () => {
    expect(
      buildPrReportLine({ hasTaskCommit: false, newDirtyPaths: [], prUrl: "" }, defaultActions),
    ).toBe("- PR: 変更なし・PR不要");

    expect(
      buildPrReportLine(
        { hasTaskCommit: true, newDirtyPaths: [], prUrl: "https://example.test/pr/1" },
        defaultActions,
      ),
    ).toBe("- PR: https://example.test/pr/1");

    expect(
      buildPrReportLine(
        { hasTaskCommit: true, newDirtyPaths: [], prUrl: "https://example.test/pr/1" },
        { ...defaultActions, autoPushPr: false },
      ),
    ).toBe("- PR: 自動push/PR作成は無効");

    expect(
      buildPrReportLine(
        { hasTaskCommit: false, newDirtyPaths: ["src/a.ts"], prUrl: "" },
        { ...defaultActions, autoCommit: false },
      ),
    ).toBe("- PR: 自動commitは無効");
  });

  it("skips verification only for intended cases", () => {
    expect(shouldSkipVerification({ hasTaskCommit: false, newDirtyPaths: [] }, false)).toBe(true);
    expect(shouldSkipVerification({ hasTaskCommit: false, newDirtyPaths: [] }, true)).toBe(true);
    expect(shouldSkipVerification({ hasTaskCommit: true, newDirtyPaths: [] }, false)).toBe(false);
    expect(
      shouldSkipVerification({ hasTaskCommit: false, newDirtyPaths: ["src/a.ts"] }, false),
    ).toBe(false);
  });

  it("detects dirty path changes against the baseline", () => {
    expect(getCreatedDirtyPaths([], ["a.txt"])).toEqual(["a.txt"]);
    expect(getCreatedDirtyPaths(["a.txt"], ["a.txt", "b.txt"])).toEqual(["b.txt"]);
  });

  it("returns completion git state issues for branch and PR problems", () => {
    expect(
      getCompletionGitStateIssue(
        {
          branch: "feature",
          branchStatus: "",
          hasTaskCommit: false,
          newDirtyPaths: ["src/a.ts"],
          prUrl: "",
          upstream: "origin/feature",
        },
        defaultActions,
      ),
    ).toMatchObject({ title: "New uncommitted changes remain since task start:" });

    expect(
      getCompletionGitStateIssue(
        {
          branch: "main",
          branchStatus: "",
          hasTaskCommit: true,
          newDirtyPaths: [],
          prUrl: "https://example.test/pr/1",
          upstream: "origin/main",
        },
        defaultActions,
      ),
    ).toMatchObject({ title: "Committed task work is on main." });

    expect(
      getCompletionGitStateIssue(
        {
          branch: "feature",
          branchStatus: "",
          hasTaskCommit: true,
          newDirtyPaths: [],
          prUrl: "",
          upstream: "",
        },
        defaultActions,
      ),
    ).toMatchObject({
      title: "No pull request URL found.",
    });
  });
  it("builds dirty file guidance for task-owned changes without staging unrelated work", () => {
    const issue = getCompletionGitStateIssue(
      {
        branch: "feature",
        branchStatus: "",
        hasTaskCommit: false,
        newDirtyPaths: ["task-dirty.txt"],
        prUrl: "",
        upstream: "origin/feature",
      },
      defaultActions,
    );

    expect(issue).toMatchObject({
      title: "New uncommitted changes remain since task start:",
      nextAction:
        "Commit only task-owned changes. Then push, create or update the PR, and finish again.",
    });
    expect(issue?.reason).toContain("task-dirty.txt");
    expect(issue?.reason).toContain("Commit only task-owned changes.");
    expect(issue?.reason).toContain("Do not stage or commit unrelated pre-existing dirty changes.");
    expect(issue?.reason).toContain("Then push, create or update the PR, and finish again.");
  });

  it("distinguishes task-owned dirty paths from pre-existing dirty paths", () => {
    expect(getCreatedDirtyPaths(["pre-existing.txt"], ["pre-existing.txt"])).toEqual([]);
    expect(
      getCreatedDirtyPaths(["pre-existing.txt"], ["pre-existing.txt", "task-dirty.txt"]),
    ).toEqual(["task-dirty.txt"]);
  });

  it("preserves important verify failure lines while compacting noisy output", () => {
    const lines = Array.from({ length: 140 }, (_, index) => `noise ${index}`);
    lines[4] = "src/app/app.tsx:100: error TS2322: type mismatch";
    lines[45] = "Biome checked 12 files in 7ms.";
    lines[84] = "Playwright timeout after 30000ms";
    lines[104] = "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL";

    const compacted = compactOutput(lines.join("\n"));

    expect(compacted).toContain("error TS2322:");
    expect(compacted).toContain("Biome checked 12 files");
    expect(compacted).toContain("Playwright timeout");
    expect(compacted).toContain("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL");
    expect(compacted).toContain("... omitted");
  });

  it("allows completion after a final report payload has been requested", () => {
    const context = { hasTaskCommit: true, newDirtyPaths: [] };
    const finalReportPayload = {
      messages: [
        {
          role: "assistant",
          content: "PR: https://example.test/pr/1\nReview Notes: none\n残作業: none",
        },
      ],
    };

    expect(shouldSkipVerification(context, false)).toBe(false);
    expect(isFinalReportResponse(finalReportPayload)).toBe(true);
    expect(shouldSkipVerification(context, true)).toBe(true);
  });
});
