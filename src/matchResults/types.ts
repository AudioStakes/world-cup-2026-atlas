import type { CountryId, MatchId } from "../domain/ids";
import type { ApiFootballShortStatus, MatchStatus } from "../domain/types";

export type MatchResultProvider = "api-football" | "manual";

export type SnapshotMatchResult = {
  readonly matchId: MatchId;
  readonly provider: "api-football";
  readonly providerFixtureId: number;
  readonly status: MatchStatus;
  readonly shortStatus: ApiFootballShortStatus;
  readonly elapsed: number | null;
  readonly homeTeamId: CountryId | null;
  readonly awayTeamId: CountryId | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly kickoffAt: string;
  readonly updatedAt: string;
};

export type MatchResultsSnapshot = {
  readonly schemaVersion: 1;
  readonly provider: MatchResultProvider;
  readonly fetchedAt: string;
  readonly matches: readonly SnapshotMatchResult[];
  readonly isFallback?: boolean;
};
