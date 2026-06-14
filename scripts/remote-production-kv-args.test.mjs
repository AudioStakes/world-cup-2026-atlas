// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createRemoteProductionKvGetArgs,
  createRemoteProductionKvPutArgs,
} from "./remote-production-kv-args.mjs";

describe("remote production KV Wrangler args", () => {
  it("builds get commands for the production RESULTS_KV namespace", () => {
    expect(createRemoteProductionKvGetArgs("match-results/latest.json")).toEqual([
      "kv",
      "key",
      "get",
      "match-results/latest.json",
      "--binding",
      "RESULTS_KV",
      "--remote",
      "--preview",
      "false",
      "--text",
      "--config",
      "wrangler.toml",
    ]);
  });

  it("builds put commands for the production RESULTS_KV namespace", () => {
    expect(
      createRemoteProductionKvPutArgs("match-results/diagnostics/write-probe.json", {
        path: "/tmp/value.txt",
      }),
    ).toEqual([
      "kv",
      "key",
      "put",
      "match-results/diagnostics/write-probe.json",
      "--path",
      "/tmp/value.txt",
      "--binding",
      "RESULTS_KV",
      "--remote",
      "--preview",
      "false",
      "--config",
      "wrangler.toml",
    ]);
  });
});
