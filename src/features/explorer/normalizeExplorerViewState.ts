import type { LocalDateString } from "../../domain/ids";
import type { Indexes } from "../../indexes/createIndexes";
import type { ExplorerViewState, NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

export function normalizeExplorerViewState(
  viewState: Partial<ExplorerViewState>,
  indexes: Indexes,
): NormalizedExplorerViewState {
  return {
    selectedCountryId:
      viewState.selectedCountryId && indexes.countriesById.has(viewState.selectedCountryId)
        ? viewState.selectedCountryId
        : emptyExplorerViewState.selectedCountryId,
    selectedGroupCode:
      viewState.selectedGroupCode && indexes.groupsByCode.has(viewState.selectedGroupCode)
        ? viewState.selectedGroupCode
        : emptyExplorerViewState.selectedGroupCode,
    selectedDate: isLocalDateLike(viewState.selectedDate)
      ? viewState.selectedDate
      : emptyExplorerViewState.selectedDate,
    selectedVenueId:
      viewState.selectedVenueId && indexes.venuesById.has(viewState.selectedVenueId)
        ? viewState.selectedVenueId
        : emptyExplorerViewState.selectedVenueId,
  };
}

function isLocalDateLike(value: string | null | undefined): value is LocalDateString {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
