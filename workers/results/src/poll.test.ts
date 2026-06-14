import { describe, expect, it, vi } from "vitest";
import { matchId } from "../../../src/domain/ids";
import {
  createRequestCountKey,
  lastFetchedAtKey,
  lastKnownGoodSnapshotKey,
  latestSnapshotKey,
  providerErrorKey,
} from "./kvKeys";
import { refreshResultsSnapshot } from "./poll";
import { createFakeEnv, createFakeKv } from "./testHelpers";

describe("refreshResultsSnapshot", () => {
  it("writes a normalized latest snapshot and increments the daily request count", async () => {
    const kv = createFakeKv();
    const fetchFixturesByDate = vi.fn(async () => ({
      errors: [],
      response: [
        {
          fixture: {
            id: 1001,
            date: "2026-06-11T19:00:00+00:00",
            status: { short: "FT", elapsed: 90 },
          },
          goals: { home: 2, away: 0 },
        },
      ],
    }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:00:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(fetchFixturesByDate).toHaveBeenCalledOnce();
    const latestSnapshot = JSON.parse(kv.values.get(latestSnapshotKey) ?? "{}");

    expect(latestSnapshot).toMatchObject({
      provider: "api-football",
      matches: [
        {
          matchId: "match-001",
          shortStatus: "FT",
          homeScore: 2,
          awayScore: 0,
        },
      ],
    });
    expect(JSON.parse(kv.values.get(lastKnownGoodSnapshotKey) ?? "{}")).toEqual(latestSnapshot);
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
  });

  it("writes an empty api-football snapshot when provider fixtures are not mapped", async () => {
    const kv = createFakeKv();
    const fetchFixturesByDate = vi.fn(async () => ({
      errors: [],
      response: [
        {
          fixture: {
            id: 1001,
            date: "2026-06-11T19:00:00+00:00",
            status: { short: "1H", elapsed: 12 },
          },
          goals: { home: 0, away: 0 },
        },
      ],
    }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:00:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map(),
    });

    expect(fetchFixturesByDate).toHaveBeenCalledOnce();
    expect(JSON.parse(kv.values.get(latestSnapshotKey) ?? "{}")).toEqual({
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-11T19:00:00.000Z",
      matches: [],
    });
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
  });

  it("skips provider calls outside active match windows", async () => {
    const kv = createFakeKv();
    const fetchFixturesByDate = vi.fn(async () => ({ errors: [], response: [] }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-01T00:00:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(fetchFixturesByDate).not.toHaveBeenCalled();
    expect(kv.values.has(latestSnapshotKey)).toBe(false);
    expect(kv.values.has(createRequestCountKey("2026-06-01"))).toBe(false);
  });

  it("does not destroy the latest snapshot when provider fetch fails", async () => {
    const existingSnapshot = {
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-11T19:00:00.000Z",
      matches: [],
    };
    const kv = createFakeKv(new Map([[latestSnapshotKey, JSON.stringify(existingSnapshot)]]));
    const fetchFixturesByDate = vi.fn(async () => {
      throw new Error("Provider unavailable");
    });

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:00:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(JSON.parse(kv.values.get(latestSnapshotKey) ?? "{}")).toEqual(existingSnapshot);
    expect(kv.values.get(lastFetchedAtKey)).toBe("2026-06-11T19:00:00.000Z");
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
    expect(JSON.parse(kv.values.get(providerErrorKey) ?? "{}")).toMatchObject({
      at: "2026-06-11T19:00:00.000Z",
      message: "Provider unavailable",
    });

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:05:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(fetchFixturesByDate).toHaveBeenCalledOnce();
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
  });
});
