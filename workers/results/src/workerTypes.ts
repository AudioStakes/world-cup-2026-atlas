export type WorkerEnv = {
  readonly RESULTS_KV: KVNamespace;
  readonly API_FOOTBALL_KEY: string;
  readonly API_FOOTBALL_BASE_URL?: string;
  readonly API_FOOTBALL_LEAGUE_ID?: string;
  readonly API_FOOTBALL_SEASON?: string;
  readonly ALLOWED_ORIGINS?: string;
};

export type KVNamespace = {
  get(key: string): Promise<string | null>;
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export type ScheduledController = {
  readonly scheduledTime: number;
  readonly cron: string;
};

export type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};
