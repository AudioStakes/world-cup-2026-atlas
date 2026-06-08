import { describe, expect, it } from "vitest";
import { appData } from "./appData";

describe("production group-stage fixtures", () => {
  it("contains all 72 group-stage matches", () => {
    expect(appData.matches).toHaveLength(72);
    expect(appData.matches.every((match) => match.stage === "group")).toBe(true);
  });

  it("uses match numbers 1 through 72 exactly once", () => {
    expect(appData.matches.map((match) => match.matchNumber).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 72 }, (_, index) => index + 1),
    );
  });

  it("keeps every group with six group-stage matches", () => {
    for (const group of appData.groups) {
      expect(
        appData.matches.filter((match) => match.groupCode === group.code),
        `Group ${group.code} should have six matches`,
      ).toHaveLength(6);
    }
  });
});
