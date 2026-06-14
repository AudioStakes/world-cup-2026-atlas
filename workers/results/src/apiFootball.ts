import { getParticipantCountryId } from "../../../src/data/matchParticipants";
import type { MatchId } from "../../../src/domain/ids";
import type { AppData } from "../../../src/domain/types";
import { normalizeApiFootballStatus } from "../../../src/matchResults/normalizeApiFootballStatus";
import type { SnapshotMatchResult } from "../../../src/matchResults/types";
import type { WorkerEnv } from "./workerTypes";

const PROVIDER_ERRORS_MESSAGE = "API-FOOTBALL returned errors";
const MAX_ERROR_KEYS = 12;
const MAX_ERROR_MESSAGES = 8;
const MAX_ERROR_MESSAGE_LENGTH = 180;

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

export type ApiFootballProviderErrorDetails = {
  readonly kind: "provider-errors" | "http-error";
  readonly errorType?: string;
  readonly errorKeys?: readonly string[];
  readonly errorMessages?: readonly string[];
  readonly responseCount?: number;
  readonly httpStatus?: number;
  readonly request?: {
    readonly league?: string;
    readonly season?: string;
    readonly date?: string;
    readonly timezone?: string;
  };
};

export class ApiFootballProviderError extends Error {
  readonly details: ApiFootballProviderErrorDetails;

  constructor(message: string, details: ApiFootballProviderErrorDetails) {
    super(message);
    this.name = "ApiFootballProviderError";
    this.details = details;
  }
}

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
  const request = createProviderRequestSummary(url);

  if (!response.ok) {
    throw new ApiFootballProviderError(`API-FOOTBALL request failed with ${response.status}`, {
      kind: "http-error",
      httpStatus: response.status,
      request,
    });
  }

  const body = await response.json();

  const providerErrors = isRecord(body) ? getRecordValue(body, "errors") : null;

  if (hasProviderErrors(providerErrors)) {
    throw new ApiFootballProviderError(
      PROVIDER_ERRORS_MESSAGE,
      createApiFootballProviderErrorDetails({
        errors: providerErrors,
        request,
        ...(isRecord(body) ? { response: getRecordValue(body, "response") } : {}),
        secrets: [env.API_FOOTBALL_KEY],
        status: response.status,
      }),
    );
  }

  return body;
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
    throw new ApiFootballProviderError(
      PROVIDER_ERRORS_MESSAGE,
      createApiFootballProviderErrorDetails({ errors, response }),
    );
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

export function createApiFootballProviderErrorDetails(input: {
  readonly errors: unknown;
  readonly request?: ApiFootballProviderErrorDetails["request"];
  readonly response?: unknown;
  readonly secrets?: readonly (string | undefined)[];
  readonly status?: number;
}): ApiFootballProviderErrorDetails {
  const errorKeys = isRecord(input.errors)
    ? Object.keys(input.errors).slice(0, MAX_ERROR_KEYS)
    : undefined;
  const errorMessages = collectProviderErrorMessages(input.errors, input.secrets ?? []);
  const responseCount = Array.isArray(input.response) ? input.response.length : undefined;

  return {
    kind: "provider-errors",
    errorType: getProviderErrorType(input.errors),
    ...(errorKeys && errorKeys.length > 0 ? { errorKeys } : {}),
    ...(errorMessages.length > 0 ? { errorMessages } : {}),
    ...(responseCount !== undefined ? { responseCount } : {}),
    ...(input.status !== undefined ? { httpStatus: input.status } : {}),
    ...(input.request ? { request: input.request } : {}),
  };
}

function createProviderRequestSummary(
  url: URL,
): NonNullable<ApiFootballProviderErrorDetails["request"]> {
  const request: {
    league?: string;
    season?: string;
    date?: string;
    timezone?: string;
  } = {};

  for (const key of ["league", "season", "date", "timezone"] as const) {
    const value = url.searchParams.get(key);

    if (value !== null) {
      request[key] = value;
    }
  }

  return request;
}

function getProviderErrorType(input: unknown): string {
  if (Array.isArray(input)) {
    return "array";
  }

  if (input === null) {
    return "null";
  }

  return typeof input;
}

function collectProviderErrorMessages(
  input: unknown,
  secrets: readonly (string | undefined)[],
): readonly string[] {
  const messages: string[] = [];

  collectProviderErrorMessagesInto(input, messages, secrets);

  return messages.slice(0, MAX_ERROR_MESSAGES);
}

function collectProviderErrorMessagesInto(
  input: unknown,
  messages: string[],
  secrets: readonly (string | undefined)[],
  path = "",
): void {
  if (messages.length >= MAX_ERROR_MESSAGES || input === null || input === undefined) {
    return;
  }

  if (typeof input === "string") {
    const message = sanitizeProviderErrorString(input, secrets);

    if (message) {
      messages.push(path ? `${path}: ${message}` : message);
    }

    return;
  }

  if (Array.isArray(input)) {
    for (let index = 0; index < input.length && messages.length < MAX_ERROR_MESSAGES; index += 1) {
      collectProviderErrorMessagesInto(input[index], messages, secrets, path);
    }

    return;
  }

  if (isRecord(input)) {
    for (const [key, value] of Object.entries(input)) {
      if (messages.length >= MAX_ERROR_MESSAGES) {
        return;
      }

      if (isSensitiveProviderErrorKey(key)) {
        continue;
      }

      collectProviderErrorMessagesInto(value, messages, secrets, path ? `${path}.${key}` : key);
    }
  }
}

function sanitizeProviderErrorString(
  input: string,
  secrets: readonly (string | undefined)[],
): string | null {
  let value = input.trim();

  if (value.length === 0) {
    return null;
  }

  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      value = value.replaceAll(secret, "[redacted]");
    }
  }

  value = value.replaceAll(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
  value = value.replaceAll(/x-apisports-key\s*[:=]\s*\S+/gi, "x-apisports-key=[redacted]");

  return value.length <= MAX_ERROR_MESSAGE_LENGTH
    ? value
    : `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`;
}

function isSensitiveProviderErrorKey(key: string): boolean {
  return /api[-_]?key|x-apisports-key|token|secret|authorization|auth|password|credential|header/i.test(
    key,
  );
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
