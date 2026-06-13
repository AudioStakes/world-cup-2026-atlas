import { appData } from "../../../src/data/appData";
import type { MatchId } from "../../../src/domain/ids";
import { parseMatchResultsSnapshot } from "../../../src/matchResults/parseMatchResultsSnapshot";
import { createPollingDecision } from "../../../src/matchResults/pollingPolicy";
import type { MatchResultsSnapshot, SnapshotMatchResult } from "../../../src/matchResults/types";
import {
  fetchApiFootballFixturesByDate,
  normalizeApiFootballFixturesResponse,
} from "./apiFootball";
import { createProviderFixtureMap } from "./apiFootballFixtureMap";
import {
  createRequestCountKey,
  lastFetchedAtKey,
  lastKnownGoodSnapshotKey,
  latestSnapshotKey,
  providerErrorKey,
} from "./kvKeys";
import type { WorkerEnv } from "./workerTypes";

export async function refreshResultsSnapshot(input: {
  readonly env: WorkerEnv;
  readonly now: Date;
  readonly fetchFixturesByDate?: typeof fetchApiFootballFixturesByDate;
  readonly fixtureIdToMatchId?: ReadonlyMap<number, MatchId>;
}): Promise<void> {
  const nowIso = input.now.toISOString();
  const today = nowIso.slice(0, 10);
  const requestCountKey = createRequestCountKey(today);
  const [lastFetchedAtValue, requestCountValue] = await Promise.all([
    input.env.RESULTS_KV.get(lastFetchedAtKey),
    input.env.RESULTS_KV.get(requestCountKey),
  ]);
  const decision = createPollingDecision({
    matches: appData.matches,
    venues: appData.venues,
    now: input.now,
    lastFetchedAt: parseDate(lastFetchedAtValue),
    requestCountToday: parseRequestCount(requestCountValue),
  });

  if (!decision.shouldPoll) {
    return;
  }

  const fetchFixturesByDate = input.fetchFixturesByDate ?? fetchApiFootballFixturesByDate;
  let attemptedProviderRequests = 0;

  try {
    const fixtureIdToMatchId = input.fixtureIdToMatchId ?? createProviderFixtureMap();
    const nextResults: SnapshotMatchResult[] = [];

    for (const activeDate of decision.activeDates) {
      attemptedProviderRequests += 1;
      const response = await fetchFixturesByDate(input.env, activeDate);
      nextResults.push(
        ...normalizeApiFootballFixturesResponse({
          appData,
          fixtureIdToMatchId,
          response,
          updatedAt: nowIso,
        }),
      );
    }

    const existingSnapshot = parseMatchResultsSnapshot(
      await input.env.RESULTS_KV.get(latestSnapshotKey, "json"),
    );
    const snapshot = mergeSnapshotResults(existingSnapshot, nextResults, nowIso);
    const snapshotJson = JSON.stringify(snapshot);

    await Promise.all([
      input.env.RESULTS_KV.put(latestSnapshotKey, snapshotJson),
      input.env.RESULTS_KV.put(lastKnownGoodSnapshotKey, snapshotJson),
      input.env.RESULTS_KV.put(lastFetchedAtKey, nowIso),
      input.env.RESULTS_KV.put(
        requestCountKey,
        String(parseRequestCount(requestCountValue) + decision.activeDates.length),
      ),
    ]);
  } catch (error) {
    const failedPollWrites: Promise<void>[] = [
      input.env.RESULTS_KV.put(
        providerErrorKey,
        JSON.stringify({
          at: nowIso,
          message: error instanceof Error ? error.message : "Unknown provider error",
        }),
      ),
    ];

    if (attemptedProviderRequests > 0) {
      failedPollWrites.push(
        input.env.RESULTS_KV.put(lastFetchedAtKey, nowIso),
        input.env.RESULTS_KV.put(
          requestCountKey,
          String(parseRequestCount(requestCountValue) + attemptedProviderRequests),
        ),
      );
    }

    await Promise.all(failedPollWrites);
  }
}

function mergeSnapshotResults(
  existingSnapshot: MatchResultsSnapshot | null,
  nextResults: readonly SnapshotMatchResult[],
  fetchedAt: string,
): MatchResultsSnapshot {
  const resultsByMatchId = new Map(
    existingSnapshot?.matches.map((result) => [result.matchId, result]) ?? [],
  );

  for (const result of nextResults) {
    resultsByMatchId.set(result.matchId, result);
  }

  return {
    schemaVersion: 1,
    provider: "api-football",
    fetchedAt,
    matches: Array.from(resultsByMatchId.values()).sort((left, right) =>
      left.matchId.localeCompare(right.matchId),
    ),
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequestCount(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}
