#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  formatProviderErrorDetailsLines,
  summarizeProviderErrorText,
} from "./provider-error-diagnostics.mjs";
import {
  createRemoteProductionKvGetArgs,
  DEFAULT_WRANGLER_CONFIG,
} from "./remote-production-kv-args.mjs";

const DEFAULT_WORKER_URL = "https://world-cup-2026-atlas.audiostakes.workers.dev";
const WRANGLER_CONFIG = DEFAULT_WRANGLER_CONFIG;
const KV_KEYS = [
  { label: "latest", key: "match-results/latest.json", type: "snapshot" },
  { label: "last-known-good", key: "match-results/last-known-good.json", type: "snapshot" },
  { label: "provider-error", key: "match-results/provider-error/latest.json", type: "error" },
  { label: "poll-status", key: "match-results/poll-status/latest.json", type: "poll-status" },
];

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const workerUrl = options.workerUrl ?? process.env.WORKER_URL ?? DEFAULT_WORKER_URL;
const targetUrl = new URL("/api/results", workerUrl);
const summaryLines = [];
let shouldFail = false;

emit("# Live results diagnostics");
emit("");
emit(`Worker URL: ${targetUrl.origin}`);
emit("");

if (options.skipWrangler) {
  emit("Worker deployment: skipped");
} else {
  const deploymentStatus = readDeploymentStatus();
  shouldFail = shouldFail || !deploymentStatus.ok;
  emit(`Worker deployment: ${deploymentStatus.message}`);
}

emit("");
emit("## KV snapshots");
emit("");
emit("| key | status | provider | fetchedAt | matches | isFallback |");
emit("| --- | --- | --- | --- | ---: | --- |");

if (options.skipWrangler) {
  for (const item of KV_KEYS.filter((key) => key.type === "snapshot")) {
    emit(`| ${item.key} | skipped | - | - | - | - |`);
  }
} else {
  for (const item of KV_KEYS.filter((key) => key.type === "snapshot")) {
    const value = readKvText(item.key);
    const summary = value.exists ? summarizeSnapshot(value.text) : null;

    emit(formatSnapshotRow(item.key, value, summary));
  }
}

emit("");
emit("## Poll status");
emit("");

if (options.skipWrangler) {
  emit("Poll status: skipped");
} else {
  const pollStatusValue = readKvText("match-results/poll-status/latest.json");

  if (!pollStatusValue.exists) {
    emit("Poll status: missing");
  } else {
    emitPollStatusSummary(pollStatusValue.text);
  }
}

emit("");
emit("## Provider error");
emit("");

if (options.skipWrangler) {
  emit("Provider error: skipped");
} else {
  const providerErrorValue = readKvText("match-results/provider-error/latest.json");

  if (!providerErrorValue.exists) {
    emit("Provider error: missing");
  } else {
    const providerError = summarizeProviderError(providerErrorValue.text);
    emit(`Provider error: ${providerError.status}`);
    emit(`Provider error at: ${providerError.at}`);
    emit(`Provider error message: ${providerError.message}`);
    for (const line of formatProviderErrorDetailsLines(providerError.details)) {
      emit(line);
    }
  }
}

emit("");
emit("## Public /api/results");
emit("");

const publicResult = await readPublicApiResults(targetUrl);
shouldFail = shouldFail || !publicResult.ok;
emit(`HTTP status: ${publicResult.status}`);
emit(`Schema status: ${publicResult.schemaStatus}`);

if (publicResult.summary) {
  emit(`provider: ${publicResult.summary.provider}`);
  emit(`fetchedAt: ${publicResult.summary.fetchedAt}`);
  emit(`matches.length: ${publicResult.summary.matchesLength}`);
  emit(`isFallback: ${publicResult.summary.isFallback}`);
}

writeStepSummary(options.summaryFile ?? process.env.GITHUB_STEP_SUMMARY, summaryLines);

if (shouldFail) {
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {
    help: false,
    skipWrangler: false,
    summaryFile: null,
    workerUrl: null,
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

    if (arg === "--skip-wrangler") {
      parsed.skipWrangler = true;
      continue;
    }

    if (arg === "--worker-url") {
      parsed.workerUrl = readRequiredArg(args, index, arg);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--worker-url=")) {
      parsed.workerUrl = arg.slice("--worker-url=".length);
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

function readDeploymentStatus() {
  const result = runWrangler(["deployments", "list", "--json", "--config", WRANGLER_CONFIG]);

  if (!result.ok) {
    return {
      ok: false,
      message: "could not verify with Wrangler",
    };
  }

  const deployments = parseDeploymentList(result.stdout);

  if (deployments.length === 0) {
    return {
      ok: false,
      message: "not found",
    };
  }

  return {
    ok: true,
    message: `found (${deployments.length} deployment records returned)`,
  };
}

function parseDeploymentList(stdout) {
  try {
    const parsed = JSON.parse(stdout);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.deployments)) {
      return parsed.deployments;
    }
  } catch {
    return [];
  }

  return [];
}

function readKvText(key) {
  const result = runWrangler(createRemoteProductionKvGetArgs(key, { config: WRANGLER_CONFIG }));

  if (!result.ok) {
    return {
      exists: false,
      status: "missing",
      text: "",
    };
  }

  return {
    exists: true,
    status: "present",
    text: result.stdout.trim(),
  };
}

function runWrangler(args) {
  const result = spawnSync("pnpm", ["wrangler", ...args], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 5 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
  };
}

async function readPublicApiResults(url) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return {
      ok: false,
      status: "request_failed",
      schemaStatus: "unreadable",
      summary: null,
    };
  }

  let body;

  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      status: String(response.status),
      schemaStatus: "invalid-json",
      summary: null,
    };
  }

  const summary = summarizeSnapshotObject(body);

  return {
    ok: response.status === 200 && summary.valid,
    status: String(response.status),
    schemaStatus: summary.valid ? "valid" : "invalid",
    summary,
  };
}

function summarizeSnapshot(text) {
  try {
    return summarizeSnapshotObject(JSON.parse(text));
  } catch {
    return {
      valid: false,
      provider: "-",
      fetchedAt: "-",
      matchesLength: "-",
      isFallback: "-",
    };
  }
}

function summarizeSnapshotObject(input) {
  if (!isRecord(input)) {
    return {
      valid: false,
      provider: "-",
      fetchedAt: "-",
      matchesLength: "-",
      isFallback: "-",
    };
  }

  const provider = typeof input.provider === "string" ? input.provider : "-";
  const fetchedAt = typeof input.fetchedAt === "string" ? input.fetchedAt : "-";
  const matchesLength = Array.isArray(input.matches) ? String(input.matches.length) : "-";
  const isFallback = Object.hasOwn(input, "isFallback") ? String(input.isFallback) : "absent";

  return {
    valid:
      input.schemaVersion === 1 &&
      typeof input.provider === "string" &&
      typeof input.fetchedAt === "string" &&
      !Number.isNaN(Date.parse(input.fetchedAt)) &&
      Array.isArray(input.matches),
    provider,
    fetchedAt,
    matchesLength,
    isFallback,
  };
}

function summarizeProviderError(text) {
  return summarizeProviderErrorText(text);
}

function emitPollStatusSummary(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    emit("Poll status: invalid-json");
    return;
  }

  if (!isRecord(parsed)) {
    emit("Poll status: invalid");
    return;
  }

  const decision = isRecord(parsed.decision) ? parsed.decision : {};
  const activeDates = Array.isArray(decision.activeDates)
    ? decision.activeDates.filter((date) => typeof date === "string").join(", ")
    : "";

  emit("Poll status: present");
  emit(`checkedAt: ${formatStringField(parsed.checkedAt)}`);
  emit(`result: ${formatStringField(parsed.result)}`);
  emit(`decision.shouldPoll: ${formatBooleanField(decision.shouldPoll)}`);
  emit(`decision.reason: ${formatStringField(decision.reason)}`);
  emit(`activeDates: ${activeDates || "(none)"}`);
  emit(`attemptedProviderRequests: ${formatNumberField(parsed.attemptedProviderRequests)}`);
  emit(`writtenMatches: ${formatNumberField(parsed.writtenMatches)}`);
  emit(`requestCountBefore: ${formatNumberField(parsed.requestCountBefore)}`);
  emit(`latestSnapshotProvider: ${formatNullableStringField(parsed.latestSnapshotProvider)}`);
  emit(`latestSnapshotFetchedAt: ${formatNullableStringField(parsed.latestSnapshotFetchedAt)}`);
  emit(`errorMessage: ${formatNullableStringField(parsed.errorMessage)}`);
  for (const line of formatProviderErrorDetailsLines(parsed.errorDetails, "errorDetails")) {
    emit(line);
  }
}

function formatSnapshotRow(key, value, summary) {
  if (!value.exists || !summary) {
    return `| ${key} | ${value.status} | - | - | - | - |`;
  }

  return `| ${key} | ${summary.valid ? "present" : "invalid"} | ${summary.provider} | ${
    summary.fetchedAt
  } | ${summary.matchesLength} | ${summary.isFallback} |`;
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

function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function printHelp() {
  console.log(`Usage: node scripts/diagnose-live-results.mjs [options]

Options:
  --worker-url <url>    Worker base URL. Defaults to production workers.dev URL.
  --skip-wrangler       Skip deployment and KV checks; only fetch /api/results.
  --summary-file <path> Append Markdown diagnostics to a summary file.
  --help                Show this help.
`);
}
