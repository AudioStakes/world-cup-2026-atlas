#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_ATTEMPTS = 6;
const DEFAULT_INTERVAL_MS = 10_000;
const BODY_PREVIEW_LENGTH = 4_096;

const workerUrlInput = process.argv[2] ?? process.env.WORKER_URL;

if (!workerUrlInput) {
  console.error("WORKER_URL or a Worker URL argument is required.");
  process.exit(1);
}

const targetUrl = new URL("/api/results", workerUrlInput);
const attempts = readPositiveInteger(process.env.SMOKE_CHECK_ATTEMPTS, DEFAULT_ATTEMPTS);
const intervalMs = readNonNegativeInteger(process.env.SMOKE_CHECK_INTERVAL_MS, DEFAULT_INTERVAL_MS);

let lastResult = null;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await checkApiResults(targetUrl);
  lastResult = result;

  console.log(`Smoke check attempt: ${attempt}/${attempts}`);
  console.log(`Target URL: ${targetUrl.href}`);
  console.log(`HTTP status: ${result.status ?? "request_failed"}`);

  if (result.ok) {
    console.log("/api/results smoke check passed.");
    process.exit(0);
  }

  if (result.errorMessage) {
    console.log(`Failure: ${result.errorMessage}`);
  }

  if (attempt < attempts) {
    console.log(`Retrying in ${intervalMs}ms...`);
    await delay(intervalMs);
  }
}

console.error(`/api/results smoke check failed after ${attempts} attempts.`);

if (lastResult) {
  console.error(`Last HTTP status: ${lastResult.status ?? "request_failed"}`);
  console.error("Response headers:");
  console.error(lastResult.headersText || "(none)");
  console.error(`Response body preview (${BODY_PREVIEW_LENGTH} characters max):`);
  console.error(previewBody(lastResult.bodyText));
}

process.exit(1);

async function checkApiResults(targetUrl) {
  let response;

  try {
    response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      headersText: "",
      bodyText: "",
      errorMessage: error instanceof Error ? error.message : "Request failed",
    };
  }

  const bodyText = await response.text();
  const headersText = formatHeaders(response.headers);

  if (response.status !== 200) {
    return {
      ok: false,
      status: response.status,
      headersText,
      bodyText,
      errorMessage: "Expected HTTP 200 from /api/results.",
    };
  }

  let parsedBody;

  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      status: response.status,
      headersText,
      bodyText,
      errorMessage: "Response body is not valid JSON.",
    };
  }

  if (!isRecord(parsedBody) || !Array.isArray(parsedBody.matches)) {
    return {
      ok: false,
      status: response.status,
      headersText,
      bodyText,
      errorMessage: "Expected JSON object with a matches array.",
    };
  }

  return {
    ok: true,
    status: response.status,
    headersText,
    bodyText,
    errorMessage: null,
  };
}

function formatHeaders(headers) {
  return Array.from(headers.entries())
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function previewBody(bodyText) {
  if (!bodyText) {
    return "(empty)";
  }

  return bodyText.slice(0, BODY_PREVIEW_LENGTH);
}

function readPositiveInteger(value, fallback) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function readNonNegativeInteger(value, fallback) {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
}

function isRecord(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
