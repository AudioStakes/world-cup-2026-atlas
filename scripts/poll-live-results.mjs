#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const WRANGLER_CONFIG = "wrangler.toml";
const DEFAULT_CRON = "*/5 * * * *";
export const KV_WRITE_PREFLIGHT_KEY = "match-results/diagnostics/write-probe.json";
export const WRANGLER_OUTPUT_PREVIEW_BYTES = 4096;
const summaryLines = [];

export async function main(
  argv = process.argv.slice(2),
  { createViteServer = createServer, runWranglerCommand = runWrangler } = {},
) {
  summaryLines.length = 0;
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.writeKv && !options.allowProviderRequest) {
    fail("--write-kv requires --allow-provider-request.");
  }

  if (options.writeKv) {
    options.remoteKv = true;
  }

  const now = readNow(options.now ?? process.env.PROVIDER_POLL_NOW);
  const nowIso = now.toISOString();
  const summaryFile = options.summaryFile ?? process.env.GITHUB_STEP_SUMMARY;
  const server = await createViteServer({
    appType: "custom",
    logLevel: "error",
    server: {
      middlewareMode: true,
    },
  });

  try {
    const {
      appData,
      createPollingDecision,
      createRequestCountKey,
      lastFetchedAtKey,
      latestSnapshotKey,
      pollStatusKey,
      providerErrorKey,
      refreshResultsSnapshot,
    } = await loadRuntimeModules(server);
    const today = nowIso.slice(0, 10);
    const requestCountKey = createRequestCountKey(today);
    const baseKv = options.remoteKv
      ? createRemoteKv({ writable: false, runWranglerCommand })
      : createMemoryKv();
    const [lastFetchedAtValue, requestCountValue] = await Promise.all([
      baseKv.get(lastFetchedAtKey),
      baseKv.get(requestCountKey),
    ]);
    const decision = createPollingDecision({
      matches: appData.matches,
      venues: appData.venues,
      now,
      lastFetchedAt: parseDate(lastFetchedAtValue),
      requestCountToday: parseRequestCount(requestCountValue),
    });

    emit("# Live results provider poll");
    emit("");
    emit(`mode: ${options.writeKv ? "real-run" : "dry-run"}`);
    emit(`remoteKv: ${String(options.remoteKv)}`);
    emit(`now: ${nowIso}`);
    emit(`cron: ${options.cron}`);
    emit(`decision.shouldPoll: ${String(decision.shouldPoll)}`);
    emit(`decision.reason: ${decision.reason}`);
    emit(`decision.activeDates: ${decision.activeDates.join(", ") || "(none)"}`);
    emit(`lastFetchedAt: ${lastFetchedAtValue ?? "(missing)"}`);
    emit(`requestCountKey: ${requestCountKey}`);
    emit(`requestCountToday: ${parseRequestCount(requestCountValue)}`);
    emit("");

    if (!options.allowProviderRequest) {
      emit(
        "Provider request: skipped; pass --allow-provider-request to consume API-FOOTBALL quota.",
      );
      writeStepSummary(summaryFile, summaryLines);
      return;
    }

    if (!process.env.API_FOOTBALL_KEY) {
      fail(
        "API_FOOTBALL_KEY is required for --allow-provider-request; the value is never printed.",
      );
    }

    if (options.writeKv) {
      try {
        writeRemoteKvPreflight({ nowIso, runWranglerCommand });
        emit("KV write preflight: passed");
      } catch (error) {
        emit("KV write preflight: failed");
        throw error;
      }
      emit("");
    }

    const kv = options.writeKv
      ? createRemoteKv({ writable: true, runWranglerCommand })
      : createDryRunKv({ fallbackKv: baseKv });
    const env = {
      RESULTS_KV: kv,
      API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY ?? "",
      API_FOOTBALL_BASE_URL: process.env.API_FOOTBALL_BASE_URL,
      API_FOOTBALL_LEAGUE_ID: process.env.API_FOOTBALL_LEAGUE_ID,
      API_FOOTBALL_SEASON: process.env.API_FOOTBALL_SEASON,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    };

    if (!decision.shouldPoll) {
      await refreshResultsSnapshot({
        env,
        now,
      });

      emit(`Provider request: skipped by polling policy (${decision.reason}).`);
      emit(`KV writes: ${options.writeKv ? "remote poll-status" : "dry-run only"}`);
      emit("");
      emit("## Resulting diagnostics");
      emit("");
      await emitResultingDiagnostics({
        kv,
        latestSnapshotKey,
        pollStatusKey,
        providerErrorKey,
        requestCountKey,
        nowIso,
      });
      writeStepSummary(summaryFile, summaryLines);
      return;
    }

    await refreshResultsSnapshot({
      env,
      now,
    });

    emit(`Provider request dates attempted: ${decision.activeDates.length}`);
    emit(`KV writes: ${options.writeKv ? "remote" : "dry-run only"}`);
    emit("");
    emit("## Resulting diagnostics");
    emit("");
    await emitResultingDiagnostics({
      kv,
      latestSnapshotKey,
      pollStatusKey,
      providerErrorKey,
      requestCountKey,
      nowIso,
    });
    writeStepSummary(summaryFile, summaryLines);
  } catch (error) {
    writeStepSummary(summaryFile, summaryLines);
    throw error;
  } finally {
    await server.close();
  }
}

if (isMainModule()) {
  await main().catch((error) => {
    console.error(createSafeCliErrorMessage(error));
    process.exit(1);
  });
}

function parseArgs(args) {
  const parsed = {
    allowProviderRequest: false,
    cron: DEFAULT_CRON,
    help: false,
    now: null,
    remoteKv: false,
    summaryFile: null,
    writeKv: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--allow-provider-request") {
      parsed.allowProviderRequest = true;
      continue;
    }

    if (arg === "--remote-kv") {
      parsed.remoteKv = true;
      continue;
    }

    if (arg === "--write-kv") {
      parsed.writeKv = true;
      continue;
    }

    if (arg === "--now") {
      parsed.now = readRequiredArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--now=")) {
      parsed.now = arg.slice("--now=".length);
      continue;
    }

    if (arg === "--cron") {
      parsed.cron = readRequiredArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--cron=")) {
      parsed.cron = arg.slice("--cron=".length);
      continue;
    }

    if (arg === "--summary-file") {
      parsed.summaryFile = readRequiredArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--summary-file=")) {
      parsed.summaryFile = arg.slice("--summary-file=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function readRequiredArg(args, index, flag) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

async function loadRuntimeModules(viteServer) {
  const [appDataModule, pollingPolicyModule, kvKeysModule, pollModule] = await Promise.all([
    viteServer.ssrLoadModule("/src/data/appData.ts"),
    viteServer.ssrLoadModule("/src/matchResults/pollingPolicy.ts"),
    viteServer.ssrLoadModule("/workers/results/src/kvKeys.ts"),
    viteServer.ssrLoadModule("/workers/results/src/poll.ts"),
  ]);

  return {
    appData: appDataModule.appData,
    createPollingDecision: pollingPolicyModule.createPollingDecision,
    createRequestCountKey: kvKeysModule.createRequestCountKey,
    lastFetchedAtKey: kvKeysModule.lastFetchedAtKey,
    latestSnapshotKey: kvKeysModule.latestSnapshotKey,
    pollStatusKey: kvKeysModule.pollStatusKey,
    providerErrorKey: kvKeysModule.providerErrorKey,
    refreshResultsSnapshot: pollModule.refreshResultsSnapshot,
  };
}

function createMemoryKv(initialValues = new Map()) {
  const values = new Map(initialValues);

  return {
    values,
    async get(key, type) {
      const value = values.get(key) ?? null;

      if (value === null || type !== "json") {
        return value;
      }

      return JSON.parse(value);
    },
    async put(key, value) {
      values.set(key, value);
    },
  };
}

function createDryRunKv({ fallbackKv }) {
  const memoryKv = createMemoryKv();

  return {
    writes: memoryKv.values,
    async get(key, type) {
      const writtenValue = memoryKv.values.get(key);

      if (writtenValue !== undefined) {
        return type === "json" ? JSON.parse(writtenValue) : writtenValue;
      }

      return fallbackKv.get(key, type);
    },
    async put(key, value) {
      await memoryKv.put(key, value);
    },
  };
}

function createRemoteKv({ writable, runWranglerCommand = runWrangler }) {
  return {
    async get(key, type) {
      const value = readRemoteKvText(key, { runWranglerCommand });

      if (value === null || type !== "json") {
        return value;
      }

      return JSON.parse(value);
    },
    async put(key, value) {
      if (!writable) {
        throw new Error("Remote KV writes require --write-kv.");
      }

      writeRemoteKvText(key, value, { runWranglerCommand });
    },
  };
}

function readRemoteKvText(key, { runWranglerCommand = runWrangler } = {}) {
  const result = runWranglerCommand([
    "kv",
    "key",
    "get",
    key,
    "--binding",
    "RESULTS_KV",
    "--remote",
    "--text",
    "--config",
    WRANGLER_CONFIG,
  ]);

  if (!result.ok) {
    return null;
  }

  return result.stdout.trim();
}

export function writeRemoteKvPreflight({ nowIso, runWranglerCommand = runWrangler }) {
  writeRemoteKvText(
    KV_WRITE_PREFLIGHT_KEY,
    JSON.stringify({
      schemaVersion: 1,
      checkedAt: nowIso,
      purpose: "live-results-kv-write-preflight",
    }),
    { runWranglerCommand },
  );
}

function writeRemoteKvText(key, value, { runWranglerCommand = runWrangler } = {}) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "live-results-kv-"));
  const tempPath = path.join(tempDir, "value.txt");

  try {
    writeFileSync(tempPath, value);

    const result = runWranglerCommand([
      "kv",
      "key",
      "put",
      key,
      "--path",
      tempPath,
      "--binding",
      "RESULTS_KV",
      "--remote",
      "--config",
      WRANGLER_CONFIG,
    ]);

    if (!result.ok) {
      throw new Error(createRemoteKvWriteFailureMessage(key, result));
    }
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

export function runWrangler(
  args,
  { env = process.env, previewBytes = WRANGLER_OUTPUT_PREVIEW_BYTES, spawn = spawnSync } = {},
) {
  const command = ["pnpm", "wrangler", ...args];
  const secrets = getSecretValues(env);
  const result = spawn(command[0], command.slice(1), {
    encoding: "utf8",
    env,
    maxBuffer: 5 * 1024 * 1024,
  });
  const stdout = redactSecrets(result.stdout ?? "", secrets);
  const stderr = redactSecrets(result.stderr ?? "", secrets);
  const errorMessage = result.error ? redactSecrets(result.error.message, secrets) : null;
  const status = typeof result.status === "number" ? result.status : null;
  const signal = typeof result.signal === "string" ? result.signal : null;

  return {
    ok: status === 0,
    command,
    commandText: redactSecrets(formatCommand(command), secrets),
    status,
    signal,
    stdout,
    stderr,
    stdoutPreview: createOutputPreview(stdout, previewBytes),
    stderrPreview: createOutputPreview(stderr, previewBytes),
    errorMessage,
  };
}

export function createRemoteKvWriteFailureMessage(key, result) {
  const lines = [
    `Failed to write remote KV key ${key}.`,
    `wrangler command: ${result.commandText ?? "(unavailable)"}`,
    `wrangler exit status: ${formatNullableProcessField(result.status)}`,
    `wrangler signal: ${formatNullableProcessField(result.signal)}`,
  ];

  if (result.errorMessage) {
    lines.push(`wrangler spawn error: ${result.errorMessage}`);
  }

  lines.push(
    "wrangler stdout:",
    result.stdoutPreview || "(empty)",
    "wrangler stderr:",
    result.stderrPreview || "(empty)",
  );

  return lines.join("\n");
}

export function createSafeCliErrorMessage(error, env = process.env) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");

  return redactSecrets(message.length > 0 ? message : "Unknown error", getSecretValues(env));
}

export function redactSecrets(value, secrets = getSecretValues()) {
  let redacted = value;

  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      redacted = redacted.split(secret).join("[redacted]");
    }
  }

  return redacted;
}

function createOutputPreview(value, maxBytes) {
  const text = value.trimEnd();

  if (Buffer.byteLength(text, "utf8") <= maxBytes) {
    return text;
  }

  let end = Math.min(text.length, maxBytes);

  while (end > 0 && Buffer.byteLength(text.slice(0, end), "utf8") > maxBytes) {
    end -= 1;
  }

  return `${text.slice(0, end)}\n[truncated after ${maxBytes} bytes]`;
}

function formatCommand(command) {
  return command.map(formatCommandArg).join(" ");
}

function formatCommandArg(arg) {
  if (/^[\w./:=@+-]+$/.test(arg)) {
    return arg;
  }

  return `'${arg.replaceAll("'", "'\\''")}'`;
}

function formatNullableProcessField(value) {
  return value === null || value === undefined ? "(none)" : String(value);
}

function getSecretValues(env = process.env) {
  return [env.API_FOOTBALL_KEY, env.CLOUDFLARE_API_TOKEN, env.GITHUB_TOKEN].filter(
    (value) => typeof value === "string" && value.length > 0,
  );
}

function readNow(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    fail(`Invalid --now value: ${value}`);
  }

  return date;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequestCount(value) {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

async function emitResultingDiagnostics({
  kv,
  latestSnapshotKey,
  pollStatusKey,
  providerErrorKey,
  requestCountKey,
  nowIso,
}) {
  const [latestSnapshot, pollStatus, providerError, requestCountAfter] = await Promise.all([
    kv.get(latestSnapshotKey),
    kv.get(pollStatusKey),
    kv.get(providerErrorKey),
    kv.get(requestCountKey),
  ]);

  emit(formatSnapshotSummary("latest snapshot", latestSnapshot));
  emitPollStatusSummary(pollStatus);
  emit(formatProviderErrorSummary(providerError, nowIso));
  emit(`requestCountTodayAfter: ${parseRequestCount(requestCountAfter)}`);
}

function formatSnapshotSummary(label, value) {
  if (!value) {
    return `${label}: missing`;
  }

  try {
    const parsed = JSON.parse(value);

    if (!isRecord(parsed)) {
      return `${label}: invalid`;
    }

    const provider = typeof parsed.provider === "string" ? parsed.provider : "-";
    const fetchedAt = typeof parsed.fetchedAt === "string" ? parsed.fetchedAt : "-";
    const matchesLength = Array.isArray(parsed.matches) ? parsed.matches.length : "-";
    const isFallback = Object.hasOwn(parsed, "isFallback") ? String(parsed.isFallback) : "absent";

    return `${label}: provider=${provider}, fetchedAt=${fetchedAt}, matches.length=${matchesLength}, isFallback=${isFallback}`;
  } catch {
    return `${label}: invalid-json`;
  }
}

function emitPollStatusSummary(value) {
  if (!value) {
    emit("poll status: missing");
    return;
  }

  try {
    const parsed = JSON.parse(value);

    if (!isRecord(parsed)) {
      emit("poll status: invalid");
      return;
    }

    const decision = isRecord(parsed.decision) ? parsed.decision : {};
    const activeDates = Array.isArray(decision.activeDates)
      ? decision.activeDates.filter((date) => typeof date === "string").join(", ")
      : "";

    emit(`poll status result: ${formatStringField(parsed.result)}`);
    emit(`poll status checkedAt: ${formatStringField(parsed.checkedAt)}`);
    emit(`poll status decision.shouldPoll: ${formatBooleanField(decision.shouldPoll)}`);
    emit(`poll status decision.reason: ${formatStringField(decision.reason)}`);
    emit(`poll status activeDates: ${activeDates || "(none)"}`);
    emit(
      `poll status attemptedProviderRequests: ${formatNumberField(parsed.attemptedProviderRequests)}`,
    );
    emit(`poll status writtenMatches: ${formatNumberField(parsed.writtenMatches)}`);
    emit(`poll status requestCountBefore: ${formatNumberField(parsed.requestCountBefore)}`);
    emit(
      `poll status latestSnapshotProvider: ${formatNullableStringField(parsed.latestSnapshotProvider)}`,
    );
    emit(
      `poll status latestSnapshotFetchedAt: ${formatNullableStringField(parsed.latestSnapshotFetchedAt)}`,
    );
    emit(`poll status errorMessage: ${formatNullableStringField(parsed.errorMessage)}`);
  } catch {
    emit("poll status: invalid-json");
  }
}

function formatProviderErrorSummary(value, nowIso) {
  if (!value) {
    return "provider error: missing";
  }

  try {
    const parsed = JSON.parse(value);

    if (!isRecord(parsed)) {
      return "provider error: invalid";
    }

    const at = typeof parsed.at === "string" ? parsed.at : "-";
    const message = typeof parsed.message === "string" ? parsed.message : "-";
    const freshness = at === nowIso ? "current-run" : "previous-run";

    return `provider error: ${freshness}, at=${at}, message=${message}`;
  } catch {
    return "provider error: invalid-json";
  }
}

function formatStringField(value) {
  return typeof value === "string" ? value : "-";
}

function formatNullableStringField(value) {
  if (value === null) {
    return "null";
  }

  return formatStringField(value);
}

function formatBooleanField(value) {
  return typeof value === "boolean" ? String(value) : "-";
}

function formatNumberField(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "-";
}

function emit(line) {
  console.log(line);
  summaryLines.push(line);
}

function writeStepSummary(summaryFile, lines) {
  if (!summaryFile) {
    return;
  }

  appendFileSync(summaryFile, `${lines.join("\n")}\n\n`);
}

function fail(message) {
  throw new Error(message);
}

function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isMainModule() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function printHelp() {
  console.log(`Usage: node scripts/poll-live-results.mjs [options]

Default mode computes the polling decision only. It does not call API-FOOTBALL and does not write KV.

Options:
  --now <iso>                 Evaluate polling at this timestamp. Defaults to current time.
  --remote-kv                 Read polling guard values from remote RESULTS_KV.
  --allow-provider-request    Allow API-FOOTBALL calls when polling policy says to poll.
  --write-kv                  Write resulting snapshot/diagnostics to remote RESULTS_KV.
  --cron <expr>               Record the cron expression used by the manual run.
  --summary-file <path>       Append Markdown diagnostics to a summary file.
  --help                      Show this help.
`);
}
