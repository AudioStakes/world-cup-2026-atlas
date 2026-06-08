import { describe, expect, it } from "vitest";
import { appData } from "./appData";

describe("production group-stage fixtures", () => {
  const groupStageMatches = appData.matches.filter((match) => match.stage === "group");

  it("contains all 72 group-stage matches", () => {
    expect(groupStageMatches).toHaveLength(72);
  });

  it("uses group-stage match numbers 1 through 72 exactly once", () => {
    expect(groupStageMatches.map((match) => match.matchNumber).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 72 }, (_, index) => index + 1),
    );
  });

  it("keeps every group with six group-stage matches", () => {
    for (const group of appData.groups) {
      expect(
        groupStageMatches.filter((match) => match.groupCode === group.code),
        `Group ${group.code} should have six matches`,
      ).toHaveLength(6);
    }
  });
});
