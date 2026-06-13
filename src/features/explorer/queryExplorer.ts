import type { VenueId } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { createExplorePanelViewModel } from "./createExplorePanelViewModel";
import { createHeaderViewModel } from "./createHeaderViewModel";
import { createMapViewModel } from "./createMapViewModel";
import { normalizeExplorerViewState } from "./normalizeExplorerViewState";
import type { ExplorerViewModel, ExplorerViewState } from "./types";

export function queryExplorer(
  data: AppData,
  indexes: Indexes,
  viewState: Partial<ExplorerViewState>,
  focusedVenueId: VenueId | null = null,
): ExplorerViewModel {
  const normalizedViewState = normalizeExplorerViewState(viewState, indexes);
  const matchingMatches = queryMatchesByViewState(data, normalizedViewState);

  return {
    viewState: normalizedViewState,
    header: createHeaderViewModel(),
    explorePanel: createExplorePanelViewModel(data, indexes, normalizedViewState, matchingMatches),
    map: createMapViewModel(data, indexes, normalizedViewState, matchingMatches, focusedVenueId),
  };
}
