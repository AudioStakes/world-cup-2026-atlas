#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const e2eRoot = "e2e";
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ignoredDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const fixedPlaywrightWaitPattern = /\bwaitForTimeout\s*\(/;
const e2eTestTitlePattern = /\btest(?:\.(?:skip|fixme|fail|slow))?\s*\(\s*(["'`])([^"'`]*?)\1/g;
const e2eTagPattern = /@(smoke|full)\b/;
const e2eTagOptionPattern = /tag\s*:\s*(?:\[[^\]]*)?["']@(smoke|full)["']/;

const failures = [];
const e2eFiles = collectSourceFiles(e2eRoot).filter(isTestFile);

for (const filePath of e2eFiles) {
  const source = stripComments(readFileSync(path.join(repoRoot, filePath), "utf8"));

  if (fixedPlaywrightWaitPattern.test(source)) {
    failures.push(`${filePath} uses Playwright waitForTimeout; use locator or assertion polling.`);
  }

  let match = e2eTestTitlePattern.exec(source);

  while (match) {
    const title = match[2];
    const callPreview = source.slice(match.index, match.index + 240);

    if (!e2eTagPattern.test(title) && !e2eTagOptionPattern.test(callPreview)) {
      failures.push(`${filePath} has an E2E test without @smoke or @full tag: "${title}".`);
    }

    match = e2eTestTitlePattern.exec(source);
  }
}

if (failures.length > 0) {
  console.error("Test policy check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Test policy check passed.");
}

function collectSourceFiles(directory) {
  const entries = readdirSync(path.join(repoRoot, directory), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectSourceFiles(entryPath));
      }
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(toPosixPath(entryPath));
    }
  }

  return files;
}

function isTestFile(filePath) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath);
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
