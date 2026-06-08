import { describe, expect, it } from "vitest";
import { appData } from "./appData";

describe("production tournament fixtures", () => {
  it("contains all 104 tournament matches", () => {
    expect(appData.matches).toHaveLength(104);
  });

  it("uses match numbers 1 through 104 exactly once", () => {
    expect(appData.matches.map((match) => match.matchNumber).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 104 }, (_, index) => index + 1),
    );
  });

  it("keeps all 72 group-stage matches", () => {
    expect(appData.matches.filter((match) => match.stage === "group")).toHaveLength(72);
  });

  it("keeps all 32 knockout-stage matches", () => {
    expect(appData.matches.filter((match) => match.stage !== "group")).toHaveLength(32);
  });

  it("keeps the final at New York / New Jersey", () => {
    const final = appData.matches.find((match) => match.matchNumber === 104);

    expect(final?.stage).toBe("final");
    expect(final?.venueId).toBe("new-york-new-jersey");
    expect(final?.date).toBe("2026-07-19");
  });
});
