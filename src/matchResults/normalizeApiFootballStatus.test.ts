import { describe, expect, it } from "vitest";
import { normalizeApiFootballStatus } from "./normalizeApiFootballStatus";

describe("normalizeApiFootballStatus", () => {
  it.each([
    ["TBD", "scheduled"],
    ["NS", "scheduled"],
    ["1H", "live"],
    ["HT", "live"],
    ["2H", "live"],
    ["ET", "live"],
    ["BT", "live"],
    ["P", "live"],
    ["LIVE", "live"],
    ["FT", "finished"],
    ["AET", "finished"],
    ["PEN", "finished"],
    ["PST", "postponed"],
    ["CANC", "cancelled"],
    ["SUSP", "suspended"],
    ["INT", "suspended"],
    ["ABD", "abandoned"],
    ["AWD", "abandoned"],
    ["WO", "abandoned"],
    ["XYZ", "unknown"],
  ])("maps %s to %s", (shortStatus, expectedStatus) => {
    expect(normalizeApiFootballStatus(shortStatus)).toBe(expectedStatus);
  });
});
