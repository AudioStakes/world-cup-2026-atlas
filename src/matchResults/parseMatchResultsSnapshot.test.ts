import { describe, expect, it } from "vitest";
import { parseMatchResultsSnapshot } from "./parseMatchResultsSnapshot";

const validSnapshot = {
  schemaVersion: 1,
  provider: "api-football",
  fetchedAt: "2026-06-11T20:00:00.000Z",
  matches: [
    {
      matchId: "match-001",
      provider: "api-football",
      providerFixtureId: 1001,
      status: "finished",
      shortStatus: "FT",
      elapsed: 90,
      homeTeamId: "mex",
      awayTeamId: "rsa",
      homeScore: 2,
      awayScore: 0,
      kickoffAt: "2026-06-11T18:00:00.000Z",
      updatedAt: "2026-06-11T20:00:00.000Z",
    },
  ],
};

describe("parseMatchResultsSnapshot", () => {
  it("accepts a valid normalized snapshot", () => {
    expect(parseMatchResultsSnapshot(validSnapshot)).toMatchObject({
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
  });

  it("rejects unknown internal statuses", () => {
    expect(
      parseMatchResultsSnapshot({
        ...validSnapshot,
        matches: [{ ...validSnapshot.matches[0], status: "in-progress" }],
      }),
    ).toBeNull();
  });

  it("rejects invalid scores", () => {
    expect(
      parseMatchResultsSnapshot({
        ...validSnapshot,
        matches: [{ ...validSnapshot.matches[0], homeScore: -1 }],
      }),
    ).toBeNull();
  });
});
