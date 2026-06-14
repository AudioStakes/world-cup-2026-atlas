export const DEFAULT_WRANGLER_CONFIG = "wrangler.toml";
export const REMOTE_PRODUCTION_KV_BINDING_ARGS = [
  "--binding",
  "RESULTS_KV",
  "--remote",
  "--preview",
  "false",
];

export function createRemoteProductionKvArgs({
  config = DEFAULT_WRANGLER_CONFIG,
  text = false,
} = {}) {
  return [...REMOTE_PRODUCTION_KV_BINDING_ARGS, ...(text ? ["--text"] : []), "--config", config];
}

export function createRemoteProductionKvGetArgs(key, { config = DEFAULT_WRANGLER_CONFIG } = {}) {
  return ["kv", "key", "get", key, ...createRemoteProductionKvArgs({ config, text: true })];
}

export function createRemoteProductionKvPutArgs(
  key,
  { config = DEFAULT_WRANGLER_CONFIG, path } = {},
) {
  return ["kv", "key", "put", key, "--path", path, ...createRemoteProductionKvArgs({ config })];
}
