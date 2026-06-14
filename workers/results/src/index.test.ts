import { describe, expect, it } from "vitest";
import { fallbackMatchResultsSnapshot } from "../../../src/matchResults/fallbackSnapshot";
import { parseMatchResultsSnapshot } from "../../../src/matchResults/parseMatchResultsSnapshot";
import { handleRequest } from "./index";
import { latestSnapshotKey } from "./kvKeys";
import { createFakeEnv, createFakeKv } from "./testHelpers";

describe("results Worker public endpoint", () => {
  it("returns the latest KV snapshot", async () => {
    const snapshot = {
      schemaVersion: 1,
      provider: "manual",
      fetchedAt: "2026-06-11T00:00:00.000Z",
      matches: [],
    };
    const env = createFakeEnv(
      createFakeKv(new Map([[latestSnapshotKey, JSON.stringify(snapshot)]])),
    );
    const response = await handleRequest(new Request("https://atlas.example/api/results"), env);

    await expect(response.json()).resolves.toEqual(snapshot);
    expect(response.headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("returns the bundled fallback snapshot when KV is empty", async () => {
    const env = createFakeEnv(createFakeKv());
    const response = await handleRequest(new Request("https://atlas.example/api/results"), env);
    const body = await response.json();

    expect(body).toEqual(fallbackMatchResultsSnapshot);
    expect(parseMatchResultsSnapshot(body)).toEqual(fallbackMatchResultsSnapshot);
  });

  it("allows only configured CORS origins", async () => {
    const env = createFakeEnv(createFakeKv());
    const response = await handleRequest(
      new Request("https://atlas.example/api/results", {
        headers: { Origin: "http://localhost:5173" },
      }),
      env,
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });
});
