import { fallbackMatchResultsSnapshot } from "../../../src/matchResults/fallbackSnapshot";
import { parseMatchResultsSnapshot } from "../../../src/matchResults/parseMatchResultsSnapshot";
import type { MatchResultsSnapshot } from "../../../src/matchResults/types";
import { lastKnownGoodSnapshotKey, latestSnapshotKey } from "./kvKeys";
import type { WorkerEnv } from "./workerTypes";

export async function readPublicResultsSnapshot(env: WorkerEnv): Promise<MatchResultsSnapshot> {
  const latestSnapshot = await readSnapshot(env, latestSnapshotKey);

  if (latestSnapshot) {
    return latestSnapshot;
  }

  const lastKnownGoodSnapshot = await readSnapshot(env, lastKnownGoodSnapshotKey);

  return lastKnownGoodSnapshot ?? fallbackMatchResultsSnapshot;
}

async function readSnapshot(env: WorkerEnv, key: string): Promise<MatchResultsSnapshot | null> {
  const input = await env.RESULTS_KV.get(key, "json");

  return parseMatchResultsSnapshot(input);
}
