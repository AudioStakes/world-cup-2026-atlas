import { groupCode, slotId } from "../../domain/ids";
import type { Indexes } from "../../indexes/createIndexes";
import { hasExplorerSearchParams, parseExplorerSearchParams } from "./parseExplorerSearchParams";
import type { NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

const fallbackSlotId = slotId("A1");
const fallbackGroupCode = groupCode("A");

export function resolveInitialExplorerViewState(
  searchParamsInput: URLSearchParams | string,
  indexes: Indexes,
): NormalizedExplorerViewState {
  if (hasExplorerSearchParams(searchParamsInput)) {
    return parseExplorerSearchParams(searchParamsInput, indexes);
  }

  const fallbackSlotEntry = indexes.slotEntriesBySlotId.get(fallbackSlotId);
  if (fallbackSlotEntry?.countryId && indexes.countriesById.has(fallbackSlotEntry.countryId)) {
    return { ...emptyExplorerViewState, selectedCountryId: fallbackSlotEntry.countryId };
  }

  return { ...emptyExplorerViewState, selectedGroupCode: fallbackGroupCode };
}
