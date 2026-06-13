import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId, groupCode, localDate, venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { queryExplorer } from "./queryExplorer";
import type { NormalizedExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createViewState(
  overrides: Partial<NormalizedExplorerViewState> = {},
): NormalizedExplorerViewState {
  return {
    selectedCountryId: null,
    selectedGroupCode: null,
    selectedDate: null,
    selectedVenueId: null,
    ...overrides,
  };
}

describe("queryExplorer", () => {
  it("creates a header, explore panel, and map view model", () => {
    const viewModel = queryExplorer(appData, indexes, createViewState());

    expect(viewModel.header.title).toBe("World Cup 2026 Atlas");
    expect(viewModel.explorePanel.groupsAndTeams.groups).toHaveLength(12);
    expect(viewModel.explorePanel.dateSelector.months.length).toBeGreaterThan(0);
    expect(viewModel.explorePanel.result.type).toBe("date");
    expect(viewModel.map.venueMarkers).toHaveLength(appData.venues.length);
  });

  it("marks selected and outside-current-filter teams for the groups table", () => {
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedCountryId: countryId("jpn") }),
    );

    const groupF = viewModel.explorePanel.groupsAndTeams.groups.find(
      (group) => group.groupCode === groupCode("F"),
    );
    const japan = groupF?.teams.find((team) => team.countryId === countryId("jpn"));
    const sweden = groupF?.teams.find((team) => team.countryId === countryId("swe"));

    const groupA = viewModel.explorePanel.groupsAndTeams.groups.find(
      (group) => group.groupCode === groupCode("A"),
    );

    expect(japan?.isSelected).toBe(true);
    expect(japan?.availability).toBe("available");
    expect(sweden?.availability).toBe("available");
    expect(groupF?.availability).toBe("available");
    expect(groupA?.availability).toBe("outsideCurrentFilter");
  });

  it("creates country-specific match copy without duplicating venue icons", () => {
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedCountryId: countryId("jpn") }),
    );

    const firstMatch = viewModel.explorePanel.result.matches[0];

    expect(firstMatch?.primaryText).toBe("vs 🇳🇱 Netherlands");
    expect(firstMatch?.venueLabel).toBe("Dallas");
    expect(firstMatch?.venueLabel).not.toContain("📍");
  });

  it("uses date as the result target when only a date is selected", () => {
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedDate: localDate("2026-06-11") }),
    );

    expect(viewModel.explorePanel.result.type).toBe("date");
    expect(viewModel.explorePanel.result.title).toBe("Jun 11");
  });

  it("uses venue as the result target and selected marker state", () => {
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedVenueId: venueId("dallas") }),
    );

    expect(viewModel.explorePanel.result.type).toBe("venue");

    const dallas = viewModel.map.venueMarkers.find((venue) => venue.venueId === venueId("dallas"));
    expect(dallas?.state).toBe("selected");
  });
});
