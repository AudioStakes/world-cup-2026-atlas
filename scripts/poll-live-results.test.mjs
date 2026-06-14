// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRemoteKvWriteFailureMessage,
  KV_WRITE_PREFLIGHT_KEY,
  main,
  runWrangler,
} from "./poll-live-results.mjs";

const originalApiFootballKey = process.env.API_FOOTBALL_KEY;

afterEach(() => {
  if (originalApiFootballKey === undefined) {
    delete process.env.API_FOOTBALL_KEY;
  } else {
    process.env.API_FOOTBALL_KEY = originalApiFootballKey;
  }

  vi.restoreAllMocks();
});

describe("runWrangler", () => {
  it("keeps status, signal, stdout, and stderr diagnostics with secrets redacted", () => {
    const apiFootballKey = "test-api-football-secret";
    const cloudflareToken = "test-cloudflare-token";
    const githubToken = "test-github-token";
    const spawn = vi.fn(() => ({
      status: 1,
      signal: "SIGTERM",
      stdout: `stdout ${apiFootballKey}`,
      stderr: `stderr ${cloudflareToken} ${githubToken}`,
    }));

    const result = runWrangler(["kv", "key", "put", "diagnostic key"], {
      env: {
        ...process.env,
        API_FOOTBALL_KEY: apiFootballKey,
        CLOUDFLARE_API_TOKEN: cloudflareToken,
        GITHUB_TOKEN: githubToken,
      },
      previewBytes: 128,
      spawn,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 1,
      signal: "SIGTERM",
    });
    expect(result.commandText).toBe("pnpm wrangler kv key put 'diagnostic key'");
    expect(result.stdout).toContain("[redacted]");
    expect(result.stderr).toContain("[redacted]");
    expect(result.stdout).not.toContain(apiFootballKey);
    expect(result.stderr).not.toContain(cloudflareToken);
    expect(result.stderr).not.toContain(githubToken);

    const message = createRemoteKvWriteFailureMessage(
      "match-results/provider-error/latest.json",
      result,
    );

    expect(message).toContain("wrangler exit status: 1");
    expect(message).toContain("wrangler signal: SIGTERM");
    expect(message).toContain("wrangler stdout:");
    expect(message).toContain("wrangler stderr:");
    expect(message).not.toContain(apiFootballKey);
    expect(message).not.toContain(cloudflareToken);
    expect(message).not.toContain(githubToken);
  });

  it("limits stdout and stderr previews", () => {
    const spawn = vi.fn(() => ({
      status: 1,
      signal: null,
      stdout: "x".repeat(64),
      stderr: "y".repeat(64),
    }));

    const result = runWrangler(["kv", "key", "put", "diagnostic-key"], {
      previewBytes: 16,
      spawn,
    });

    expect(result.stdoutPreview).toBe(`${"x".repeat(16)}\n[truncated after 16 bytes]`);
    expect(result.stderrPreview).toBe(`${"y".repeat(16)}\n[truncated after 16 bytes]`);
  });
});

describe("poll-live-results CLI", () => {
  it("requires --allow-provider-request before --write-kv can run", async () => {
    const createViteServer = vi.fn();

    await expect(main(["--write-kv"], { createViteServer })).rejects.toThrow(
      "--write-kv requires --allow-provider-request.",
    );
    expect(createViteServer).not.toHaveBeenCalled();
  });

  it("fails remote KV preflight before refreshing results", async () => {
    process.env.API_FOOTBALL_KEY = "test-api-football-secret";
    const refreshResultsSnapshot = vi.fn();
    const server = createFakeViteServer({ refreshResultsSnapshot });
    const runWranglerCommand = vi.fn((args) => {
      if (args.includes("get")) {
        const key = args[3];
        return createWranglerResult({
          ok: true,
          stdout: key?.includes("request-count") ? "0" : "",
        });
      }

      return createWranglerResult({
        ok: false,
        status: 1,
        stderr: "permission denied",
      });
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      main(
        [
          "--remote-kv",
          "--allow-provider-request",
          "--write-kv",
          "--now",
          "2026-06-14T17:30:00.000Z",
        ],
        {
          createViteServer: async () => server,
          runWranglerCommand,
        },
      ),
    ).rejects.toThrow(`Failed to write remote KV key ${KV_WRITE_PREFLIGHT_KEY}.`);

    expect(refreshResultsSnapshot).not.toHaveBeenCalled();
    expect(server.close).toHaveBeenCalledOnce();
    expect(runWranglerCommand).toHaveBeenCalledWith(
      expect.arrayContaining(["put", KV_WRITE_PREFLIGHT_KEY]),
    );
  });
});

function createWranglerResult({
  ok,
  status = ok ? 0 : 1,
  signal = null,
  stdout = "",
  stderr = "",
} = {}) {
  return {
    ok,
    commandText: "pnpm wrangler kv key put",
    status,
    signal,
    stdout,
    stderr,
    stdoutPreview: stdout,
    stderrPreview: stderr,
    errorMessage: null,
  };
}

function createFakeViteServer({ refreshResultsSnapshot }) {
  const modules = new Map([
    ["/src/data/appData.ts", { appData: { matches: [], venues: [] } }],
    [
      "/src/matchResults/pollingPolicy.ts",
      {
        createPollingDecision: () => ({
          shouldPoll: true,
          reason: "active",
          activeDates: ["2026-06-14"],
        }),
      },
    ],
    [
      "/workers/results/src/kvKeys.ts",
      {
        createRequestCountKey: (date) => `match-results/request-count/${date}`,
        lastFetchedAtKey: "match-results/last-fetched-at",
        latestSnapshotKey: "match-results/latest.json",
        pollStatusKey: "match-results/poll-status/latest.json",
        providerErrorKey: "match-results/provider-error/latest.json",
      },
    ],
    ["/workers/results/src/poll.ts", { refreshResultsSnapshot }],
  ]);

  return {
    close: vi.fn(async () => {}),
    ssrLoadModule: vi.fn(async (id) => modules.get(id)),
  };
}
