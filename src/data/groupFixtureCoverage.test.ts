import { describe, expect, it } from "vitest";
import type { GroupCode, SlotId } from "../domain/ids";
import { countryId } from "../domain/ids";
import type { Match } from "../domain/types";
import { appData } from "./appData";
import { getMatchCountryIds, getParticipantSlotId } from "./matchParticipants";

const completeFixtureGroupCodes = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

function getMatchGroupCode(match: Match): GroupCode | null {
  return "groupCode" in match && match.groupCode ? match.groupCode : null;
}

function getGroupMatches(groupCode: string) {
  return appData.matches
    .filter((match) => getMatchGroupCode(match) === groupCode)
    .slice()
    .sort((left, right) => left.matchNumber - right.matchNumber);
}

function getGroupSlotIds(groupCode: string) {
  return appData.slotEntries
    .filter((slotEntry) => slotEntry.groupCode === groupCode)
    .map((slotEntry) => slotEntry.slotId);
}

function getMatchSlotIds(match: (typeof appData.matches)[number]): readonly SlotId[] {
  return [match.homeParticipant, match.awayParticipant]
    .map((participant) => getParticipantSlotId(participant))
    .filter((slotId): slotId is SlotId => Boolean(slotId));
}

function pairKey(homeSlotId: string, awaySlotId: string): string {
  return [homeSlotId, awaySlotId].slice().sort().join("-");
}

function createExpectedRoundRobinPairKeys(groupSlotIds: readonly SlotId[]): string[] {
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

    const actualPairKeys = groupMatches.map((match) => {
      const [homeSlotId, awaySlotId] = getMatchSlotIds(match);

      if (!homeSlotId || !awaySlotId) {
        throw new Error(`${match.id} should have two slot participants`);
      }

      return pairKey(homeSlotId, awaySlotId);
    });
    const expectedPairKeys = createExpectedRoundRobinPairKeys(groupSlotIds);

    expect(new Set(actualPairKeys).size).toBe(6);

    for (const match of groupMatches) {
      const [homeSlotId, awaySlotId] = getMatchSlotIds(match);

      expect(homeSlotId, `${match.id} should have a home slot`).toBeTruthy();
      expect(awaySlotId, `${match.id} should have an away slot`).toBeTruthy();
      expect(
        homeSlotId ? groupSlotIdSet.has(homeSlotId) : false,
        `${match.id} home slot should be in Group ${groupCode}`,
      ).toBe(true);
      expect(
        awaySlotId ? groupSlotIdSet.has(awaySlotId) : false,
        `${match.id} away slot should be in Group ${groupCode}`,
      ).toBe(true);
      expect(homeSlotId).not.toBe(awaySlotId);
    }

    expect(actualPairKeys.slice().sort()).toEqual(expectedPairKeys.slice().sort());
  });

  it("keeps Japan's Group F path as three group-stage matches", () => {
    const japanMatches = appData.matches
      .filter((match) => getMatchCountryIds(match).includes(countryId("jpn")))
      .slice()
      .sort((left, right) => left.matchNumber - right.matchNumber);

    expect(japanMatches.map((match) => match.matchNumber)).toEqual([11, 36, 57]);
    expect(japanMatches.map((match) => match.venueId)).toEqual(["dallas", "monterrey", "dallas"]);
  });
});
