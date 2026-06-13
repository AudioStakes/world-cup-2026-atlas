import { useEffect, useMemo, useState } from "preact/hooks";
import { appData } from "../data/appData";
import type { VenueId } from "../domain/ids";
import {
  browserLocalDisplayTimeZoneId,
  getBrowserLocalTimeZone,
  venueLocalDisplayTimeZoneId,
} from "../features/explorer/displayTimeZone";
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
  const [browserLocalTimeZone] = useState<string | null>(() => getBrowserLocalTimeZone());
  const [displayTimeZoneId, setDisplayTimeZoneId] = useState<string>(() =>
    browserLocalTimeZone ? browserLocalDisplayTimeZoneId : venueLocalDisplayTimeZoneId,
  );

  const viewModel = useMemo(
    () =>
      queryExplorer(
        appData,
        indexes,
        viewState,
        focusedVenueId,
        displayTimeZoneId,
        browserLocalTimeZone,
      ),
    [browserLocalTimeZone, displayTimeZoneId, focusedVenueId, viewState],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      setViewState(resolveInitialExplorerViewState(window.location.search, indexes));
      setFocusedVenueId(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function dispatchExplorerAction(action: ExplorerAction): void {
    const nextViewState = updateExplorerViewState(appData, indexes, viewState, action);

    if (isSameExplorerViewState(viewState, nextViewState)) {
      return;
    }

    setViewState(nextViewState);
    setFocusedVenueId(null);
    syncBrowserUrl(nextViewState, "push");
  }

  return (
    <ExplorerPage
      viewModel={viewModel}
      onAction={dispatchExplorerAction}
      onMatchVenueFocusChange={setFocusedVenueId}
      onTimeZoneChange={setDisplayTimeZoneId}
    />
  );
}

function isSameExplorerViewState(
  left: NormalizedExplorerViewState,
  right: NormalizedExplorerViewState,
): boolean {
  return (
    left.selectedCountryId === right.selectedCountryId &&
    left.selectedGroupCode === right.selectedGroupCode &&
    left.selectedDate === right.selectedDate &&
    left.selectedVenueId === right.selectedVenueId
  );
}

function getInitialSearchParams(): URLSearchParams | string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function syncBrowserUrl(viewState: NormalizedExplorerViewState, mode: "push" | "replace"): void {
  if (typeof window === "undefined") return;

  const nextSearch = serializeExplorerSearchParams(viewState);
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;

  if (nextUrl === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }

  if (mode === "push") {
    window.history.pushState(null, "", nextUrl);
  } else {
    window.history.replaceState(null, "", nextUrl);
  }
}
