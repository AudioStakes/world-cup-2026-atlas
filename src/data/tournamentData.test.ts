import { describe, expect, it } from "vitest";
import type { SlotId } from "../domain/ids";
import { appData } from "./appData";
import { getMatchCountryIds, getParticipantSlotId } from "./matchParticipants";

function expectUnique<TValue>(values: readonly TValue[], label: string): void {
  expect(new Set(values).size, `${label} should be unique`).toBe(values.length);
}

describe("tournament data", () => {
  it("contains the expected group structure", () => {
    expect(appData.groups).toHaveLength(12);
    expect(appData.slotEntries).toHaveLength(48);

    for (const group of appData.groups) {
      expect(group.slots).toHaveLength(4);
    }
  });

  it("uses unique ids and codes", () => {
    expectUnique(
      appData.countries.map((country) => country.id),
      "country ids",
    );
    expectUnique(
      appData.countries.map((country) => country.fifaCode),
      "country FIFA codes",
    );
    expectUnique(
      appData.groups.map((group) => group.code),
      "group codes",
    );
    expectUnique(
      appData.slotEntries.map((slotEntry) => slotEntry.slotId),
      "slot ids",
    );
    expectUnique(
      appData.venues.map((venue) => venue.id),
      "venue ids",
    );
    expectUnique(
      appData.matches.map((match) => match.id),
      "match ids",
    );
    expectUnique(
      appData.matches.map((match) => match.matchNumber),
      "match numbers",
    );
  });

  it("keeps slot entries aligned with groups", () => {
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const countryIds = new Set(appData.countries.map((country) => country.id));

    for (const slotEntry of appData.slotEntries) {
      expect(groupCodes.has(slotEntry.groupCode)).toBe(true);
      expect(slotEntry.slotIndex).toBeGreaterThanOrEqual(1);
      expect(slotEntry.slotIndex).toBeLessThanOrEqual(4);

      if (slotEntry.countryId) {
        expect(countryIds.has(slotEntry.countryId)).toBe(true);
      }
    }
  });

  it("keeps matches linked to known participants, venues, groups, and countries", () => {
    const countryIds = new Set(appData.countries.map((country) => country.id));
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const slotIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));
    const venueIds = new Set(appData.venues.map((venue) => venue.id));

    for (const match of appData.matches) {
      expect(venueIds.has(match.venueId)).toBe(true);

      for (const participant of [match.homeParticipant, match.awayParticipant]) {
        if (participant.type === "slot") {
          expect(slotIds.has(participant.slotId)).toBe(true);
        }
      }

      for (const countryId of getMatchCountryIds(match)) {
        expect(countryIds.has(countryId)).toBe(true);
      }

      if (match.groupCode) {
        expect(groupCodes.has(match.groupCode)).toBe(true);
      }
    }
  });

  it("keeps group-stage matches linked to two known slots", () => {
    const slotIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));

    for (const match of appData.matches.filter((candidate) => candidate.stage === "group")) {
      const matchSlotIds = [match.homeParticipant, match.awayParticipant]
        .map((participant) => getParticipantSlotId(participant))
        .filter((slotId): slotId is SlotId => Boolean(slotId));

      expect(matchSlotIds).toHaveLength(2);
      expect(matchSlotIds.every((slotId) => slotIds.has(slotId))).toBe(true);
    }
  });
});
