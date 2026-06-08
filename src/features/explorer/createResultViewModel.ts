import { calculateDistanceKm } from "../../calculations/calculateDistanceKm";
import { getMatchCountryIds, getOpponentCountryId } from "../../data/matchParticipants";
import type { CountryId } from "../../domain/ids";
import type { AppData, Country, Match, Venue } from "../../domain/types";
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
    return { icon: "📍", title: venue.name, subtitle: venue.stadiumName };
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

function createMatchListItem(
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  match: Match,
): MatchListItemViewModel {
  const venue = getRequiredVenue(indexes, match.venueId);

  return {
    matchId: match.id,
    dateLabel: formatDateLabel(match.date),
    primaryText: createMatchPrimaryText(indexes, viewState, match),
    secondaryText: `${match.kickoffLocal} local time`,
    venueId: venue.id,
    venueLabel: venue.name,
  };
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

  const [homeCountryId, awayCountryId] = getMatchCountryIds(match);
  const homeCountry = getMatchCountry(indexes, homeCountryId);
  const awayCountry = getMatchCountry(indexes, awayCountryId);
  return `${formatCountry(homeCountry)} vs ${formatCountry(awayCountry)}`;
}

function getMatchCountry(indexes: Indexes, countryId: CountryId | undefined): Country | null {
  return countryId ? (indexes.countriesById.get(countryId) ?? null) : null;
}

function formatCountry(country: Country | null): string {
  return country ? `${country.flagEmoji} ${country.name}` : "TBD";
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
