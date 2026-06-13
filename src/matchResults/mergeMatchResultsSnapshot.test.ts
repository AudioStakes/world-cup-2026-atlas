import { describe, expect, it } from "vitest";
import { appData } from "../data/appData";
import { matchId } from "../domain/ids";
import { mergeMatchResultsSnapshot } from "./mergeMatchResultsSnapshot";
import type { MatchResultsSnapshot } from "./types";

const snapshot: MatchResultsSnapshot = {
  schemaVersion: 1,
  provider: "api-football",
  fetchedAt: "2026-06-11T20:00:00.000Z",
  matches: [
    {
      matchId: matchId("match-001"),
      provider: "api-football",
      providerFixtureId: 1001,
      status: "live",
      shortStatus: "1H",
      elapsed: 38,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 1,
      awayScore: 0,
      kickoffAt: "2026-06-11T18:00:00.000Z",
      updatedAt: "2026-06-11T18:38:00.000Z",
    },
  ],
};

describe("mergeMatchResultsSnapshot", () => {
  it("overlays normalized provider results onto matching static matches", () => {
    const data = mergeMatchResultsSnapshot(appData, snapshot);
    const match = data.matches.find((candidate) => candidate.id === matchId("match-001"));

    expect(match?.result).toMatchObject({
      provider: "api-football",
      status: "live",
      shortStatus: "1H",
      homeGoals: 1,
      awayGoals: 0,
    });
  });

  it("ignores unknown match ids", () => {
    const [existingResult] = snapshot.matches;

    if (!existingResult) {
      throw new Error("Expected test snapshot to contain a match result");
    }

    const data = mergeMatchResultsSnapshot(appData, {
      ...snapshot,
      matches: [{ ...existingResult, matchId: matchId("unknown-match") }],
    });

    expect(data.matches.some((match) => match.result?.provider === "api-football")).toBe(false);
  });
});
