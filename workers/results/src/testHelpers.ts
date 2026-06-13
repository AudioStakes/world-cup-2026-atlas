import type { KVNamespace, WorkerEnv } from "./workerTypes";

export function createFakeKv(
  initialValues: ReadonlyMap<string, string> = new Map(),
): KVNamespace & {
  readonly values: Map<string, string>;
} {
  const values = new Map(initialValues);

  return {
    values,
    async get<T = unknown>(key: string, type?: "json"): Promise<T | string | null> {
      const value = values.get(key) ?? null;

      if (value === null || type !== "json") {
        return value;
      }

      return JSON.parse(value) as T;
    },
    async put(key: string, value: string): Promise<void> {
      values.set(key, value);
    },
  };
}

export function createFakeEnv(kv: KVNamespace): WorkerEnv {
  return {
    RESULTS_KV: kv,
    API_FOOTBALL_KEY: "test-api-football-key",
    API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
    API_FOOTBALL_LEAGUE_ID: "1",
    API_FOOTBALL_SEASON: "2026",
    ALLOWED_ORIGINS: "http://localhost:5173",
  };
}
