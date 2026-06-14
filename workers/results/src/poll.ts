import { appData } from "../../../src/data/appData";
import type { MatchId } from "../../../src/domain/ids";
import { parseMatchResultsSnapshot } from "../../../src/matchResults/parseMatchResultsSnapshot";
import type { PollingDecision } from "../../../src/matchResults/pollingPolicy";
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
  pollStatusKey,
  providerErrorKey,
} from "./kvKeys";
import type { WorkerEnv } from "./workerTypes";

type PollStatus = {
  readonly schemaVersion: 1;
  readonly checkedAt: string;
  readonly result: "skipped" | "success" | "provider-error";
  readonly decision: PollingDecision;
  readonly requestCountKey: string;
  readonly requestCountBefore: number;
  readonly attemptedProviderRequests: number;
  readonly writtenMatches: number;
  readonly latestSnapshotProvider: MatchResultsSnapshot["provider"] | null;
  readonly latestSnapshotFetchedAt: string | null;
  readonly errorMessage: string | null;
};

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
  const requestCountBefore = parseRequestCount(requestCountValue);

  if (!decision.shouldPoll) {
    const latestSnapshot = await readLatestSnapshot(input.env);
    await writePollStatus(input.env, {
      checkedAt: nowIso,
      result: "skipped",
      decision,
      requestCountKey,
      requestCountBefore,
      attemptedProviderRequests: 0,
      writtenMatches: 0,
      latestSnapshot,
      errorMessage: null,
    });
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
        String(requestCountBefore + decision.activeDates.length),
      ),
      writePollStatus(input.env, {
        checkedAt: nowIso,
        result: "success",
        decision,
        requestCountKey,
        requestCountBefore,
        attemptedProviderRequests,
        writtenMatches: nextResults.length,
        latestSnapshot: snapshot,
        errorMessage: null,
      }),
    ]);
  } catch (error) {
    const errorMessage = createSafeErrorMessage(error, [input.env.API_FOOTBALL_KEY]);
    let latestSnapshot: MatchResultsSnapshot | null = null;
    const diagnosticsWriteFailures: string[] = [];

    try {
      latestSnapshot = await readLatestSnapshot(input.env);
    } catch (latestSnapshotError) {
      diagnosticsWriteFailures.push(
        `latest snapshot read: ${createSafeErrorMessage(latestSnapshotError, [
          input.env.API_FOOTBALL_KEY,
        ])}`,
      );
    }

    const failedPollWrites: { readonly label: string; readonly promise: Promise<void> }[] = [
      {
        label: "provider error",
        promise: input.env.RESULTS_KV.put(
          providerErrorKey,
          JSON.stringify({
            at: nowIso,
            message: errorMessage,
          }),
        ),
      },
      {
        label: "poll status",
        promise: writePollStatus(input.env, {
          checkedAt: nowIso,
          result: "provider-error",
          decision,
          requestCountKey,
          requestCountBefore,
          attemptedProviderRequests,
          writtenMatches: 0,
          latestSnapshot,
          errorMessage,
        }),
      },
    ];

    if (attemptedProviderRequests > 0) {
      failedPollWrites.push(
        {
          label: "last fetched at",
          promise: input.env.RESULTS_KV.put(lastFetchedAtKey, nowIso),
        },
        {
          label: "request count",
          promise: input.env.RESULTS_KV.put(
            requestCountKey,
            String(requestCountBefore + attemptedProviderRequests),
          ),
        },
      );
    }

    const failedPollWriteResults = await Promise.allSettled(
      failedPollWrites.map((write) => write.promise),
    );

    failedPollWriteResults.forEach((writeResult, index) => {
      if (writeResult.status === "rejected") {
        diagnosticsWriteFailures.push(
          `${failedPollWrites[index]?.label ?? "diagnostics"}: ${createSafeErrorMessage(
            writeResult.reason,
            [input.env.API_FOOTBALL_KEY],
          )}`,
        );
      }
    });

    if (diagnosticsWriteFailures.length > 0) {
      throw new Error(
        [
          `Provider poll failed: ${errorMessage}`,
          `Failed to write provider error diagnostics: ${diagnosticsWriteFailures.join("; ")}`,
        ].join("\n"),
      );
    }
  }
}

async function readLatestSnapshot(env: WorkerEnv): Promise<MatchResultsSnapshot | null> {
  return parseMatchResultsSnapshot(await env.RESULTS_KV.get(latestSnapshotKey, "json"));
}

async function writePollStatus(
  env: WorkerEnv,
  input: {
    readonly checkedAt: string;
    readonly result: PollStatus["result"];
    readonly decision: PollingDecision;
    readonly requestCountKey: string;
    readonly requestCountBefore: number;
    readonly attemptedProviderRequests: number;
    readonly writtenMatches: number;
    readonly latestSnapshot: MatchResultsSnapshot | null;
    readonly errorMessage: string | null;
  },
): Promise<void> {
  const status: PollStatus = {
    schemaVersion: 1,
    checkedAt: input.checkedAt,
    result: input.result,
    decision: input.decision,
    requestCountKey: input.requestCountKey,
    requestCountBefore: input.requestCountBefore,
    attemptedProviderRequests: input.attemptedProviderRequests,
    writtenMatches: input.writtenMatches,
    latestSnapshotProvider: input.latestSnapshot?.provider ?? null,
    latestSnapshotFetchedAt: input.latestSnapshot?.fetchedAt ?? null,
    errorMessage: input.errorMessage,
  };

  await env.RESULTS_KV.put(pollStatusKey, JSON.stringify(status));
}

function createSafeErrorMessage(error: unknown, secrets: readonly (string | undefined)[]): string {
  let message = error instanceof Error ? error.message : "Unknown provider error";

  if (message.length === 0) {
    message = "Unknown provider error";
  }

  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }

  return message.length <= 500 ? message : `${message.slice(0, 500)}...`;
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
