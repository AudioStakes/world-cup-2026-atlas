import { countryId, matchId } from "../domain/ids";
import type { MatchStatus } from "../domain/types";
import type { MatchResultProvider, MatchResultsSnapshot, SnapshotMatchResult } from "./types";

const matchStatuses = new Set<MatchStatus>([
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
  "suspended",
  "abandoned",
  "unknown",
]);

const providers = new Set<MatchResultProvider>(["api-football", "manual"]);

export function parseMatchResultsSnapshot(input: unknown): MatchResultsSnapshot | null {
  if (!isRecord(input)) {
    return null;
  }

  const schemaVersion = getRecordValue(input, "schemaVersion");
  const provider = getRecordValue(input, "provider");
  const fetchedAt = getRecordValue(input, "fetchedAt");
  const snapshotMatches = getRecordValue(input, "matches");
  const isFallback = getRecordValue(input, "isFallback");

  if (schemaVersion !== 1 || !providers.has(provider as MatchResultProvider)) {
    return null;
  }

  if (typeof fetchedAt !== "string" || Number.isNaN(Date.parse(fetchedAt))) {
    return null;
  }

  if (!Array.isArray(snapshotMatches)) {
    return null;
  }

  const matches: SnapshotMatchResult[] = [];

  for (const match of snapshotMatches) {
    const parsedMatch = parseSnapshotMatchResult(match);

    if (!parsedMatch) {
      return null;
    }

    matches.push(parsedMatch);
  }

  return {
    schemaVersion: 1,
    provider: provider as MatchResultProvider,
    fetchedAt,
    matches,
    ...(isFallback === true ? { isFallback: true } : {}),
  };
}

function parseSnapshotMatchResult(input: unknown): SnapshotMatchResult | null {
  if (!isRecord(input)) {
    return null;
  }

  const snapshotMatchId = getRecordValue(input, "matchId");
  const provider = getRecordValue(input, "provider");
  const providerFixtureId = getRecordValue(input, "providerFixtureId");
  const status = getRecordValue(input, "status");
  const shortStatus = getRecordValue(input, "shortStatus");
  const elapsed = getRecordValue(input, "elapsed");
  const homeTeamId = getRecordValue(input, "homeTeamId");
  const awayTeamId = getRecordValue(input, "awayTeamId");
  const homeScore = getRecordValue(input, "homeScore");
  const awayScore = getRecordValue(input, "awayScore");
  const kickoffAt = getRecordValue(input, "kickoffAt");
  const updatedAt = getRecordValue(input, "updatedAt");

  if (
    typeof snapshotMatchId !== "string" ||
    snapshotMatchId.length === 0 ||
    provider !== "api-football" ||
    !isNonNegativeInteger(providerFixtureId) ||
    typeof shortStatus !== "string" ||
    !matchStatuses.has(status as MatchStatus) ||
    !isNullableNonNegativeInteger(elapsed) ||
    !isNullableCountryId(homeTeamId) ||
    !isNullableCountryId(awayTeamId) ||
    !isNullableNonNegativeInteger(homeScore) ||
    !isNullableNonNegativeInteger(awayScore) ||
    typeof kickoffAt !== "string" ||
    Number.isNaN(Date.parse(kickoffAt)) ||
    typeof updatedAt !== "string" ||
    Number.isNaN(Date.parse(updatedAt))
  ) {
    return null;
  }

  return {
    matchId: matchId(snapshotMatchId),
    provider: "api-football",
    providerFixtureId,
    status: status as MatchStatus,
    shortStatus,
    elapsed,
    homeTeamId: homeTeamId === null ? null : countryId(homeTeamId),
    awayTeamId: awayTeamId === null ? null : countryId(awayTeamId),
    homeScore,
    awayScore,
    kickoffAt,
    updatedAt,
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function getRecordValue(input: Record<string, unknown>, key: string): unknown {
  return input[key];
}

function isNonNegativeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isInteger(input) && input >= 0;
}

function isNullableNonNegativeInteger(input: unknown): input is number | null {
  return input === null || isNonNegativeInteger(input);
}

function isNullableCountryId(input: unknown): input is string | null {
  return input === null || (typeof input === "string" && input.length > 0);
}
