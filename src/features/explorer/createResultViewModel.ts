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
import { formatDateLabel, formatDistanceLabel, getRequiredCountry } from "./formatExplorerLabels";
import type {
  CountryRouteSummaryViewModel,
  ExplorerResultType,
  ExplorerResultViewModel,
  MatchListItemViewModel,
  NormalizedExplorerViewState,
} from "./types";

const timeZoneDisplayOrder = ["PT", "MT", "CT", "ET"] as const;

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
    emptyMessage:
      matchingMatches.length === 0 ? "No matches found for the current selection." : null,
    matches: matchingMatches.map((match) => createMatchListItem(indexes, viewState, match)),
    routeSummary:
      resultType === "country" && viewState.selectedCountryId
        ? createCountryRouteSummary(data, indexes, viewState.selectedCountryId)
        : null,
  };
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
    };
  }

  if (resultType === "venue" && viewState.selectedVenueId) {
    const venue = getRequiredVenue(indexes, viewState.selectedVenueId);
    return {
      icon: "📍",
      title: venue.name,
      subtitle: createVenueSubtitle(venue),
    };
  }

  if (resultType === "date" && viewState.selectedDate) {
    return {
      icon: "📅",
      title: formatDateLabel(viewState.selectedDate),
      subtitle: createDateSubtitle(indexes, matchingMatches),
    };
  }

  if (resultType === "group" && viewState.selectedGroupCode) {
    return {
      icon: "●",
      title: `Group ${viewState.selectedGroupCode}`,
      subtitle: createGroupSubtitle(indexes, viewState.selectedGroupCode, matchingMatches.length),
    };
  }

  return { icon: "🧭", title: "Start exploring", subtitle: "" };
}

function createCountrySubtitle(country: Country, groupCode: string | null): string {
  const groupLabel = groupCode ? `Group ${groupCode}` : "Team";

  return `${groupLabel} · ${country.fifaCode} · ${country.confederation}`;
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
): MatchListItemViewModel {
  const venue = getRequiredVenue(indexes, match.venueId);

  return {
    matchId: match.id,
    matchNumberLabel: `Match ${match.matchNumber}`,
    stageLabel: formatStageLabel(match),
    dateLabel: formatDateLabel(match.date),
    primaryText: createMatchPrimaryText(indexes, viewState, match),
    secondaryText: `${match.kickoffLocal} ${venue.timeZone.abbreviation}`,
    venueId: venue.id,
    venueLabel: venue.name,
    venueDetailLabel: createVenueDetailLabel(venue),
  };
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

  return {
    matchCount,
    visitedVenueCount,
    itineraryLabel: `${formatCount(matchCount, "match")} · ${formatCount(
      visitedVenueCount,
      "venue",
    )}`,
    totalDistanceKm,
    totalDistanceLabel: formatDistanceLabel(totalDistanceKm),
  };
}

function formatCount(count: number, noun: "match" | "venue"): string {
  if (noun === "match") {
    return `${count} ${count === 1 ? "match" : "matches"}`;
  }

  return `${count} ${count === 1 ? "venue" : "venues"}`;
}

function findCountryGroupCode(indexes: Indexes, countryId: CountryId): string | null {
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
