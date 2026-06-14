import type { LocalDateString } from "../../domain/ids";
import { getDefaultTournamentDate } from "./tournamentDates";
import type { NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

export function createDefaultExplorerViewState(
  today?: LocalDateString,
): NormalizedExplorerViewState {
  return { ...emptyExplorerViewState, selectedDate: getDefaultTournamentDate(today) };
}

export function hasExplorerSelection(viewState: NormalizedExplorerViewState): boolean {
  return Boolean(
    viewState.selectedCountryId ||
      viewState.selectedGroupCode ||
      viewState.selectedDate ||
      viewState.selectedVenueId,
  );
}

export function ensureExplorerSelection(
  viewState: NormalizedExplorerViewState,
  today?: LocalDateString,
): NormalizedExplorerViewState {
  return hasExplorerSelection(viewState) ? viewState : createDefaultExplorerViewState(today);
}
