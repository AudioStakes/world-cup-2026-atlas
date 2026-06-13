import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId, groupCode, localDate, venueId } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import { createIndexes } from "../../indexes/createIndexes";
import { createResultViewModel } from "./createResultViewModel";
import { browserLocalDisplayTimeZoneId } from "./displayTimeZone";
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

function createResultForDate(
  date: string,
  displayTimeZoneId: string | undefined = undefined,
  browserLocalTimeZone: string | null = null,
) {
  const matches = appData.matches.filter((match) => match.date === localDate(date));

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedDate: localDate(date) },
    matches,
    displayTimeZoneId,
    browserLocalTimeZone,
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

function withFinishedMatch(matchNumber: number, homeGoals: number, awayGoals: number): AppData {
  return {
    ...appData,
    matches: appData.matches.map((match) =>
      match.matchNumber === matchNumber
        ? {
            ...match,
            result: {
              provider: "manual",
              status: "finished",
              shortStatus: "FT",
              homeGoals,
              awayGoals,
            },
          }
        : match,
    ),
  };
}

describe("createResultViewModel production metadata", () => {
  it("adds FIFA code and confederation to country result subtitles", () => {
    const result = createResultForCountry("jpn");

    expect(result.title).toBe("Japan");
    expect(result.subtitle).toBe("Group F · JPN · AFC");
    expect(result.groupNavigation).toEqual({
      groupCode: groupCode("F"),
      label: "Group F",
      trailingLabel: "JPN · AFC",
      href: "?group=F",
      ariaLabel: "Show Group F details",
    });
    expect(result.routeSummary?.venueCountExplanationLabel).toBe("Dallas is visited twice.");
    expect(result.details).toMatchObject({
      type: "country",
      metrics: expect.arrayContaining([
        { label: "FIFA ranking", value: "#18 · Jun 11" },
        { label: "Previous World Cup", value: "Round of 16" },
        { label: "Group", value: "Group F" },
      ]),
    });
  });

  it("omits country route summary when another active filter removes all country matches", () => {
    const result = createResultViewModel(
      appData,
      indexes,
      {
        ...emptyExplorerViewState,
        selectedCountryId: countryId("jpn"),
        selectedDate: localDate("2026-07-12"),
      },
      [],
    );

    expect(result.emptyMessage).toBe("No matches found for the current selection.");
    expect(result.routeSummary).toBeNull();
  });

  it("adds group team FIFA codes to group result subtitles", () => {
    const result = createResultForGroup("F");

    expect(result.title).toBe("Group F");
    expect(result.subtitle).toBe("6 matches · NED · JPN · SWE · TUN");
    expect(result.groupNavigation).toBeNull();
    expect(result.details).toMatchObject({
      type: "group",
      standings: expect.arrayContaining([
        expect.objectContaining({
          teamLabel: "🇯🇵 Japan",
          teamCodeLabel: "JPN",
          played: 0,
          points: 0,
          form: expect.arrayContaining([
            expect.objectContaining({
              result: "pending",
              label: "Fixture pending",
            }),
          ]),
        }),
      ]),
    });
  });

  it("renders completed match scores and folds them into group standings", () => {
    const data = withFinishedMatch(11, 2, 1);
    const finishedIndexes = createIndexes(data);
    const selectedGroupCode = groupCode("F");
    const matches = data.matches.filter(
      (match) =>
        match.stage === "group" && "groupCode" in match && match.groupCode === selectedGroupCode,
    );
    const result = createResultViewModel(
      data,
      finishedIndexes,
      { ...emptyExplorerViewState, selectedGroupCode },
      matches,
    );
    const finishedMatch = result.matches.find((match) => match.matchNumberLabel === "Match 11");
    const standings = result.details?.type === "group" ? result.details.standings : [];

    expect(finishedMatch).toMatchObject({
      homeScoreLabel: "2",
      awayScoreLabel: "1",
      winningSide: "home",
      scoreLineLabel: "2-1",
      normalizedStatus: "finished",
      shortStatusLabel: "FT",
      statusLabel: "Full time",
    });
    expect(standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamLabel: "🇳🇱 Netherlands",
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 2,
          goalsAgainst: 1,
          goalDifferenceLabel: "+1",
          points: 3,
          position: 1,
          form: expect.arrayContaining([
            expect.objectContaining({
              result: "win",
              label: "Win 2-1",
            }),
          ]),
        }),
        expect.objectContaining({
          teamLabel: "🇯🇵 Japan",
          played: 1,
          won: 0,
          drawn: 0,
          lost: 1,
          goalsFor: 1,
          goalsAgainst: 2,
          goalDifferenceLabel: "-1",
          points: 0,
          form: expect.arrayContaining([
            expect.objectContaining({
              result: "loss",
              label: "Loss 1-2",
            }),
          ]),
        }),
      ]),
    );
  });

  it("renders live provider scores without folding them into group standings", () => {
    const data = {
      ...appData,
      matches: appData.matches.map((match) =>
        match.matchNumber === 11
          ? {
              ...match,
              result: {
                provider: "api-football" as const,
                providerFixtureId: 1001,
                status: "live" as const,
                shortStatus: "1H",
                elapsed: 38,
                homeGoals: 1,
                awayGoals: 0,
                kickoffAt: "2026-06-14T20:00:00.000Z",
                updatedAt: "2026-06-14T20:38:00.000Z",
              },
            }
          : match,
      ),
    };
    const liveIndexes = createIndexes(data);
    const selectedGroupCode = groupCode("F");
    const matches = data.matches.filter(
      (match) =>
        match.stage === "group" && "groupCode" in match && match.groupCode === selectedGroupCode,
    );
    const result = createResultViewModel(
      data,
      liveIndexes,
      { ...emptyExplorerViewState, selectedGroupCode },
      matches,
    );
    const liveMatch = result.matches.find((match) => match.matchNumberLabel === "Match 11");
    const standings = result.details?.type === "group" ? result.details.standings : [];

    expect(liveMatch).toMatchObject({
      homeScoreLabel: "1",
      awayScoreLabel: "0",
      winningSide: null,
      scoreLineLabel: "1-0",
      normalizedStatus: "live",
      shortStatusLabel: "1H",
      statusLabel: "Live",
    });
    expect(standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamLabel: "🇳🇱 Netherlands",
          played: 0,
          points: 0,
        }),
      ]),
    );
  });

  it("adds kickoff range and time-zone summary to multi-match date result subtitles", () => {
    const result = createResultForDate("2026-06-14");
    const scrollTargetIndex = result.matches.findIndex((match) => match.isInitialScrollTarget);

    expect(result.title).toBe("Jun 14");
    expect(result.subtitle).toBe("4 matches · 12:00–20:00 · CT/ET");
    expect(result.details).toBeNull();
    expect(result.matches.length).toBeGreaterThan(4);
    expect(result.matches[0]?.dateHeadingLabel).toBe("Thursday 11 June 2026");
    expect(scrollTargetIndex).toBeGreaterThan(0);
    expect(result.matches[scrollTargetIndex]?.dateHeadingLabel).toBe("Sunday 14 June 2026");
  });

  it("adds singular kickoff metadata to one-match date result subtitles", () => {
    const result = createResultForDate("2026-07-19");

    expect(result.title).toBe("Jul 19");
    expect(result.subtitle).toBe("1 match · 15:00 · ET");
  });

  it("converts date result match cards into a selected country's time zone", () => {
    const result = createResultForDate("2026-06-20", countryId("jpn"));
    const scrollTargetMatch = result.matches.find((match) => match.isInitialScrollTarget);
    const japanMatch = result.matches.find((match) => match.matchNumberLabel === "Match 36");

    expect(result.subtitle).toBe("4 matches · 02:00–13:00 · JST");
    expect(scrollTargetMatch?.matchNumberLabel).toBe("Match 35");
    expect(scrollTargetMatch?.dateHeadingLabel).toBe("Sunday 21 June 2026");
    expect(scrollTargetMatch?.kickoffLabel).toBe("02:00");
    expect(scrollTargetMatch?.secondaryText).toBe("02:00 JST");
    expect(japanMatch?.kickoffLabel).toBe("13:00");
    expect(japanMatch?.dateLabel).toBe("Sun Jun 21");
  });

  it("converts date result match cards into the browser local time zone", () => {
    const result = createResultForDate("2026-06-20", browserLocalDisplayTimeZoneId, "Asia/Tokyo");
    const scrollTargetMatch = result.matches.find((match) => match.isInitialScrollTarget);
    const japanMatch = result.matches.find((match) => match.matchNumberLabel === "Match 36");

    expect(result.subtitle).toBe("4 matches · 02:00–13:00 · JST");
    expect(scrollTargetMatch?.matchNumberLabel).toBe("Match 35");
    expect(scrollTargetMatch?.dateHeadingLabel).toBe("Sunday 21 June 2026");
    expect(scrollTargetMatch?.kickoffLabel).toBe("02:00");
    expect(scrollTargetMatch?.secondaryText).toBe("02:00 JST");
    expect(japanMatch?.kickoffLabel).toBe("13:00");
    expect(japanMatch?.dateLabel).toBe("Sun Jun 21");
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
    expect(japanMatch?.dateLabel).toBe("Sun Jun 14");
    expect(japanMatch?.dateHeadingLabel).toBe("Sunday 14 June 2026");
    expect(japanMatch?.homeTeam).toEqual({
      countryId: countryId("ned"),
      flagEmoji: "🇳🇱",
      displayName: "Netherlands",
      code: "NED",
    });
    expect(japanMatch?.awayTeam).toEqual({
      countryId: countryId("jpn"),
      flagEmoji: "🇯🇵",
      displayName: "Japan",
      code: "JPN",
    });
    expect(japanMatch?.matchupText).toBe("🇳🇱 NED vs 🇯🇵 JPN");
    expect(japanMatch?.matchupAriaLabel).toBe("🇳🇱 Netherlands vs 🇯🇵 Japan");
    expect(japanMatch?.kickoffLabel).toBe("15:00");
    expect(japanMatch?.secondaryText).toBe("15:00 CT");
    expect(japanMatch?.stageMetaLabel).toBe("First Stage");
    expect(japanMatch?.groupCode).toBe(groupCode("F"));
    expect(japanMatch?.groupLabel).toBe("Group F");
    expect(japanMatch?.fixtureMetaLabel).toBe("First Stage · Group F · AT&T Stadium (Dallas)");
    expect(japanMatch?.venueLabel).toBe("Dallas");
    expect(japanMatch?.venueFixtureLabel).toBe("AT&T Stadium (Dallas)");
    expect(japanMatch?.venueDetailLabel).toBe("AT&T Stadium · Arlington, USA · CT");
  });

  it("adds final stage labels and venue details for knockout matches", () => {
    const result = createResultForDate("2026-07-19");
    const final = result.matches.find((match) => match.matchNumberLabel === "Match 104");

    expect(final?.matchNumberLabel).toBe("Match 104");
    expect(final?.stageLabel).toBe("Final");
    expect(final?.stageMetaLabel).toBe("Final");
    expect(final?.groupCode).toBeNull();
    expect(final?.groupLabel).toBeNull();
    expect(final?.dateLabel).toBe("Sun Jul 19");
    expect(final?.secondaryText).toBe("15:00 ET");
    expect(final?.venueLabel).toBe("New York / New Jersey");
    expect(final?.venueDetailLabel).toBe("MetLife Stadium · East Rutherford, USA · ET");
  });

  it("adds production venue metadata to venue result subtitles", () => {
    const result = createResultForVenue("dallas");

    expect(result.title).toBe("Dallas");
    expect(result.subtitle).toBe("AT&T Stadium · Arlington, USA · CT");
    expect(result.details).toMatchObject({
      type: "venue",
      metrics: expect.arrayContaining([
        { label: "Stadium", value: "AT&T Stadium" },
        { label: "City", value: "Arlington, USA" },
        { label: "Time zone", value: "CT · America/Chicago" },
      ]),
    });
  });

  it("formats non-USA venue result subtitles with host country names", () => {
    const result = createResultForVenue("vancouver");

    expect(result.title).toBe("Vancouver");
    expect(result.subtitle).toBe("BC Place · Vancouver, Canada · PT");
  });
});
