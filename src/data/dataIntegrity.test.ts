import { describe, expect, it } from "vitest";
import { appData } from "./appData";

function expectUniqueValues(label: string, values: readonly string[]) {
  expect(new Set(values).size, `${label} should be unique`).toBe(values.length);
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

  it("keeps matches referencing known slots, countries, groups, and venues", () => {
    const slotIds = new Set(appData.slotEntries.map((slotEntry) => slotEntry.slotId));
    const countryIds = new Set(appData.countries.map((country) => country.id));
    const groupCodes = new Set(appData.groups.map((group) => group.code));
    const venueIds = new Set(appData.venues.map((venue) => venue.id));

    for (const match of appData.matches) {
      expect(slotIds.has(match.homeSlotId), `${match.id} should reference a known home slot`).toBe(
        true,
      );
      expect(slotIds.has(match.awaySlotId), `${match.id} should reference a known away slot`).toBe(
        true,
      );
      expect(match.homeSlotId, `${match.id} should not use the same slot twice`).not.toBe(
        match.awaySlotId,
      );
      expect(venueIds.has(match.venueId), `${match.id} should reference a known venue`).toBe(true);

      if (match.groupCode) {
        expect(groupCodes.has(match.groupCode), `${match.id} should reference a known group`).toBe(
          true,
        );
      }

      if (match.homeCountryId) {
        expect(
          countryIds.has(match.homeCountryId),
          `${match.id} should reference a known home country`,
        ).toBe(true);
      }

      if (match.awayCountryId) {
        expect(
          countryIds.has(match.awayCountryId),
          `${match.id} should reference a known away country`,
        ).toBe(true);
      }
    }
  });

  it("keeps assigned match countries aligned with their slots", () => {
    const countryIdBySlotId = new Map(
      appData.slotEntries.map((slotEntry) => [slotEntry.slotId, slotEntry.countryId]),
    );

    for (const match of appData.matches) {
      const homeSlotCountryId = countryIdBySlotId.get(match.homeSlotId);
      const awaySlotCountryId = countryIdBySlotId.get(match.awaySlotId);

      if (match.homeCountryId && homeSlotCountryId) {
        expect(match.homeCountryId, `${match.id} home country should match home slot`).toBe(
          homeSlotCountryId,
        );
      }

      if (match.awayCountryId && awaySlotCountryId) {
        expect(match.awayCountryId, `${match.id} away country should match away slot`).toBe(
          awaySlotCountryId,
        );
      }
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
});
