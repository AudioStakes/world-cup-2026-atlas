import { calculateDistanceKm } from "../../calculations/calculateDistanceKm";
import {
  formatParticipantLabel,
  getMatchCountryIds,
  getOpponentCountryId,
  getParticipantCountryId,
} from "../../data/matchParticipants";
import type { CountryId, GroupCode } from "../../domain/ids";
import type {
  AppData,
  Country,
  HostCountryCode,
  Match,
  SlotEntry,
  TournamentStage,
  Venue,
} from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import {
  formatDateLabel,
  formatDistanceLabel,
  formatFullDateHeadingLabel,
  formatWeekdayDateLabel,
  getRequiredCountry,
} from "./formatExplorerLabels";
import type {
  CountryRouteSummaryViewModel,
  ExplorerDetailViewModel,
  ExplorerResultType,
  ExplorerResultViewModel,
  GroupStandingFormEntryViewModel,
  GroupStandingRowViewModel,
  MatchListItemViewModel,
  MatchTeamViewModel,
  NormalizedExplorerViewState,
  ResultGroupNavigationViewModel,
} from "./types";

const timeZoneDisplayOrder = ["PT", "MT", "CT", "ET"] as const;
const groupStandingFormSlotCount = 5;

export function createResultViewModel(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
): ExplorerResultViewModel {
  const resultType = deriveResultType(viewState);

  if (resultType === "empty") {
    return {
      type: "empty",
      icon: "🧭",
      title: "Start exploring",
      subtitle: "",
      groupNavigation: null,
      details: null,
      emptyMessage: "Select a group, team, date, or venue pin to see matching fixtures here.",
      matches: [],
      routeSummary: null,
    };
  }

  const title = createResultTitle(indexes, viewState, matchingMatches, resultType);

  return {
    type: resultType,
    icon: title.icon,
    title: title.title,
    subtitle: title.subtitle,
    groupNavigation: title.groupNavigation,
    details: createDetails(data, indexes, viewState, matchingMatches, resultType),
    emptyMessage:
      matchingMatches.length === 0 ? "No matches found for the current selection." : null,
    matches: createResultMatches(data, indexes, viewState, matchingMatches, resultType),
    routeSummary: shouldShowCountryRouteSummary(resultType, viewState)
      ? createCountryRouteSummary(data, indexes, viewState.selectedCountryId)
      : null,
  };
}

function createResultMatches(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
  resultType: ExplorerResultType,
): readonly MatchListItemViewModel[] {
  const matches =
    resultType === "date" && viewState.selectedDate
      ? sortMatchesChronologically(data.matches)
      : matchingMatches;
  const initialScrollTargetMatchId =
    resultType === "date" && viewState.selectedDate
      ? (matches.find((match) => match.date === viewState.selectedDate)?.id ?? null)
      : null;

  return matches.map((match) =>
    createMatchListItem(indexes, viewState, match, match.id === initialScrollTargetMatchId),
  );
}

function shouldShowCountryRouteSummary(
  resultType: ExplorerResultType,
  viewState: NormalizedExplorerViewState,
): viewState is NormalizedExplorerViewState & { readonly selectedCountryId: CountryId } {
  return Boolean(
    resultType === "country" &&
      viewState.selectedCountryId &&
      !viewState.selectedGroupCode &&
      !viewState.selectedDate &&
      !viewState.selectedVenueId,
  );
}

function deriveResultType(viewState: NormalizedExplorerViewState): ExplorerResultType {
  if (viewState.selectedCountryId) return "country";
  if (viewState.selectedVenueId) return "venue";
  if (viewState.selectedDate) return "date";
  if (viewState.selectedGroupCode) return "group";
  return "empty";
}

type ResultTitle = {
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly groupNavigation: ResultGroupNavigationViewModel | null;
};

function createResultTitle(
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
  resultType: ExplorerResultType,
): ResultTitle {
  if (resultType === "country" && viewState.selectedCountryId) {
    const country = getRequiredCountry(indexes, viewState.selectedCountryId);
    const groupCode = findCountryGroupCode(indexes, viewState.selectedCountryId);

    return {
      icon: country.flagEmoji,
      title: country.name,
      subtitle: createCountrySubtitle(country, groupCode),
      groupNavigation: createCountryGroupNavigation(country, groupCode),
    };
  }

  if (resultType === "venue" && viewState.selectedVenueId) {
    const venue = getRequiredVenue(indexes, viewState.selectedVenueId);
    return {
      icon: "📍",
      title: venue.name,
      subtitle: createVenueSubtitle(venue),
      groupNavigation: null,
    };
  }

  if (resultType === "date" && viewState.selectedDate) {
    return {
      icon: "📅",
      title: formatDateLabel(viewState.selectedDate),
      subtitle: createDateSubtitle(indexes, matchingMatches),
      groupNavigation: null,
    };
  }

  if (resultType === "group" && viewState.selectedGroupCode) {
    return {
      icon: "●",
      title: `Group ${viewState.selectedGroupCode}`,
      subtitle: createGroupSubtitle(indexes, viewState.selectedGroupCode, matchingMatches.length),
      groupNavigation: null,
    };
  }

  return { icon: "🧭", title: "Start exploring", subtitle: "", groupNavigation: null };
}

function createCountrySubtitle(country: Country, groupCode: GroupCode | null): string {
  const groupLabel = groupCode ? `Group ${groupCode}` : "Team";

  return `${groupLabel} · ${country.fifaCode} · ${country.confederation}`;
}

function createCountryGroupNavigation(
  country: Country,
  groupCode: GroupCode | null,
): ResultGroupNavigationViewModel | null {
  if (!groupCode) {
    return null;
  }

  const label = `Group ${groupCode}`;

  return {
    groupCode,
    label,
    trailingLabel: `${country.fifaCode} · ${country.confederation}`,
    href: `?group=${encodeURIComponent(groupCode)}`,
    ariaLabel: `Show ${label} details`,
  };
}

function createGroupSubtitle(indexes: Indexes, groupCode: GroupCode, matchCount: number): string {
  const fifaCodes = getGroupSlotEntries(indexes, groupCode)
    .map((slotEntry) =>
      slotEntry.countryId ? indexes.countriesById.get(slotEntry.countryId)?.fifaCode : null,
    )
    .filter((fifaCode): fifaCode is string => Boolean(fifaCode));

  return fifaCodes.length > 0
    ? `${matchCount} matches · ${fifaCodes.join(" · ")}`
    : `${matchCount} matches`;
}

function getGroupSlotEntries(indexes: Indexes, groupCode: GroupCode): readonly SlotEntry[] {
  return Array.from(indexes.slotEntriesBySlotId.values())
    .filter((slotEntry) => slotEntry.groupCode === groupCode)
    .sort((left, right) => left.slotIndex - right.slotIndex);
}

function createDateSubtitle(indexes: Indexes, matches: readonly Match[]): string {
  const matchCountLabel = matches.length === 1 ? "1 match" : `${matches.length} matches`;
  const kickoffRangeLabel = createKickoffRangeLabel(matches);
  const timeZoneSummaryLabel = createTimeZoneSummaryLabel(indexes, matches);

  return [matchCountLabel, kickoffRangeLabel, timeZoneSummaryLabel].filter(Boolean).join(" · ");
}

function createKickoffRangeLabel(matches: readonly Match[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  const kickoffTimes = matches
    .map((match) => match.kickoffLocal)
    .slice()
    .sort();

  const firstKickoff = kickoffTimes[0];
  const lastKickoff = kickoffTimes.at(-1);

  if (!firstKickoff || !lastKickoff) {
    return null;
  }

  return firstKickoff === lastKickoff ? firstKickoff : `${firstKickoff}–${lastKickoff}`;
}

function createTimeZoneSummaryLabel(indexes: Indexes, matches: readonly Match[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  const timeZoneAbbreviations = new Set(
    matches
      .map((match) => indexes.venuesById.get(match.venueId)?.timeZone.abbreviation)
      .filter((abbreviation): abbreviation is Venue["timeZone"]["abbreviation"] =>
        Boolean(abbreviation),
      ),
  );

  if (timeZoneAbbreviations.size === 0) {
    return null;
  }

  return timeZoneDisplayOrder
    .filter((abbreviation) => timeZoneAbbreviations.has(abbreviation))
    .join("/");
}

function createVenueSubtitle(venue: Venue): string {
  return `${venue.stadiumName} · ${createVenueCityLabel(venue)} · ${venue.timeZone.abbreviation}`;
}

function createVenueDetailLabel(venue: Venue): string {
  return `${venue.stadiumName} · ${createVenueCityLabel(venue)} · ${venue.timeZone.abbreviation}`;
}

function createVenueFixtureLabel(venue: Venue): string {
  return `${venue.stadiumName} (${venue.name})`;
}

function createVenueCityLabel(venue: Venue): string {
  return `${venue.city}, ${formatHostCountryCode(venue.countryCode)}`;
}

function formatHostCountryCode(countryCode: HostCountryCode): string {
  switch (countryCode) {
    case "CAN":
      return "Canada";
    case "MEX":
      return "Mexico";
    case "USA":
      return "USA";
  }
}

function createMatchListItem(
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  match: Match,
  isInitialScrollTarget = false,
): MatchListItemViewModel {
  const venue = getRequiredVenue(indexes, match.venueId);

  return {
    matchId: match.id,
    matchNumberLabel: `Match ${match.matchNumber}`,
    stageLabel: formatStageLabel(match),
    dateLabel: formatWeekdayDateLabel(match.date),
    dateHeadingLabel: formatFullDateHeadingLabel(match.date),
    isInitialScrollTarget,
    primaryText: createMatchPrimaryText(indexes, viewState, match),
    homeTeam: createMatchTeam(indexes, match.homeParticipant),
    awayTeam: createMatchTeam(indexes, match.awayParticipant),
    matchupText: createMatchupText(indexes, match),
    matchupAriaLabel: createMatchupAriaLabel(indexes, match),
    kickoffLabel: match.kickoffLocal,
    homeScoreLabel: match.result ? String(match.result.homeGoals) : null,
    awayScoreLabel: match.result ? String(match.result.awayGoals) : null,
    winningSide: createWinningSide(match),
    scoreLineLabel: createScoreLineLabel(match),
    statusLabel: match.result ? "Full time" : "Scheduled",
    secondaryText: `${match.kickoffLocal} ${venue.timeZone.abbreviation}`,
    fixtureMetaLabel: createFixtureMetaLabel(match, venue),
    venueId: venue.id,
    venueLabel: venue.name,
    venueDetailLabel: createVenueDetailLabel(venue),
  };
}

function sortMatchesChronologically(matches: readonly Match[]): readonly Match[] {
  return matches
    .slice()
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.kickoffLocal.localeCompare(right.kickoffLocal) ||
        left.matchNumber - right.matchNumber,
    );
}

function createDetails(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
  resultType: ExplorerResultType,
): ExplorerDetailViewModel | null {
  if (resultType === "country" && viewState.selectedCountryId) {
    const country = getRequiredCountry(indexes, viewState.selectedCountryId);
    const groupCode = findCountryGroupCode(indexes, country.id);

    return {
      type: "country",
      metrics: [
        { label: "FIFA ranking", value: createFifaRankingLabel(country) },
        { label: "Previous World Cup", value: country.previousWorldCupResult ?? "Data pending" },
        { label: "Group", value: groupCode ? `Group ${groupCode}` : "TBD" },
        { label: "Confederation", value: country.confederation },
        { label: "Fixtures", value: formatCount(matchingMatches.length, "match") },
      ],
    };
  }

  if (resultType === "date" && viewState.selectedDate) {
    return null;
  }

  if (resultType === "venue" && viewState.selectedVenueId) {
    const venue = getRequiredVenue(indexes, viewState.selectedVenueId);

    return {
      type: "venue",
      metrics: [
        { label: "Stadium", value: venue.stadiumName },
        { label: "City", value: createVenueCityLabel(venue) },
        {
          label: "Time zone",
          value: `${venue.timeZone.abbreviation} · ${venue.timeZone.ianaName}`,
        },
        { label: "Matches", value: formatCount(matchingMatches.length, "match") },
      ],
    };
  }

  if (resultType === "group" && viewState.selectedGroupCode) {
    return {
      type: "group",
      groupLabel: `Group ${viewState.selectedGroupCode}`,
      standings: createGroupStandings(data, indexes, viewState.selectedGroupCode),
    };
  }

  return null;
}

function createFifaRankingLabel(country: Country): string {
  if (!country.fifaRanking) {
    return "Data pending";
  }

  return `#${country.fifaRanking.rank} · ${formatDateLabel(country.fifaRanking.sourceDate)}`;
}

function createScoreLineLabel(match: Match): string | null {
  if (!match.result) {
    return null;
  }

  return `${match.result.homeGoals}-${match.result.awayGoals}`;
}

function createGroupStandings(
  data: AppData,
  indexes: Indexes,
  groupCode: GroupCode,
): readonly GroupStandingRowViewModel[] {
  const rows = getGroupSlotEntries(indexes, groupCode).map((slotEntry) => {
    const country = slotEntry.countryId
      ? (indexes.countriesById.get(slotEntry.countryId) ?? null)
      : null;
    return {
      countryId: country?.id ?? null,
      teamLabel: country ? `${country.flagEmoji} ${country.name}` : slotEntry.slotId,
      teamCodeLabel: country?.fifaCode ?? slotEntry.slotId,
      teamFlagEmoji: country?.flagEmoji ?? null,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: createTeamForm(data, groupCode, country?.id ?? null),
    };
  });
  const rowsByCountryId = new Map(
    rows
      .filter((row): row is (typeof rows)[number] & { readonly countryId: CountryId } =>
        Boolean(row.countryId),
      )
      .map((row) => [row.countryId, row]),
  );

  for (const match of data.matches) {
    if (match.stage !== "group" || !("groupCode" in match) || match.groupCode !== groupCode) {
      continue;
    }

    const result = match.result;
    if (!result) {
      continue;
    }

    const homeCountryId = getParticipantCountryId(match.homeParticipant);
    const awayCountryId = getParticipantCountryId(match.awayParticipant);
    const homeRow = homeCountryId ? rowsByCountryId.get(homeCountryId) : undefined;
    const awayRow = awayCountryId ? rowsByCountryId.get(awayCountryId) : undefined;

    if (!homeRow || !awayRow) {
      continue;
    }

    applyGroupResult(homeRow, result.homeGoals, result.awayGoals);
    applyGroupResult(awayRow, result.awayGoals, result.homeGoals);
  }

  return rows
    .map((row) => {
      const goalDifference = row.goalsFor - row.goalsAgainst;

      return {
        ...row,
        goalDifference,
        goalDifferenceLabel: formatGoalDifference(goalDifference),
      };
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        left.teamLabel.localeCompare(right.teamLabel),
    )
    .map(({ goalDifference: _goalDifference, ...row }, index) => ({
      ...row,
      position: index + 1,
    }));
}

function applyGroupResult(
  row: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  },
  goalsFor: number,
  goalsAgainst: number,
): void {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    row.won += 1;
    row.points += 3;
  } else if (goalsFor < goalsAgainst) {
    row.lost += 1;
  } else {
    row.drawn += 1;
    row.points += 1;
  }
}

function createTeamForm(
  data: AppData,
  groupCode: GroupCode,
  countryId: CountryId | null,
): readonly GroupStandingFormEntryViewModel[] {
  if (!countryId) {
    return createPendingForm();
  }

  const entries = data.matches
    .filter(
      (match) =>
        match.stage === "group" &&
        "groupCode" in match &&
        match.groupCode === groupCode &&
        getMatchCountryIds(match).includes(countryId),
    )
    .sort(
      (left, right) => left.date.localeCompare(right.date) || left.matchNumber - right.matchNumber,
    )
    .map((match): GroupStandingFormEntryViewModel => createTeamFormEntry(match, countryId));

  return padFormEntries(entries.slice(0, groupStandingFormSlotCount));
}

function createTeamFormEntry(match: Match, countryId: CountryId): GroupStandingFormEntryViewModel {
  const result = match.result;

  if (!result) {
    return {
      result: "pending",
      label: "Fixture pending",
    };
  }

  const homeCountryId = getParticipantCountryId(match.homeParticipant);
  const isHome = homeCountryId === countryId;
  const goalsFor = isHome ? result.homeGoals : result.awayGoals;
  const goalsAgainst = isHome ? result.awayGoals : result.homeGoals;
  const scoreLabel = `${goalsFor}-${goalsAgainst}`;

  if (goalsFor > goalsAgainst) {
    return {
      result: "win",
      label: `Win ${scoreLabel}`,
    };
  }

  if (goalsFor < goalsAgainst) {
    return {
      result: "loss",
      label: `Loss ${scoreLabel}`,
    };
  }

  return {
    result: "draw",
    label: `Draw ${scoreLabel}`,
  };
}

function padFormEntries(
  entries: readonly GroupStandingFormEntryViewModel[],
): readonly GroupStandingFormEntryViewModel[] {
  if (entries.length >= groupStandingFormSlotCount) {
    return entries;
  }

  return [...entries, ...createPendingForm(groupStandingFormSlotCount - entries.length)];
}

function createPendingForm(
  count = groupStandingFormSlotCount,
): readonly GroupStandingFormEntryViewModel[] {
  return Array.from({ length: count }, () => ({
    result: "pending",
    label: "Fixture pending",
  }));
}

function formatGoalDifference(goalDifference: number): string {
  if (goalDifference > 0) {
    return `+${goalDifference}`;
  }

  return String(goalDifference);
}

function formatStageLabel(match: Match): string {
  if (match.stage === "group" && "groupCode" in match && match.groupCode) {
    return `Group ${match.groupCode}`;
  }

  return formatTournamentStageLabel(match.stage);
}

function formatTournamentStageLabel(stage: TournamentStage): string {
  switch (stage) {
    case "group":
      return "Group stage";
    case "roundOf32":
      return "Round of 32";
    case "roundOf16":
      return "Round of 16";
    case "quarterFinal":
      return "Quarter-final";
    case "semiFinal":
      return "Semi-final";
    case "thirdPlace":
      return "Third-place match";
    case "final":
      return "Final";
  }
}

function createMatchupText(indexes: Indexes, match: Match): string {
  return `${formatParticipantCompact(indexes, match.homeParticipant)} vs ${formatParticipantCompact(
    indexes,
    match.awayParticipant,
  )}`;
}

function createMatchupAriaLabel(indexes: Indexes, match: Match): string {
  return `${formatParticipant(indexes, match.homeParticipant)} vs ${formatParticipant(
    indexes,
    match.awayParticipant,
  )}`;
}

function createMatchTeam(
  indexes: Indexes,
  participant: Match["homeParticipant"],
): MatchTeamViewModel {
  const countryId = getParticipantCountryId(participant);
  const country = getMatchCountry(indexes, countryId ?? undefined);

  if (country) {
    return {
      flagEmoji: country.flagEmoji,
      displayName: country.shortName,
      code: country.fifaCode,
    };
  }

  return {
    flagEmoji: null,
    displayName: formatParticipantLabel(participant),
    code: null,
  };
}

function createFixtureMetaLabel(match: Match, venue: Venue): string {
  if (match.stage === "group") {
    return `First Stage · ${formatStageLabel(match)} · ${createVenueFixtureLabel(venue)}`;
  }

  return `${formatStageLabel(match)} · ${createVenueFixtureLabel(venue)}`;
}

function createWinningSide(match: Match): "home" | "away" | null {
  if (!match.result || match.result.homeGoals === match.result.awayGoals) {
    return null;
  }

  return match.result.homeGoals > match.result.awayGoals ? "home" : "away";
}

function formatParticipantCompact(indexes: Indexes, participant: Match["homeParticipant"]): string {
  const countryId = getParticipantCountryId(participant);
  const country = getMatchCountry(indexes, countryId ?? undefined);

  if (country) return `${country.flagEmoji} ${country.fifaCode}`;

  return formatParticipantLabel(participant);
}

function createMatchPrimaryText(
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  match: Match,
): string {
  if (viewState.selectedCountryId) {
    const opponentId = getOpponentCountryId(match, viewState.selectedCountryId);
    if (!opponentId) {
      return "Opponent TBD";
    }

    const opponent = getRequiredCountry(indexes, opponentId);
    return `vs ${opponent.flagEmoji} ${opponent.name}`;
  }

  return `${formatParticipant(indexes, match.homeParticipant)} vs ${formatParticipant(
    indexes,
    match.awayParticipant,
  )}`;
}

function formatParticipant(indexes: Indexes, participant: Match["homeParticipant"]): string {
  const countryId = getParticipantCountryId(participant);
  const country = getMatchCountry(indexes, countryId ?? undefined);

  if (country) {
    return `${country.flagEmoji} ${country.name}`;
  }

  return formatParticipantLabel(participant);
}

function getMatchCountry(indexes: Indexes, countryId: CountryId | undefined): Country | null {
  return countryId ? (indexes.countriesById.get(countryId) ?? null) : null;
}

function createCountryRouteSummary(
  data: AppData,
  indexes: Indexes,
  countryId: CountryId,
): CountryRouteSummaryViewModel | null {
  const routeMatches = data.matches
    .filter((match) => getMatchCountryIds(match).includes(countryId))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.matchNumber - b.matchNumber);
  const routeVenues = routeMatches
    .map((match) => indexes.venuesById.get(match.venueId))
    .filter((venue): venue is Venue => Boolean(venue));

  if (routeVenues.length < 2) {
    return null;
  }

  const totalDistanceKm = routeVenues.slice(0, -1).reduce((sum, venue, index) => {
    const nextVenue = routeVenues[index + 1];
    if (!nextVenue) return sum;
    return sum + calculateDistanceKm(venue.geoPoint, nextVenue.geoPoint);
  }, 0);
  const visitedVenueCount = new Set(routeVenues.map((venue) => venue.id)).size;
  const matchCount = routeMatches.length;
  const venueCountExplanationLabel = createVenueCountExplanationLabel(routeVenues);

  return {
    matchCount,
    visitedVenueCount,
    itineraryLabel: `${formatCount(matchCount, "match")} · ${formatCount(
      visitedVenueCount,
      "venue",
    )}`,
    distanceMethodLabel: "Approx. direct distance, not travel distance.",
    venueCountExplanationLabel,
    totalDistanceKm,
    totalDistanceLabel: formatDistanceLabel(totalDistanceKm),
    legs: createCountryRouteLegs(routeMatches, routeVenues),
  };
}

function createCountryRouteLegs(
  routeMatches: readonly Match[],
  routeVenues: readonly Venue[],
): CountryRouteSummaryViewModel["legs"] {
  return routeVenues.slice(0, -1).flatMap((venue, index) => {
    const nextVenue = routeVenues[index + 1];
    const match = routeMatches[index];
    const nextMatch = routeMatches[index + 1];

    if (!nextVenue || !match || !nextMatch) {
      return [];
    }

    return [
      {
        fromDateLabel: formatDateLabel(match.date),
        toDateLabel: formatDateLabel(nextMatch.date),
        fromVenueLabel: venue.name,
        toVenueLabel: nextVenue.name,
        distanceLabel: formatDistanceLabel(calculateDistanceKm(venue.geoPoint, nextVenue.geoPoint)),
      },
    ];
  });
}

function createVenueCountExplanationLabel(routeVenues: readonly Venue[]): string | null {
  const venueCounts = new Map<Venue["id"], number>();

  for (const venue of routeVenues) {
    venueCounts.set(venue.id, (venueCounts.get(venue.id) ?? 0) + 1);
  }

  const repeatedVenueNames: string[] = [];
  const seenVenueIds = new Set<Venue["id"]>();

  for (const venue of routeVenues) {
    if ((venueCounts.get(venue.id) ?? 0) <= 1 || seenVenueIds.has(venue.id)) {
      continue;
    }

    repeatedVenueNames.push(venue.name);
    seenVenueIds.add(venue.id);
  }

  if (repeatedVenueNames.length === 0) {
    return null;
  }

  return repeatedVenueNames.length === 1
    ? `${repeatedVenueNames[0]} is visited twice.`
    : `${repeatedVenueNames.join(", ")} are revisited.`;
}

function formatCount(count: number, noun: "match" | "venue"): string {
  if (noun === "match") {
    return `${count} ${count === 1 ? "match" : "matches"}`;
  }

  return `${count} ${count === 1 ? "venue" : "venues"}`;
}

function findCountryGroupCode(indexes: Indexes, countryId: CountryId): GroupCode | null {
  for (const slotEntry of indexes.slotEntriesBySlotId.values()) {
    if (slotEntry.countryId === countryId) {
      return slotEntry.groupCode;
    }
  }

  return null;
}

function getRequiredVenue(indexes: Indexes, venueId: Match["venueId"]): Venue {
  const venue = indexes.venuesById.get(venueId);
  if (!venue) {
    throw new Error(`Unknown venue id: ${venueId}`);
  }
  return venue;
}
