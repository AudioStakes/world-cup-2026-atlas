import type { NormalizedExplorerViewState } from "./types";

export function serializeExplorerSearchParams(viewState: NormalizedExplorerViewState): string {
  const searchParams = new URLSearchParams();

  if (viewState.selectedCountryId) searchParams.set("country", viewState.selectedCountryId);
  if (viewState.selectedGroupCode) searchParams.set("group", viewState.selectedGroupCode);
  if (viewState.selectedDate) searchParams.set("date", viewState.selectedDate);
  if (viewState.selectedVenueId) searchParams.set("venue", viewState.selectedVenueId);

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}
