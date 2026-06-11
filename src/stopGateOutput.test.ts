import { describe, expect, it } from "vitest";

import {
  buildBlockResponse,
  compactOutput,
  formatHookJson,
} from "../.codex/hooks/stop_gate_core.mjs";

describe("stop gate output", () => {
  it("prints valid hook JSON and does not include stderr content on success", () => {
    const stdout = formatHookJson({ continue: true });

    expect(JSON.parse(stdout.trim())).toEqual({ continue: true });
    expect(stdout).toMatch(/^\{.*\}\n$/s);
  });

  it("blocks with compact failure output", () => {
    const failureOutput = ["line before", "ERR_PNPM_TEST simulated failure", "line after"].join(
      "\n",
    );
    const response = buildBlockResponse(
      "Completion is blocked.",
      ["Reason:", "pnpm fix failed with exit code 1.", "", compactOutput(failureOutput)].join("\n"),
    );
    const stdout = formatHookJson(response);

    expect(JSON.parse(stdout.trim())).toMatchObject({
      decision: "block",
      reason: expect.stringContaining("pnpm fix failed"),
    });
    expect(stdout).toContain("ERR_PNPM_TEST simulated failure");
    expect(stdout).not.toContain("Full log:");
  });
});
