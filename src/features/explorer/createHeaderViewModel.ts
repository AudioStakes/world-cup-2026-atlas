import { serializeExplorerSearchParams } from "./serializeExplorerSearchParams";
import type { ExplorerHeaderViewModel, NormalizedExplorerViewState } from "./types";

export function createHeaderViewModel(
  viewState: NormalizedExplorerViewState,
): ExplorerHeaderViewModel {
  const serializedSearchParams = serializeExplorerSearchParams(viewState);

  return {
    title: "World Cup 2026 Atlas",
    subtitle: "Explore teams, venues, dates, and routes across North America.",
    urlStateLabel: serializedSearchParams ? `/${serializedSearchParams}` : "/",
    canClear: Boolean(
      viewState.selectedCountryId ||
        viewState.selectedGroupCode ||
        viewState.selectedDate ||
        viewState.selectedVenueId,
    ),
  };
}
