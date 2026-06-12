import { useMemo, useState } from "preact/hooks";
import { appData } from "../data/appData";
import type { VenueId } from "../domain/ids";
import { queryExplorer } from "../features/explorer/queryExplorer";
import { resolveInitialExplorerViewState } from "../features/explorer/resolveInitialExplorerViewState";
import { serializeExplorerSearchParams } from "../features/explorer/serializeExplorerSearchParams";
import type { ExplorerAction, NormalizedExplorerViewState } from "../features/explorer/types";
import { updateExplorerViewState } from "../features/explorer/updateExplorerViewState";
import { createIndexes } from "../indexes/createIndexes";
import { ExplorerPage } from "../ui/components/ExplorerPage";

const indexes = createIndexes(appData);

export function App() {
  const [viewState, setViewState] = useState<NormalizedExplorerViewState>(() =>
    resolveInitialExplorerViewState(getInitialSearchParams(), indexes),
  );
  const [focusedVenueId, setFocusedVenueId] = useState<VenueId | null>(null);

  const viewModel = useMemo(
    () => queryExplorer(appData, indexes, viewState, focusedVenueId),
    [focusedVenueId, viewState],
  );

  function dispatchExplorerAction(action: ExplorerAction): void {
    const nextViewState = updateExplorerViewState(appData, indexes, viewState, action);
    setViewState(nextViewState);
    syncBrowserUrl(nextViewState);
  }

  return (
    <ExplorerPage
      viewModel={viewModel}
      onAction={dispatchExplorerAction}
      onMatchVenueFocusChange={setFocusedVenueId}
    />
  );
}

function getInitialSearchParams(): URLSearchParams | string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function syncBrowserUrl(viewState: NormalizedExplorerViewState): void {
  if (typeof window === "undefined") return;

  const nextSearch = serializeExplorerSearchParams(viewState);
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}
