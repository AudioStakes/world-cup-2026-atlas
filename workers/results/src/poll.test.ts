import { describe, expect, it, vi } from "vitest";
import { matchId } from "../../../src/domain/ids";
import {
  createRequestCountKey,
  lastFetchedAtKey,
  lastKnownGoodSnapshotKey,
  latestSnapshotKey,
  pollStatusKey,
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

    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      schemaVersion: 1,
      checkedAt: "2026-06-11T19:00:00.000Z",
      result: "success",
      decision: {
        shouldPoll: true,
        reason: "active",
        activeDates: ["2026-06-11"],
      },
      requestCountKey: "match-results/request-count/2026-06-11",
      requestCountBefore: 0,
      attemptedProviderRequests: 1,
      writtenMatches: 1,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:00:00.000Z",
      errorMessage: null,
    });
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

    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      result: "success",
      attemptedProviderRequests: 1,
      writtenMatches: 0,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:00:00.000Z",
      errorMessage: null,
    });
  });

  it("counts only matches written by the current provider poll", async () => {
    const existingSnapshot = {
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-11T19:00:00.000Z",
      matches: [
        {
          matchId: "match-001",
          provider: "api-football",
          providerFixtureId: 1001,
          status: "finished",
          shortStatus: "FT",
          elapsed: 90,
          homeTeamId: null,
          awayTeamId: null,
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T19:00:00.000Z",
          updatedAt: "2026-06-11T21:00:00.000Z",
        },
      ],
    };
    const kv = createFakeKv(new Map([[latestSnapshotKey, JSON.stringify(existingSnapshot)]]));
    const fetchFixturesByDate = vi.fn(async () => ({
      errors: [],
      response: [
        {
          fixture: {
            id: 9999,
            date: "2026-06-11T19:00:00+00:00",
            status: { short: "1H", elapsed: 12 },
          },
          goals: { home: 0, away: 0 },
        },
      ],
    }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:30:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map(),
    });

    expect(JSON.parse(kv.values.get(latestSnapshotKey) ?? "{}")).toMatchObject({
      provider: "api-football",
      fetchedAt: "2026-06-11T19:30:00.000Z",
      matches: existingSnapshot.matches,
    });
    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      result: "success",
      attemptedProviderRequests: 1,
      writtenMatches: 0,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:30:00.000Z",
    });
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
    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      checkedAt: "2026-06-01T00:00:00.000Z",
      result: "skipped",
      decision: {
        shouldPoll: false,
        reason: "outside-window",
        activeDates: [],
      },
      requestCountKey: "match-results/request-count/2026-06-01",
      requestCountBefore: 0,
      attemptedProviderRequests: 0,
      writtenMatches: 0,
      latestSnapshotProvider: null,
      latestSnapshotFetchedAt: null,
      errorMessage: null,
    });
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
      throw new Error("Provider unavailable test-api-football-key");
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
      message: "Provider unavailable [redacted]",
    });
    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      checkedAt: "2026-06-11T19:00:00.000Z",
      result: "provider-error",
      decision: {
        shouldPoll: true,
        reason: "active",
        activeDates: ["2026-06-11"],
      },
      requestCountKey: "match-results/request-count/2026-06-11",
      requestCountBefore: 0,
      attemptedProviderRequests: 1,
      writtenMatches: 0,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:00:00.000Z",
      errorMessage: "Provider unavailable [redacted]",
    });
    expect(kv.values.get(pollStatusKey)).not.toContain("test-api-football-key");

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:05:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(fetchFixturesByDate).toHaveBeenCalledOnce();
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      checkedAt: "2026-06-11T19:05:00.000Z",
      result: "skipped",
      decision: {
        shouldPoll: false,
        reason: "interval-not-elapsed",
        activeDates: ["2026-06-11"],
      },
      requestCountBefore: 1,
      attemptedProviderRequests: 0,
      writtenMatches: 0,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:00:00.000Z",
      errorMessage: null,
    });
  });

  it("preserves the original error when provider error diagnostics fail to write", async () => {
    const kv = createFakeKv();
    const failingKv = {
      ...kv,
      put: vi.fn(async (key: string, value: string) => {
        if (key === providerErrorKey) {
          throw new Error("KV write denied test-api-football-key");
        }

        await kv.put(key, value);
      }),
    };
    const fetchFixturesByDate = vi.fn(async () => {
      throw new Error("Provider unavailable test-api-football-key");
    });

    await expect(
      refreshResultsSnapshot({
        env: createFakeEnv(failingKv),
        now: new Date("2026-06-11T19:00:00.000Z"),
        fetchFixturesByDate,
        fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
      }),
    ).rejects.toThrow(
      [
        "Provider poll failed: Provider unavailable [redacted]",
        "Failed to write provider error diagnostics: provider error: KV write denied [redacted]",
      ].join("\n"),
    );

    expect(fetchFixturesByDate).toHaveBeenCalledOnce();
    expect(kv.values.has(providerErrorKey)).toBe(false);
    expect(kv.values.get(lastFetchedAtKey)).toBe("2026-06-11T19:00:00.000Z");
    expect(kv.values.get(createRequestCountKey("2026-06-11"))).toBe("1");
    expect(kv.values.get(pollStatusKey)).toContain("Provider unavailable [redacted]");
    expect(kv.values.get(pollStatusKey)).not.toContain("test-api-football-key");
  });

  it("stores safe provider error details without the full provider response body", async () => {
    const kv = createFakeKv();
    const fetchFixturesByDate = vi.fn(async () => ({
      errors: {
        requests: "League unavailable test-api-football-key",
        account: {
          plan: "free",
          token: "provider-token-should-not-be-stored",
        },
      },
      response: [{ fullProviderBody: "full-body-should-not-be-stored" }],
    }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:00:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    const providerErrorText = kv.values.get(providerErrorKey) ?? "{}";
    const pollStatusText = kv.values.get(pollStatusKey) ?? "{}";
    const providerError = JSON.parse(providerErrorText);
    const pollStatus = JSON.parse(pollStatusText);

    expect(providerError).toMatchObject({
      at: "2026-06-11T19:00:00.000Z",
      message: "API-FOOTBALL returned errors",
      details: {
        kind: "provider-errors",
        errorType: "object",
        errorKeys: ["requests", "account"],
        errorMessages: ["requests: League unavailable [redacted]", "account.plan: free"],
        responseCount: 1,
      },
    });
    expect(pollStatus).toMatchObject({
      result: "provider-error",
      errorMessage: "API-FOOTBALL returned errors",
      errorDetails: providerError.details,
    });
    expect(providerErrorText).not.toContain("test-api-football-key");
    expect(providerErrorText).not.toContain("provider-token-should-not-be-stored");
    expect(providerErrorText).not.toContain("full-body-should-not-be-stored");
    expect(pollStatusText).not.toContain("test-api-football-key");
    expect(pollStatusText).not.toContain("provider-token-should-not-be-stored");
    expect(pollStatusText).not.toContain("full-body-should-not-be-stored");
  });

  it("updates poll status on interval skips without replacing the latest snapshot", async () => {
    const existingSnapshot = {
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-11T19:00:00.000Z",
      matches: [],
    };
    const kv = createFakeKv(
      new Map([
        [latestSnapshotKey, JSON.stringify(existingSnapshot)],
        [lastFetchedAtKey, "2026-06-11T19:00:00.000Z"],
        [createRequestCountKey("2026-06-11"), "1"],
      ]),
    );
    const fetchFixturesByDate = vi.fn(async () => ({ errors: [], response: [] }));

    await refreshResultsSnapshot({
      env: createFakeEnv(kv),
      now: new Date("2026-06-11T19:05:00.000Z"),
      fetchFixturesByDate,
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
    });

    expect(fetchFixturesByDate).not.toHaveBeenCalled();
    expect(JSON.parse(kv.values.get(latestSnapshotKey) ?? "{}")).toEqual(existingSnapshot);
    expect(JSON.parse(kv.values.get(pollStatusKey) ?? "{}")).toMatchObject({
      checkedAt: "2026-06-11T19:05:00.000Z",
      result: "skipped",
      decision: {
        shouldPoll: false,
        reason: "interval-not-elapsed",
        activeDates: ["2026-06-11"],
      },
      requestCountKey: "match-results/request-count/2026-06-11",
      requestCountBefore: 1,
      attemptedProviderRequests: 0,
      writtenMatches: 0,
      latestSnapshotProvider: "api-football",
      latestSnapshotFetchedAt: "2026-06-11T19:00:00.000Z",
      errorMessage: null,
    });
  });
});
