import { afterEach, describe, expect, it, vi } from "vitest";
import { matchId } from "../../../src/domain/ids";
import {
  type ApiFootballProviderError,
  createApiFootballProviderErrorDetails,
  fetchApiFootballFixturesByDate,
  normalizeApiFootballFixturesResponse,
} from "./apiFootball";
import { createFakeEnv, createFakeKv } from "./testHelpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API-FOOTBALL adapter", () => {
  it("requests fixtures by date with the API key only in Worker headers", async () => {
    const fetchMock = vi.fn(async () => Response.json({ response: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchApiFootballFixturesByDate(createFakeEnv(createFakeKv()), "2026-06-11");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=2026-06-11&timezone=UTC",
      }),
      {
        headers: {
          "x-apisports-key": "test-api-football-key",
        },
      },
    );
  });

  it("summarizes provider errors across response shapes without secrets", () => {
    const stringDetails = createApiFootballProviderErrorDetails({
      errors: "Invalid season test-api-football-key",
      response: [],
      secrets: ["test-api-football-key"],
    });
    const arrayDetails = createApiFootballProviderErrorDetails({
      errors: ["Rate limit exceeded", { detail: "Plan does not include endpoint" }],
      response: [{ fullBody: "must not be stored" }],
    });
    const objectDetails = createApiFootballProviderErrorDetails({
      errors: {
        requests: "League or season is unavailable",
        account: { plan: "free", token: "secret-token" },
        "x-apisports-key": "test-api-football-key",
      },
      response: [],
      request: {
        league: "1",
        season: "2026",
        date: "2026-06-14",
        timezone: "UTC",
      },
      secrets: ["test-api-football-key"],
      status: 200,
    });

    expect(stringDetails).toMatchObject({
      kind: "provider-errors",
      errorType: "string",
      errorMessages: ["Invalid season [redacted]"],
      responseCount: 0,
    });
    expect(arrayDetails).toMatchObject({
      errorType: "array",
      errorMessages: ["Rate limit exceeded", "detail: Plan does not include endpoint"],
      responseCount: 1,
    });
    expect(objectDetails).toMatchObject({
      errorType: "object",
      errorKeys: ["requests", "account", "x-apisports-key"],
      errorMessages: ["requests: League or season is unavailable", "account.plan: free"],
      responseCount: 0,
      httpStatus: 200,
      request: {
        league: "1",
        season: "2026",
        date: "2026-06-14",
        timezone: "UTC",
      },
    });

    const serialized = JSON.stringify([stringDetails, arrayDetails, objectDetails]);

    expect(serialized).not.toContain("test-api-football-key");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("must not be stored");
  });

  it("throws provider errors with request diagnostics but without headers", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        errors: { requests: "No fixtures for this competition" },
        response: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchApiFootballFixturesByDate(createFakeEnv(createFakeKv()), "2026-06-14"),
    ).rejects.toMatchObject({
      name: "ApiFootballProviderError",
      message: "API-FOOTBALL returned errors",
      details: {
        kind: "provider-errors",
        errorKeys: ["requests"],
        errorMessages: ["requests: No fixtures for this competition"],
        responseCount: 0,
        httpStatus: 200,
        request: {
          league: "1",
          season: "2026",
          date: "2026-06-14",
          timezone: "UTC",
        },
      },
    } satisfies Partial<ApiFootballProviderError>);
  });

  it("normalizes mapped fixture rows and preserves short status", () => {
    const results = normalizeApiFootballFixturesResponse({
      appData: {
        countries: [],
        groups: [],
        slotEntries: [],
        venues: [],
        matches: [
          {
            id: matchId("match-001"),
            matchNumber: 1,
            stage: "group",
            date: "2026-06-11" as never,
            kickoffLocal: "13:00" as never,
            groupCode: "A" as never,
            venueId: "mexico-city" as never,
            homeParticipant: { type: "slot", slotId: "A1" as never, countryId: "mex" as never },
            awayParticipant: { type: "slot", slotId: "A2" as never, countryId: "rsa" as never },
            dataStatus: "provisional",
          },
        ],
      },
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
      response: {
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
      },
      updatedAt: "2026-06-11T21:00:00.000Z",
    });

    expect(results).toEqual([
      expect.objectContaining({
        matchId: "match-001",
        providerFixtureId: 1001,
        status: "finished",
        shortStatus: "FT",
        homeScore: 2,
        awayScore: 0,
      }),
    ]);
  });

  it("ignores unknown provider fixture ids", () => {
    const results = normalizeApiFootballFixturesResponse({
      appData: {
        countries: [],
        groups: [],
        slotEntries: [],
        venues: [],
        matches: [
          {
            id: matchId("match-001"),
            matchNumber: 1,
            stage: "group",
            date: "2026-06-11" as never,
            kickoffLocal: "13:00" as never,
            groupCode: "A" as never,
            venueId: "mexico-city" as never,
            homeParticipant: { type: "slot", slotId: "A1" as never, countryId: "mex" as never },
            awayParticipant: { type: "slot", slotId: "A2" as never, countryId: "rsa" as never },
            dataStatus: "provisional",
          },
        ],
      },
      fixtureIdToMatchId: new Map([[1001, matchId("match-001")]]),
      response: {
        errors: [],
        response: [
          {
            fixture: {
              id: 9999,
              date: "2026-06-11T19:00:00+00:00",
              status: { short: "FT", elapsed: 90 },
            },
            goals: { home: 2, away: 0 },
          },
        ],
      },
      updatedAt: "2026-06-11T21:00:00.000Z",
    });

    expect(results).toEqual([]);
  });
});
