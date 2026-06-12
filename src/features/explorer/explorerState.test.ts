import { describe, expect, it } from "vitest";

import { appData } from "../../data/appData";
import { countryId, groupCode, localDate, venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { normalizeExplorerViewState } from "./normalizeExplorerViewState";
import { parseExplorerSearchParams } from "./parseExplorerSearchParams";
import { resolveInitialExplorerViewState } from "./resolveInitialExplorerViewState";
import { serializeExplorerSearchParams } from "./serializeExplorerSearchParams";
import type { NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";
import { updateExplorerViewState } from "./updateExplorerViewState";

const indexes = createIndexes(appData);

function makeState(
  overrides: Partial<NormalizedExplorerViewState> = {},
): NormalizedExplorerViewState {
  return { ...emptyExplorerViewState, ...overrides };
}

describe("explorer URL state", () => {
  it("parses known query parameters into a normalized view state", () => {
    const viewState = parseExplorerSearchParams(
      "?country=JPN&group=f&date=2026-06-14&venue=Dallas",
      indexes,
    );

    expect(viewState).toEqual({
      selectedCountryId: countryId("jpn"),
      selectedGroupCode: groupCode("F"),
      selectedDate: localDate("2026-06-14"),
      selectedVenueId: venueId("dallas"),
    });
  });

  it("serializes selected state with stable parameter order", () => {
    const serialized = serializeExplorerSearchParams(
      makeState({
        selectedCountryId: countryId("jpn"),
        selectedDate: localDate("2026-06-14"),
        selectedVenueId: venueId("dallas"),
      }),
    );

    expect(serialized).toBe("?country=jpn&date=2026-06-14&venue=dallas");
  });

  it("uses URL parameters before the default A1 fallback", () => {
    const viewState = resolveInitialExplorerViewState("?country=jpn", indexes);

    expect(viewState.selectedCountryId).toBe(countryId("jpn"));
  });

  it("falls back to the A1 country when the URL has no explorer parameters", () => {
    const viewState = resolveInitialExplorerViewState("", indexes);

    expect(viewState).toEqual(makeState({ selectedCountryId: countryId("mex") }));
  });

  it("drops invalid ids while normalizing state", () => {
    const normalized = normalizeExplorerViewState(
      makeState({
        selectedCountryId: countryId("not-a-country"),
        selectedGroupCode: groupCode("not-a-group"),
        selectedVenueId: venueId("not-a-venue"),
      }),
      indexes,
    );

    expect(normalized).toEqual(emptyExplorerViewState);
  });
});

describe("queryMatchesByViewState", () => {
  it("filters matches with AND semantics", () => {
    const matches = queryMatchesByViewState(
      appData,
      makeState({
        selectedCountryId: countryId("jpn"),
        selectedDate: localDate("2026-06-14"),
      }),
    );

    expect(matches.map((match) => match.id)).toEqual(["match-011"]);
  });
});

describe("updateExplorerViewState", () => {
  it("selects and toggles a country", () => {
    const selected = updateExplorerViewState(appData, indexes, emptyExplorerViewState, {
      type: "selectCountry",
      countryId: countryId("jpn"),
    });

    expect(selected.selectedCountryId).toBe(countryId("jpn"));

    const cleared = updateExplorerViewState(appData, indexes, selected, {
      type: "selectCountry",
      countryId: countryId("jpn"),
    });

    expect(cleared.selectedCountryId).toBeNull();
  });

  it("keeps only a newly selected date after a country selection", () => {
    const currentState = makeState({ selectedCountryId: countryId("jpn") });
    const nextState = updateExplorerViewState(appData, indexes, currentState, {
      type: "selectDate",
      date: localDate("2026-06-14"),
    });

    expect(nextState).toEqual(makeState({ selectedDate: localDate("2026-06-14") }));
  });

  it("keeps only a newly selected country after a group selection", () => {
    const currentState = makeState({ selectedGroupCode: groupCode("F") });
    const nextState = updateExplorerViewState(appData, indexes, currentState, {
      type: "selectCountry",
      countryId: countryId("jpn"),
    });

    expect(nextState).toEqual(makeState({ selectedCountryId: countryId("jpn") }));
  });

  it("keeps only a newly selected venue after a date selection", () => {
    const currentState = makeState({ selectedDate: localDate("2026-06-14") });
    const nextState = updateExplorerViewState(appData, indexes, currentState, {
      type: "selectVenue",
      venueId: venueId("los-angeles"),
    });

    expect(nextState).toEqual(makeState({ selectedVenueId: venueId("los-angeles") }));
  });

  it("clears all selections", () => {
    const currentState = makeState({
      selectedCountryId: countryId("jpn"),
      selectedDate: localDate("2026-06-14"),
    });

    expect(updateExplorerViewState(appData, indexes, currentState, { type: "clearAll" })).toEqual(
      emptyExplorerViewState,
    );
  });
});
