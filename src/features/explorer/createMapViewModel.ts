import { calculateDistanceKm } from "../../calculations/calculateDistanceKm";
import type { CountryId, VenueId } from "../../domain/ids";
import type { AppData, Match, Venue } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { formatDistanceLabel } from "./formatExplorerLabels";
import type {
  ExplorerMapViewModel,
  MapRouteViewModel,
  NormalizedExplorerViewState,
  VenueMarkerState,
} from "./types";

export function createMapViewModel(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
): ExplorerMapViewModel {
  const highlightedVenueIds = new Set(matchingMatches.map((match) => match.venueId));

  return {
    venueMarkers: data.venues.map((venue) => ({
      venueId: venue.id,
      venueName: venue.name,
      stadiumName: venue.stadiumName,
      label: getVenueMarkerLabel(venue),
      position: venue.mapPoint,
      state: getVenueMarkerState(viewState, highlightedVenueIds, venue.id),
    })),
    routes: shouldShowCountryRoute(viewState)
      ? createCountryRoutes(data, indexes, viewState.selectedCountryId)
      : [],
  };
}

function getVenueMarkerState(
  viewState: NormalizedExplorerViewState,
  highlightedVenueIds: ReadonlySet<VenueId>,
  venueId: VenueId,
): VenueMarkerState {
  if (viewState.selectedVenueId === venueId) return "selected";
  if (highlightedVenueIds.has(venueId)) return "highlighted";
  if (highlightedVenueIds.size > 0) return "dimmed";
  return "normal";
}

function shouldShowCountryRoute(
  viewState: NormalizedExplorerViewState,
): viewState is NormalizedExplorerViewState & { readonly selectedCountryId: CountryId } {
  return Boolean(
    viewState.selectedCountryId &&
      !viewState.selectedGroupCode &&
      !viewState.selectedDate &&
      !viewState.selectedVenueId,
  );
}

function createCountryRoutes(
  data: AppData,
  indexes: Indexes,
  countryId: CountryId,
): readonly MapRouteViewModel[] {
  const routeVenues = queryMatchesByViewState(data, {
    selectedCountryId: countryId,
    selectedGroupCode: null,
    selectedDate: null,
    selectedVenueId: null,
  })

    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.matchNumber - b.matchNumber)
    .map((match) => indexes.venuesById.get(match.venueId))
    .filter((venue): venue is Venue => Boolean(venue));

  return routeVenues.slice(0, -1).flatMap((fromVenue, index) => {
    const toVenue = routeVenues[index + 1];
    if (!toVenue) return [];

    const distanceKm = calculateDistanceKm(fromVenue.geoPoint, toVenue.geoPoint);

    return [
      {
        kind: "groupStage" as const,
        fromVenueId: fromVenue.id,
        toVenueId: toVenue.id,
        from: fromVenue.mapPoint,
        to: toVenue.mapPoint,
        distanceKm,
        distanceLabel: formatDistanceLabel(distanceKm),
        showDistanceLabel: true,
      },
    ];
  });
}

function getVenueMarkerLabel(venue: Venue): string {
  if (venue.id === "san-francisco-bay-area") return "SF Bay";
  if (venue.id === "new-york-new-jersey") return "New York";
  return venue.name;
}
