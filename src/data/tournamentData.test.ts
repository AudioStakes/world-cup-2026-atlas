import { describe, expect, it } from "vitest";
import { appData } from "./appData";

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

  it("keeps matches linked to known slots, venues, groups, and countries", () => {
    const countryIds = new Set(appData.countries.map((country) => country.id));
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const slotIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));
    const venueIds = new Set(appData.venues.map((venue) => venue.id));

    for (const match of appData.matches) {
      expect(venueIds.has(match.venueId)).toBe(true);
      expect(slotIds.has(match.homeSlotId)).toBe(true);
      expect(slotIds.has(match.awaySlotId)).toBe(true);

      if (match.groupCode) {
        expect(groupCodes.has(match.groupCode)).toBe(true);
      }

      if (match.homeCountryId) {
        expect(countryIds.has(match.homeCountryId)).toBe(true);
      }

      if (match.awayCountryId) {
        expect(countryIds.has(match.awayCountryId)).toBe(true);
      }
    }
  });
});
