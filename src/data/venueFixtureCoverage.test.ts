import { describe, expect, it } from "vitest";
import { venueId } from "../domain/ids";
import type { Match, Venue } from "../domain/types";
import { appData } from "./appData";

const expectedVenueMatchCounts = {
  atlanta: 8,
  boston: 7,
  dallas: 9,
  guadalajara: 4,
  houston: 7,
  "kansas-city": 6,
  "los-angeles": 8,
  "mexico-city": 5,
  miami: 7,
  monterrey: 4,
  "new-york-new-jersey": 8,
  philadelphia: 6,
  "san-francisco-bay-area": 6,
  seattle: 6,
  toronto: 6,
  vancouver: 7,
} as const;

const expectedKnockoutVenueMatchCounts = {
  atlanta: 3,
  boston: 2,
  dallas: 4,
  houston: 2,
  "kansas-city": 2,
  "los-angeles": 3,
  "mexico-city": 2,
  miami: 3,
  monterrey: 1,
  "new-york-new-jersey": 3,
  philadelphia: 1,
  "san-francisco-bay-area": 1,
  seattle: 2,
  toronto: 1,
  vancouver: 2,
} as const;

function getVenueMatches(venue: Venue): readonly Match[] {
  return appData.matches.filter((match) => match.venueId === venue.id);
}

function getVenueKnockoutMatches(venue: Venue): readonly Match[] {
  return getVenueMatches(venue).filter((match) => match.stage !== "group");
}

describe("venue fixture coverage", () => {
  it("keeps every venue represented in the 104-match schedule", () => {
    expect(appData.venues).toHaveLength(16);

    for (const venue of appData.venues) {
      expect(
        getVenueMatches(venue).length,
        `${venue.id} should have at least one match`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps venue match counts stable", () => {
    for (const [venueKey, expectedCount] of Object.entries(expectedVenueMatchCounts)) {
      expect(
        appData.matches.filter((match) => match.venueId === venueId(venueKey)).length,
        `${venueKey} total match count`,
      ).toBe(expectedCount);
    }
  });

  it("keeps venue knockout match counts stable", () => {
    for (const [venueKey, expectedCount] of Object.entries(expectedKnockoutVenueMatchCounts)) {
      expect(
        appData.matches.filter(
          (match) => match.venueId === venueId(venueKey) && match.stage !== "group",
        ).length,
        `${venueKey} knockout match count`,
      ).toBe(expectedCount);
    }

    expect(appData.matches.filter((match) => match.stage !== "group")).toHaveLength(32);
  });

  it("keeps host-country venue totals stable", () => {
    const matchCountByHostCountry = new Map<string, number>();

    for (const venue of appData.venues) {
      const currentCount = matchCountByHostCountry.get(venue.countryCode) ?? 0;
      matchCountByHostCountry.set(venue.countryCode, currentCount + getVenueMatches(venue).length);
    }

    expect(Object.fromEntries(matchCountByHostCountry.entries())).toEqual({
      CAN: 13,
      MEX: 13,
      USA: 78,
    });
  });

  it("keeps key final-week venue assignments stable", () => {
    expect(appData.matches.find((match) => match.matchNumber === 101)?.venueId).toBe(
      venueId("dallas"),
    );
    expect(appData.matches.find((match) => match.matchNumber === 102)?.venueId).toBe(
      venueId("atlanta"),
    );
    expect(appData.matches.find((match) => match.matchNumber === 103)?.venueId).toBe(
      venueId("miami"),
    );
    expect(appData.matches.find((match) => match.matchNumber === 104)?.venueId).toBe(
      venueId("new-york-new-jersey"),
    );
  });

  it("keeps all venue match lists sorted by match number without gaps inside each venue list", () => {
    for (const venue of appData.venues) {
      const venueMatches = getVenueMatches(venue);
      const sortedVenueMatchNumbers = venueMatches
        .map((match) => match.matchNumber)
        .slice()
        .sort((left, right) => left - right);

      expect(venueMatches.map((match) => match.matchNumber)).toEqual(sortedVenueMatchNumbers);
    }
  });

  it("keeps venues with knockout matches explicitly visible", () => {
    const venuesWithKnockoutMatches = appData.venues
      .filter((venue) => getVenueKnockoutMatches(venue).length > 0)
      .map((venue) => venue.id)
      .slice()
      .sort();

    expect(venuesWithKnockoutMatches).toEqual(
      Object.keys(expectedKnockoutVenueMatchCounts)
        .map((id) => venueId(id))
        .sort(),
    );
  });
});
