import { calculateDistanceKm } from "../../calculations/calculateDistanceKm";
import {
  formatParticipantLabel,
  getMatchCountryIds,
  getOpponentCountryId,
  getParticipantCountryId,
} from "../../data/matchParticipants";
import type { CountryId } from "../../domain/ids";
import type {
  AppData,
  Country,
  HostCountryCode,
  Match,
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
      subtitle: groupCode ? `Group ${groupCode}` : "Team",
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
      subtitle: `${matchingMatches.length} matches`,
    };
  }

  if (resultType === "group" && viewState.selectedGroupCode) {
    return {
      icon: "●",
      title: `Group ${viewState.selectedGroupCode}`,
      subtitle: `${matchingMatches.length} matches`,
    };
  }

  return { icon: "🧭", title: "Start exploring", subtitle: "" };
}

function createVenueSubtitle(venue: Venue): string {
  return `${venue.stadiumName} · ${venue.city}, ${formatHostCountryCode(venue.countryCode)} · ${
    venue.timeZone.abbreviation
  }`;
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

  return {
    visitedVenueCount: new Set(routeVenues.map((venue) => venue.id)).size,
    totalDistanceKm,
    totalDistanceLabel: formatDistanceLabel(totalDistanceKm),
  };
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
