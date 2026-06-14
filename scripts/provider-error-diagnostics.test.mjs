// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  formatProviderErrorDetailsLines,
  summarizeProviderErrorText,
} from "./provider-error-diagnostics.mjs";

describe("provider error diagnostics", () => {
  it("reads old provider error format without details", () => {
    expect(
      summarizeProviderErrorText(
        JSON.stringify({
          at: "2026-06-14T17:30:00.000Z",
          message: "API-FOOTBALL returned errors",
        }),
      ),
    ).toEqual({
      status: "present",
      at: "2026-06-14T17:30:00.000Z",
      message: "API-FOOTBALL returned errors",
      details: null,
    });
  });

  it("formats safe provider error details for workflow summaries", () => {
    const providerError = {
      at: "2026-06-14T17:30:00.000Z",
      message: "API-FOOTBALL returned errors",
      details: {
        kind: "provider-errors",
        errorType: "object",
        errorKeys: ["requests"],
        errorMessages: [
          "requests: No fixtures for this league",
          "secret: token-like value should be hidden",
        ],
        responseCount: 0,
        httpStatus: 200,
        request: {
          league: "1",
          season: "2026",
          date: "2026-06-14",
          timezone: "UTC",
        },
      },
    };
    const summary = summarizeProviderErrorText(JSON.stringify(providerError));
    const lines = formatProviderErrorDetailsLines(summary.details);

    expect(summary).toMatchObject({
      status: "present",
      at: "2026-06-14T17:30:00.000Z",
      message: "API-FOOTBALL returned errors",
      details: {
        kind: "provider-errors",
        errorKeys: ["requests"],
        errorMessages: ["requests: No fixtures for this league"],
        responseCount: 0,
      },
    });
    expect(lines).toEqual([
      "Provider error details kind: provider-errors",
      "Provider error details errorType: object",
      "Provider error details errorKeys: requests",
      "Provider error details messages: requests: No fixtures for this league",
      "Provider error details responseCount: 0",
      "Provider error details httpStatus: 200",
      "Provider error details request: league=1, season=2026, date=2026-06-14, timezone=UTC",
    ]);
  });
});
