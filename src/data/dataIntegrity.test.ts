import { describe, expect, it } from "vitest";
import type { CountryId, GroupCode, SlotId } from "../domain/ids";
import { countryId } from "../domain/ids";
import type { Match } from "../domain/types";
import { appData } from "./appData";

function expectUniqueValues(label: string, values: readonly string[]) {
  expect(new Set(values).size, `${label} should be unique`).toBe(values.length);
}

function getParticipantCountryIds(match: (typeof appData.matches)[number]): readonly CountryId[] {
  return [match.homeParticipant, match.awayParticipant]
    .filter((participant) => participant.type === "slot")
    .map((participant) => participant.countryId)
    .filter((participantCountryId): participantCountryId is CountryId =>
      Boolean(participantCountryId),
    );
}

function getParticipantSlotIds(match: (typeof appData.matches)[number]): readonly SlotId[] {
  return [match.homeParticipant, match.awayParticipant]
    .filter((participant) => participant.type === "slot")
    .map((participant) => participant.slotId);
}

function getMatchGroupCode(match: Match): GroupCode | null {
  return "groupCode" in match && match.groupCode ? match.groupCode : null;
}

describe("tournament data integrity", () => {
  it("keeps primary entity ids unique", () => {
    expectUniqueValues(
      "country ids",
      appData.countries.map((country) => country.id),
    );
    expectUniqueValues(
      "FIFA country codes",
      appData.countries.map((country) => country.fifaCode),
    );
    expectUniqueValues(
      "group codes",
      appData.groups.map((group) => group.code),
    );
    expectUniqueValues(
      "slot ids",
      appData.slotEntries.map((slotEntry) => slotEntry.slotId),
    );
    expectUniqueValues(
      "venue ids",
      appData.venues.map((venue) => venue.id),
    );
    expectUniqueValues(
      "match ids",
      appData.matches.map((match) => match.id),
    );
    expectUniqueValues(
      "match numbers",
      appData.matches.map((match) => String(match.matchNumber)),
    );
  });

  it("keeps the expected tournament shell shape", () => {
    expect(appData.groups).toHaveLength(12);
    expect(appData.slotEntries).toHaveLength(48);
    expect(appData.venues).toHaveLength(16);
  });

  it("keeps every group with four ordered slots", () => {
    const slotEntriesByGroup = new Map<string, number[]>();

    for (const slotEntry of appData.slotEntries) {
      const currentSlotIndexes = slotEntriesByGroup.get(slotEntry.groupCode) ?? [];
      slotEntriesByGroup.set(slotEntry.groupCode, [...currentSlotIndexes, slotEntry.slotIndex]);
    }

    for (const group of appData.groups) {
      const slotIndexes = slotEntriesByGroup
        .get(group.code)
        ?.slice()
        .sort((left, right) => left - right);
      expect(slotIndexes, `Group ${group.code} should have slots 1-4`).toEqual([1, 2, 3, 4]);
    }
  });

  it("keeps group slot declarations aligned with slot entries", () => {
    const slotEntryIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));

    for (const group of appData.groups) {
      expect(group.slots).toHaveLength(4);

      for (const slotId of group.slots) {
        expect(slotEntryIds.has(slotId), `${slotId} should have a slot entry`).toBe(true);
      }
    }
  });

  it("keeps slot entries referencing known groups and countries", () => {
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const countryIds = new Set(appData.countries.map((country) => country.id));

    for (const slotEntry of appData.slotEntries) {
      expect(
        groupCodes.has(slotEntry.groupCode),
        `${slotEntry.slotId} should reference a known group`,
      ).toBe(true);

      if (slotEntry.countryId) {
        expect(
          countryIds.has(slotEntry.countryId),
          `${slotEntry.slotId} should reference a known country`,
        ).toBe(true);
      }
    }
  });

  it("keeps matches referencing known participants, groups, and venues", () => {
    const slotIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));
    const countryIds = new Set(appData.countries.map((country) => country.id));
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const venueIds = new Set(appData.venues.map((venue) => venue.id));
    const matchIds = new Set(appData.matches.map((match) => match.id));

    for (const match of appData.matches) {
      expect(venueIds.has(match.venueId), `${match.id} should reference a known venue`).toBe(true);

      const groupCode = getMatchGroupCode(match);
      if (groupCode) {
        expect(groupCodes.has(groupCode), `${match.id} should reference a known group`).toBe(true);
      }

      for (const participant of [match.homeParticipant, match.awayParticipant]) {
        if (participant.type === "slot") {
          expect(slotIds.has(participant.slotId), `${match.id} should reference a known slot`).toBe(
            true,
          );

          if (participant.countryId) {
            expect(
              countryIds.has(participant.countryId),
              `${match.id} should reference a known participant country`,
            ).toBe(true);
          }
        }

        if (participant.type === "groupPlacement") {
          expect(
            groupCodes.has(participant.groupCode),
            `${match.id} should reference a known participant group`,
          ).toBe(true);
        }

        if (participant.type === "thirdPlaceQualifier") {
          for (const candidateGroupCode of participant.candidateGroupCodes) {
            expect(
              groupCodes.has(candidateGroupCode),
              `${match.id} should reference a known third-place candidate group`,
            ).toBe(true);
          }
        }

        if (participant.type === "matchWinner" || participant.type === "matchLoser") {
          expect(
            matchIds.has(participant.matchId),
            `${match.id} should reference a known prior match`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps assigned group-stage match countries aligned with their slots", () => {
    const countryIdBySlotId = new Map(
      appData.slotEntries.map((slotEntry) => [slotEntry.slotId, slotEntry.countryId]),
    );

    for (const match of appData.matches.filter((candidate) => candidate.stage === "group")) {
      for (const participant of [match.homeParticipant, match.awayParticipant]) {
        if (participant.type !== "slot" || !participant.countryId) continue;

        expect(participant.countryId, `${match.id} country should match slot`).toBe(
          countryIdBySlotId.get(participant.slotId),
        );
      }
    }
  });

  it("keeps group-stage matches using two different slots", () => {
    for (const match of appData.matches.filter((candidate) => candidate.stage === "group")) {
      const slotIds = getParticipantSlotIds(match);

      expect(slotIds).toHaveLength(2);
      expect(slotIds[0], `${match.id} should not use the same slot twice`).not.toBe(slotIds[1]);
    }
  });

  it("keeps venue coordinates plausible", () => {
    for (const venue of appData.venues) {
      expect(venue.geoPoint.latitude, `${venue.name} latitude`).toBeGreaterThanOrEqual(-90);
      expect(venue.geoPoint.latitude, `${venue.name} latitude`).toBeLessThanOrEqual(90);
      expect(venue.geoPoint.longitude, `${venue.name} longitude`).toBeGreaterThanOrEqual(-180);
      expect(venue.geoPoint.longitude, `${venue.name} longitude`).toBeLessThanOrEqual(180);
    }
  });

  it("can derive country ids from slot participants", () => {
    const countryIds = appData.matches.flatMap((match) => getParticipantCountryIds(match));

    expect(countryIds).toContain(countryId("jpn"));
    expect(countryIds).toContain(countryId("mex"));
  });
});
