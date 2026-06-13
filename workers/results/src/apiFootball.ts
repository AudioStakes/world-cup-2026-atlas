import { getParticipantCountryId } from "../../../src/data/matchParticipants";
import type { MatchId } from "../../../src/domain/ids";
import type { AppData } from "../../../src/domain/types";
import { normalizeApiFootballStatus } from "../../../src/matchResults/normalizeApiFootballStatus";
import type { SnapshotMatchResult } from "../../../src/matchResults/types";
import type { WorkerEnv } from "./workerTypes";

type ApiFootballFixture = {
  readonly fixture: {
    readonly id: number;
    readonly date: string;
    readonly status: {
      readonly short: string;
      readonly elapsed: number | null;
    };
  };
  readonly goals: {
    readonly home: number | null;
    readonly away: number | null;
  };
};

export async function fetchApiFootballFixturesByDate(
  env: WorkerEnv,
  date: string,
): Promise<unknown> {
  const baseUrl = env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io";
  const url = new URL("/fixtures", baseUrl);

  url.searchParams.set("league", env.API_FOOTBALL_LEAGUE_ID ?? "1");
  url.searchParams.set("season", env.API_FOOTBALL_SEASON ?? "2026");
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", "UTC");

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": env.API_FOOTBALL_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-FOOTBALL request failed with ${response.status}`);
  }

  return response.json();
}

export function normalizeApiFootballFixturesResponse(input: {
  readonly appData: AppData;
  readonly fixtureIdToMatchId: ReadonlyMap<number, MatchId>;
  readonly response: unknown;
  readonly updatedAt: string;
}): readonly SnapshotMatchResult[] {
  const fixtures = parseApiFootballFixturesResponse(input.response);
  const matchesById = new Map(input.appData.matches.map((match) => [match.id, match]));
  const results: SnapshotMatchResult[] = [];

  for (const fixture of fixtures) {
    const matchId = input.fixtureIdToMatchId.get(fixture.fixture.id);
    const match = matchId ? matchesById.get(matchId) : null;

    if (!matchId || !match) {
      continue;
    }

    const status = normalizeApiFootballStatus(fixture.fixture.status.short);

    if (status === "finished" && (fixture.goals.home === null || fixture.goals.away === null)) {
      continue;
    }

    results.push({
      matchId,
      provider: "api-football",
      providerFixtureId: fixture.fixture.id,
      status,
      shortStatus: fixture.fixture.status.short,
      elapsed: fixture.fixture.status.elapsed,
      homeTeamId: getParticipantCountryId(match.homeParticipant) ?? null,
      awayTeamId: getParticipantCountryId(match.awayParticipant) ?? null,
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away,
      kickoffAt: fixture.fixture.date,
      updatedAt: input.updatedAt,
    });
  }

  return results;
}

function parseApiFootballFixturesResponse(input: unknown): readonly ApiFootballFixture[] {
  if (!isRecord(input)) {
    throw new Error("Invalid API-FOOTBALL fixtures response");
  }

  const response = getRecordValue(input, "response");
  const errors = getRecordValue(input, "errors");

  if (!Array.isArray(response)) {
    throw new Error("Invalid API-FOOTBALL fixtures response");
  }

  if (hasProviderErrors(errors)) {
    throw new Error("API-FOOTBALL returned errors");
  }

  const fixtures: ApiFootballFixture[] = [];

  for (const fixture of response) {
    const parsedFixture = parseApiFootballFixture(fixture);

    if (parsedFixture) {
      fixtures.push(parsedFixture);
    }
  }

  return fixtures;
}

function parseApiFootballFixture(input: unknown): ApiFootballFixture | null {
  if (!isRecord(input)) {
    return null;
  }

  const fixture = getRecordValue(input, "fixture");
  const goals = getRecordValue(input, "goals");

  if (!isRecord(fixture) || !isRecord(goals)) {
    return null;
  }

  const status = getRecordValue(fixture, "status");
  const fixtureId = getRecordValue(fixture, "id");
  const fixtureDate = getRecordValue(fixture, "date");
  const homeGoals = getRecordValue(goals, "home");
  const awayGoals = getRecordValue(goals, "away");

  if (!isRecord(status)) {
    return null;
  }

  const shortStatus = getRecordValue(status, "short");
  const elapsed = getRecordValue(status, "elapsed");

  if (
    !isNonNegativeInteger(fixtureId) ||
    typeof fixtureDate !== "string" ||
    Number.isNaN(Date.parse(fixtureDate)) ||
    typeof shortStatus !== "string" ||
    !isNullableNonNegativeInteger(elapsed) ||
    !isNullableNonNegativeInteger(homeGoals) ||
    !isNullableNonNegativeInteger(awayGoals)
  ) {
    return null;
  }

  return {
    fixture: {
      id: fixtureId,
      date: fixtureDate,
      status: {
        short: shortStatus,
        elapsed,
      },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
  };
}

function hasProviderErrors(input: unknown): boolean {
  if (Array.isArray(input)) {
    return input.length > 0;
  }

  if (isRecord(input)) {
    return Object.keys(input).length > 0;
  }

  return typeof input === "string" && input.length > 0;
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
