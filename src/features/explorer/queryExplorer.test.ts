import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId, groupCode, localDate, matchId, venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import type { MatchResultsSnapshot } from "../../matchResults/types";
import { browserLocalDisplayTimeZoneId } from "./displayTimeZone";
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

  it("uses browser local time as a header display option", () => {
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedDate: localDate("2026-06-20") }),
      null,
      browserLocalDisplayTimeZoneId,
      "Asia/Tokyo",
    );

    expect(viewModel.header.timeZoneSelector.selectedValue).toBe(browserLocalDisplayTimeZoneId);
    expect(viewModel.header.timeZoneSelector.options[0]).toEqual({
      value: browserLocalDisplayTimeZoneId,
      label: "Your local time",
      detailLabel: "JST · Asia/Tokyo",
    });
    expect(viewModel.explorePanel.result.subtitle).toBe("4 matches · 02:00–13:00 · JST");
  });

  it("includes runtime match result snapshots in the result ViewModel", () => {
    const snapshot: MatchResultsSnapshot = {
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-14T22:00:00.000Z",
      matches: [
        {
          matchId: matchId("match-011"),
          provider: "api-football",
          providerFixtureId: 1011,
          status: "finished",
          shortStatus: "FT",
          elapsed: 90,
          homeTeamId: countryId("ned"),
          awayTeamId: countryId("jpn"),
          homeScore: 2,
          awayScore: 1,
          kickoffAt: "2026-06-14T20:00:00.000Z",
          updatedAt: "2026-06-14T22:00:00.000Z",
        },
      ],
    };
    const viewModel = queryExplorer(
      appData,
      indexes,
      createViewState({ selectedGroupCode: groupCode("F") }),
      null,
      undefined,
      null,
      snapshot,
    );
    const resultMatch = viewModel.explorePanel.result.matches.find(
      (match) => match.matchNumberLabel === "Match 11",
    );

    expect(resultMatch).toMatchObject({
      homeScoreLabel: "2",
      awayScoreLabel: "1",
      scoreLineLabel: "2-1",
      normalizedStatus: "finished",
      shortStatusLabel: "FT",
      statusLabel: "Full time",
    });
  });
});
