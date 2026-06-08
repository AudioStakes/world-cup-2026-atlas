import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId, groupCode, localDate, venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createResultViewModel } from "./createResultViewModel";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createResultForCountry(countryKey: string) {
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

function createResultForDate(date: string) {
  const matches = appData.matches.filter((match) => match.date === localDate(date));

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedDate: localDate(date) },
    matches,
  );
}

function createResultForVenue(venueKey: string) {
  const selectedVenueId = venueId(venueKey);
  const matches = appData.matches.filter((match) => match.venueId === selectedVenueId);

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedVenueId },
    matches,
  );
}

function createResultForGroup(groupKey: string) {
  const selectedGroupCode = groupCode(groupKey);
  const matches = appData.matches.filter(
    (match) =>
      match.stage === "group" && "groupCode" in match && match.groupCode === selectedGroupCode,
  );

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedGroupCode },
    matches,
  );
}

describe("createResultViewModel production metadata", () => {
  it("adds FIFA code and confederation to country result subtitles", () => {
    const result = createResultForCountry("jpn");

    expect(result.title).toBe("Japan");
    expect(result.subtitle).toBe("Group F · JPN · AFC");
  });

  it("adds group team FIFA codes to group result subtitles", () => {
    const result = createResultForGroup("F");

    expect(result.title).toBe("Group F");
    expect(result.subtitle).toBe("6 matches · NED · JPN · SWE · TUN");
  });

  it("adds host country metadata to country result subtitles", () => {
    const result = createResultForCountry("usa");

    expect(result.title).toBe("United States");
    expect(result.subtitle).toBe("Group D · USA · CONCACAF");
  });

  it("adds match number and group labels for group-stage matches", () => {
    const result = createResultForDate("2026-06-14");
    const japanMatch = result.matches.find((match) => match.matchNumberLabel === "Match 11");

    expect(japanMatch?.stageLabel).toBe("Group F");
    expect(japanMatch?.secondaryText).toBe("15:00 CT");
  });

  it("adds final stage labels and time zone abbreviations for knockout matches", () => {
    const result = createResultForDate("2026-07-19");
    const final = result.matches[0];

    expect(final?.matchNumberLabel).toBe("Match 104");
    expect(final?.stageLabel).toBe("Final");
    expect(final?.secondaryText).toBe("15:00 ET");
  });

  it("adds production venue metadata to venue result subtitles", () => {
    const result = createResultForVenue("dallas");

    expect(result.title).toBe("Dallas");
    expect(result.subtitle).toBe("AT&T Stadium · Arlington, USA · CT");
  });

  it("formats non-USA venue result subtitles with host country names", () => {
    const result = createResultForVenue("vancouver");

    expect(result.title).toBe("Vancouver");
    expect(result.subtitle).toBe("BC Place · Vancouver, Canada · PT");
  });
});
