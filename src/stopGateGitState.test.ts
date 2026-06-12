import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getCompletionGitStateIssue } from "../.codex/hooks/stop_gate_core.mjs";

const defaultActions = {
  agentLoadReport: true,
  autoCommit: true,
  autoPushPr: true,
};

describe("stop_gate.mjs git state checks", () => {
  it("uses the shared core completion git state check in the runtime hook", () => {
    const runtimeHook = readFileSync(".codex/hooks/stop_gate.mjs", "utf8");

    expect(runtimeHook).toContain("getCompletionGitStateIssueCore(context, stopHookActions)");
    expect(runtimeHook).not.toContain("Current branch has no upstream.");
    expect(runtimeHook).not.toContain("Current branch has unpushed commits.");
  });

  it("allows completion without branch upstream when PR head matches local HEAD", () => {
    const context = {
      branch: "codex/example",
      branchStatus: "## codex/example",
      currentHead: "abc123",
      hasTaskCommit: true,
      newDirtyPaths: [],
      prHeadRefOid: "abc123",
      prUrl: "https://example.test/pr/123",
    };

    expect(getCompletionGitStateIssue(context, defaultActions)).toBeNull();
  });

  it("blocks completion when PR head is missing the latest local commit", () => {
    const context = {
      branch: "codex/example",
      branchStatus: "## codex/example...origin/codex/example [ahead 1]",
      currentHead: "abc123",
      hasTaskCommit: true,
      newDirtyPaths: [],
      prHeadRefOid: "def456",
      prUrl: "https://example.test/pr/123",
    };

    expect(getCompletionGitStateIssue(context, defaultActions)).toMatchObject({
      title: "Pull request is missing the latest local commit.",
    });
  });
});
