import type { VenueId } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { mergeMatchResultsSnapshot } from "../../matchResults/mergeMatchResultsSnapshot";
import type { MatchResultsSnapshot } from "../../matchResults/types";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { createExplorePanelViewModel } from "./createExplorePanelViewModel";
import { createHeaderViewModel } from "./createHeaderViewModel";
import { createMapViewModel } from "./createMapViewModel";
import { ensureExplorerSelection } from "./defaultExplorerViewState";
import { venueLocalDisplayTimeZoneId } from "./displayTimeZone";
import { normalizeExplorerViewState } from "./normalizeExplorerViewState";
import type { ExplorerViewModel, ExplorerViewState } from "./types";

export function queryExplorer(
  data: AppData,
  indexes: Indexes,
  viewState: Partial<ExplorerViewState>,
  focusedVenueId: VenueId | null = null,
  displayTimeZoneId = venueLocalDisplayTimeZoneId,
  browserLocalTimeZone: string | null = null,
  matchResultsSnapshot: MatchResultsSnapshot | null = null,
): ExplorerViewModel {
  const effectiveData = mergeMatchResultsSnapshot(data, matchResultsSnapshot);
  const normalizedViewState = ensureExplorerSelection(
    normalizeExplorerViewState(viewState, indexes),
  );
  const matchingMatches = queryMatchesByViewState(effectiveData, normalizedViewState);

  return {
    viewState: normalizedViewState,
    header: createHeaderViewModel(effectiveData.countries, displayTimeZoneId, browserLocalTimeZone),
    explorePanel: createExplorePanelViewModel(
      effectiveData,
      indexes,
      normalizedViewState,
      matchingMatches,
      displayTimeZoneId,
      browserLocalTimeZone,
    ),
    map: createMapViewModel(
      effectiveData,
      indexes,
      normalizedViewState,
      matchingMatches,
      focusedVenueId,
    ),
  };
}
