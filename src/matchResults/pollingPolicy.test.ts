import { describe, expect, it } from "vitest";
import { appData } from "../data/appData";
import { localDate, localTime, venueId } from "../domain/ids";
import { createPollingDecision } from "./pollingPolicy";

function createDecision(now: string, lastFetchedAt: string | null, requestCountToday: number) {
  return createPollingDecision({
    matches: appData.matches,
    venues: appData.venues,
    now: new Date(now),
    lastFetchedAt: lastFetchedAt ? new Date(lastFetchedAt) : null,
    requestCountToday,
  });
}

describe("createPollingDecision", () => {
  it("polls during a match's four-hour window", () => {
    expect(createDecision("2026-06-11T19:00:00.000Z", null, 0)).toMatchObject({
      shouldPoll: true,
      activeDates: ["2026-06-11"],
      reason: "active",
    });
  });

  it("uses UTC dates for date-level provider calls", () => {
    const [sourceMatch] = appData.matches;

    if (!sourceMatch) {
      throw new Error("Expected app data to contain matches");
    }

    expect(
      createPollingDecision({
        matches: [
          {
            ...sourceMatch,
            date: localDate("2026-06-13"),
            kickoffLocal: localTime("21:00"),
            venueId: venueId("new-york-new-jersey"),
          },
        ],
        venues: appData.venues,
        now: new Date("2026-06-14T01:00:00.000Z"),
        lastFetchedAt: null,
        requestCountToday: 0,
      }),
    ).toMatchObject({
      shouldPoll: true,
      activeDates: ["2026-06-14"],
      reason: "active",
    });
  });

  it("skips outside polling windows", () => {
    expect(createDecision("2026-06-11T18:59:59.000Z", null, 0)).toMatchObject({
      shouldPoll: false,
      activeDates: [],
      reason: "outside-window",
    });
  });

  it("enforces the 20 minute provider interval", () => {
    expect(createDecision("2026-06-11T19:19:59.000Z", "2026-06-11T19:00:00.000Z", 0)).toMatchObject(
      {
        shouldPoll: false,
        reason: "interval-not-elapsed",
      },
    );

    expect(createDecision("2026-06-11T19:20:00.000Z", "2026-06-11T19:00:00.000Z", 0)).toMatchObject(
      {
        shouldPoll: true,
        reason: "active",
      },
    );
  });

  it("enforces the daily hard request budget", () => {
    expect(createDecision("2026-06-11T19:00:00.000Z", null, 98)).toMatchObject({
      shouldPoll: false,
      reason: "hard-limit-reached",
    });
  });
});
