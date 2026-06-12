import { serializeExplorerSearchParams } from "./serializeExplorerSearchParams";
import { getDefaultTournamentDate } from "./tournamentDates";
import type { ExplorerHeaderViewModel, NormalizedExplorerViewState } from "./types";

export function createHeaderViewModel(
  viewState: NormalizedExplorerViewState,
): ExplorerHeaderViewModel {
  const serializedSearchParams = serializeExplorerSearchParams(viewState);
  const hasOnlyDefaultDate =
    viewState.selectedDate === getDefaultTournamentDate() &&
    !viewState.selectedCountryId &&
    !viewState.selectedGroupCode &&
    !viewState.selectedVenueId;
  const canClear =
    Boolean(
      viewState.selectedCountryId ||
        viewState.selectedGroupCode ||
        viewState.selectedDate ||
        viewState.selectedVenueId,
    ) && !hasOnlyDefaultDate;

  return {
    title: "World Cup 2026 Atlas",
    subtitle: "Explore teams, venues, dates, and routes across North America.",
    urlStateLabel:
      serializedSearchParams && !hasOnlyDefaultDate ? `/${serializedSearchParams}` : "/",
    canClear,
  };
}
