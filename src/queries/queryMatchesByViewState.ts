import { matchHasCountry } from "../data/matchParticipants";
import type { AppData, Match } from "../domain/types";
import type { NormalizedExplorerViewState } from "../features/explorer/types";

export function queryMatchesByViewState(
  data: AppData,
  viewState: NormalizedExplorerViewState,
): readonly Match[] {
  return data.matches.filter((match) => {
    if (viewState.selectedCountryId && !matchHasCountry(match, viewState.selectedCountryId)) {
      return false;
    }

    if (viewState.selectedGroupCode && match.groupCode !== viewState.selectedGroupCode) {
      return false;
    }

    if (viewState.selectedDate && match.date !== viewState.selectedDate) {
      return false;
    }

    if (viewState.selectedVenueId && match.venueId !== viewState.selectedVenueId) {
      return false;
    }

    return true;
  });
}
