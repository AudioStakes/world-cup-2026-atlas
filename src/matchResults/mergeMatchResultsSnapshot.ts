import type { AppData, MatchResult } from "../domain/types";
import type { MatchResultsSnapshot } from "./types";

export function mergeMatchResultsSnapshot(
  data: AppData,
  snapshot: MatchResultsSnapshot | null,
): AppData {
  if (!snapshot || snapshot.matches.length === 0) {
    return data;
  }

  const resultsByMatchId = new Map(snapshot.matches.map((result) => [result.matchId, result]));

  return {
    ...data,
    matches: data.matches.map((match) => {
      const snapshotResult = resultsByMatchId.get(match.id);

      if (!snapshotResult) {
        return match;
      }

      const result: MatchResult = {
        provider: "api-football",
        providerFixtureId: snapshotResult.providerFixtureId,
        status: snapshotResult.status,
        shortStatus: snapshotResult.shortStatus,
        elapsed: snapshotResult.elapsed,
        homeGoals: snapshotResult.homeScore,
        awayGoals: snapshotResult.awayScore,
        kickoffAt: snapshotResult.kickoffAt,
        updatedAt: snapshotResult.updatedAt,
      };

      return {
        ...match,
        result,
      };
    }),
  };
}
