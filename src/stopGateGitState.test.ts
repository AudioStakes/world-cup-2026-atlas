import { describe, expect, it } from "vitest";

import { getCompletionGitStateIssue } from "../.codex/hooks/stop_gate_core.mjs";

const defaultActions = {
  agentLoadReport: true,
  autoCommit: true,
  autoPushPr: true,
};

describe("stop_gate.mjs git state checks", () => {
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
