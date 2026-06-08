import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createResultViewModel } from "./createResultViewModel";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createCountryResult(countryKey: string) {
  const selectedCountryId = countryId(countryKey);
  const matches = appData.matches.filter(
    (match) =>
      match.homeParticipant.type === "slot" &&
      match.awayParticipant.type === "slot" &&
      (match.homeParticipant.countryId === selectedCountryId ||
        match.awayParticipant.countryId === selectedCountryId),
  );

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedCountryId },
    matches,
  );
}

describe("country route summaries", () => {
  it("clarifies repeated venue visits for Japan", () => {
    const result = createCountryResult("jpn");

    expect(result.matches.map((match) => match.matchNumberLabel)).toEqual([
      "Match 11",
      "Match 36",
      "Match 57",
    ]);
    expect(result.matches.map((match) => match.venueLabel)).toEqual([
      "Dallas",
      "Monterrey",
      "Dallas",
    ]);
    expect(result.routeSummary).toMatchObject({
      matchCount: 3,
      visitedVenueCount: 2,
      itineraryLabel: "3 matches · 2 venues",
      totalDistanceLabel: "1,688 km",
    });
  });
});
