import { type MatchId, matchId } from "../../../src/domain/ids";

export type ApiFootballFixtureMapping = {
  readonly providerFixtureId: number;
  readonly matchId: MatchId;
};

// Populate this list after confirming API-FOOTBALL fixture IDs for FIFA World Cup 2026.
// The Worker omits unmapped provider fixtures rather than guessing and risking a wrong score.
export const apiFootballFixtureMappings: readonly ApiFootballFixtureMapping[] = [];

export function createProviderFixtureMap(
  mappings: readonly ApiFootballFixtureMapping[] = apiFootballFixtureMappings,
): ReadonlyMap<number, MatchId> {
  return new Map(mappings.map((mapping) => [mapping.providerFixtureId, mapping.matchId]));
}

export function createApiFootballFixtureMapping(
  providerFixtureId: number,
  internalMatchId: string,
): ApiFootballFixtureMapping {
  return {
    providerFixtureId,
    matchId: matchId(internalMatchId),
  };
}
