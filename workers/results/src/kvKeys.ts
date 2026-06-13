export const latestSnapshotKey = "match-results/latest.json";
export const lastKnownGoodSnapshotKey = "match-results/last-known-good.json";
export const lastFetchedAtKey = "match-results/last-fetched-at";
export const providerErrorKey = "match-results/provider-error/latest.json";

export function createRequestCountKey(date: string): string {
  return `match-results/request-count/${date}`;
}
