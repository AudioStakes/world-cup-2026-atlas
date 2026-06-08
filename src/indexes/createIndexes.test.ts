import { describe, expect, it } from "vitest";
import { appData } from "../data/appData";
import { countryId, groupCode, venueId } from "../domain/ids";
import { createIndexes } from "./createIndexes";

describe("createIndexes", () => {
  it("creates lookup maps for primary entities", () => {
    const indexes = createIndexes(appData);

    expect(indexes.countriesById.get(countryId("jpn"))?.fifaCode).toBe("JPN");
    expect(indexes.groupsByCode.get(groupCode("A"))?.name).toBe("Group A");
    expect(indexes.venuesById.get(venueId("seattle"))?.stadiumName).toBe("Lumen Field");
  });

  it("indexes matches by country, group, and venue", () => {
    const indexes = createIndexes(appData);

    expect(indexes.matchesByCountryId.get(countryId("jpn"))?.length).toBe(3);
    expect(indexes.matchesByGroupCode.get(groupCode("F"))?.length).toBe(6);
    expect(indexes.matchesByVenueId.get(venueId("dallas"))?.length).toBe(5);
  });
});
