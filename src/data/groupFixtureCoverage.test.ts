import { describe, expect, it } from "vitest";
import { appData } from "./appData";

const completeFixtureGroupCodes = ["A", "F"] as const;

function getGroupMatches(groupCode: string) {
  return appData.matches
    .filter((match) => match.groupCode === groupCode)
    .slice()
    .sort((left, right) => left.matchNumber - right.matchNumber);
}

function getGroupSlotIds(groupCode: string) {
  return appData.slotEntries
    .filter((slotEntry) => slotEntry.groupCode === groupCode)
    .map((slotEntry) => slotEntry.slotId);
}

function pairKey(homeSlotId: string, awaySlotId: string): string {
  return [homeSlotId, awaySlotId].slice().sort().join("-");
}

function createExpectedRoundRobinPairKeys(groupSlotIds: readonly string[]): string[] {
  return groupSlotIds.flatMap((homeSlotId, index) =>
    groupSlotIds.slice(index + 1).map((awaySlotId) => pairKey(homeSlotId, awaySlotId)),
  );
}

describe("complete group fixture subsets", () => {
  it.each(
    completeFixtureGroupCodes,
  )("keeps Group %s as a complete six-match round robin", (groupCode) => {
    const groupMatches = getGroupMatches(groupCode);
    const groupSlotIds = getGroupSlotIds(groupCode);
    const groupSlotIdSet = new Set(groupSlotIds);

    expect(groupSlotIds).toHaveLength(4);
    expect(groupMatches).toHaveLength(6);

    const actualPairKeys = groupMatches.map((match) => pairKey(match.homeSlotId, match.awaySlotId));
    const expectedPairKeys = createExpectedRoundRobinPairKeys(groupSlotIds);

    expect(new Set(actualPairKeys).size).toBe(6);

    for (const match of groupMatches) {
      expect(
        groupSlotIdSet.has(match.homeSlotId),
        `${match.id} home slot should be in Group ${groupCode}`,
      ).toBe(true);
      expect(
        groupSlotIdSet.has(match.awaySlotId),
        `${match.id} away slot should be in Group ${groupCode}`,
      ).toBe(true);
      expect(match.homeSlotId).not.toBe(match.awaySlotId);
    }

    expect(actualPairKeys.slice().sort()).toEqual(expectedPairKeys.slice().sort());
  });

  it("keeps Japan's Group F path as three group-stage matches", () => {
    const japanMatches = appData.matches
      .filter((match) => match.homeCountryId === "jpn" || match.awayCountryId === "jpn")
      .slice()
      .sort((left, right) => left.matchNumber - right.matchNumber);

    expect(japanMatches.map((match) => match.matchNumber)).toEqual([11, 36, 57]);
    expect(japanMatches.map((match) => match.venueId)).toEqual(["dallas", "monterrey", "dallas"]);
  });
});
