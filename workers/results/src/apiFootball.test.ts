import { describe, expect, it, vi } from "vitest";
import { matchId } from "../../../src/domain/ids";
import {
  fetchApiFootballFixturesByDate,
  normalizeApiFootballFixturesResponse,
} from "./apiFootball";
import { createFakeEnv, createFakeKv } from "./testHelpers";

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

    vi.unstubAllGlobals();
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
});
