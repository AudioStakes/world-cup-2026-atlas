import { describe, expect, it } from "vitest";
import { venueId } from "../domain/ids";
import { appData } from "./appData";

const expectedVenueTimeZones = {
  vancouver: ["America/Vancouver", "PT"],
  seattle: ["America/Los_Angeles", "PT"],
  "san-francisco-bay-area": ["America/Los_Angeles", "PT"],
  "los-angeles": ["America/Los_Angeles", "PT"],
  guadalajara: ["America/Mexico_City", "CT"],
  "mexico-city": ["America/Mexico_City", "CT"],
  monterrey: ["America/Monterrey", "CT"],
  dallas: ["America/Chicago", "CT"],
  houston: ["America/Chicago", "CT"],
  "kansas-city": ["America/Chicago", "CT"],
  atlanta: ["America/New_York", "ET"],
  miami: ["America/New_York", "ET"],
  toronto: ["America/Toronto", "ET"],
  boston: ["America/New_York", "ET"],
  "new-york-new-jersey": ["America/New_York", "ET"],
  philadelphia: ["America/New_York", "ET"],
} as const;

describe("venue time zone data", () => {
  it("keeps every venue assigned to a production time zone", () => {
    for (const [venueKey, [ianaName, abbreviation]] of Object.entries(expectedVenueTimeZones)) {
      const venue = appData.venues.find((candidate) => candidate.id === venueId(venueKey));

      expect(venue?.timeZone).toEqual({ ianaName, abbreviation });
    }
  });

  it("keeps venue time zone abbreviations constrained to North American display buckets", () => {
    const abbreviations = new Set(appData.venues.map((venue) => venue.timeZone.abbreviation));

    expect(abbreviations).toEqual(new Set(["PT", "CT", "ET"]));
  });

  it("keeps all matches linked to venues with time zone data", () => {
    const venueById = new Map(appData.venues.map((venue) => [venue.id, venue]));

    for (const match of appData.matches) {
      const venue = venueById.get(match.venueId);

      expect(venue?.timeZone.ianaName, `Match ${match.matchNumber} time zone`).toBeTruthy();
      expect(
        venue?.timeZone.abbreviation,
        `Match ${match.matchNumber} time zone abbreviation`,
      ).toBeTruthy();
    }
  });
});
