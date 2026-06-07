import type { CountryId, GroupCode, LocalDateString, VenueId } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { normalizeExplorerViewState } from "./normalizeExplorerViewState";
import type { ExplorerAction, NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

const stateKeys = [
  "selectedCountryId",
  "selectedGroupCode",
  "selectedDate",
  "selectedVenueId",
] as const;

type StateKey = (typeof stateKeys)[number];

type SelectionUpdate =
  | { readonly stateKey: "selectedCountryId"; readonly value: CountryId }
  | { readonly stateKey: "selectedGroupCode"; readonly value: GroupCode }
  | { readonly stateKey: "selectedDate"; readonly value: LocalDateString }
  | { readonly stateKey: "selectedVenueId"; readonly value: VenueId };

export function updateExplorerViewState(
  data: AppData,
  indexes: Indexes,
  currentState: NormalizedExplorerViewState,
  action: ExplorerAction,
): NormalizedExplorerViewState {
  if (action.type === "clearAll") return emptyExplorerViewState;

  const normalizedCurrentState = normalizeExplorerViewState(currentState, indexes);
  const selectionUpdate = getActionSelection(action);
  const willSelect = normalizedCurrentState[selectionUpdate.stateKey] !== selectionUpdate.value;
  const nextState = setSelectionValue(normalizedCurrentState, selectionUpdate, willSelect);

  if (!willSelect || queryMatchesByViewState(data, nextState).length > 0) {
    return nextState;
  }

  return removeConflictingSelections(data, nextState, selectionUpdate.stateKey);
}

function getActionSelection(action: Exclude<ExplorerAction, { type: "clearAll" }>): SelectionUpdate {
  switch (action.type) {
    case "selectCountry":
      return { stateKey: "selectedCountryId", value: action.countryId };
    case "selectGroup":
      return { stateKey: "selectedGroupCode", value: action.groupCode };
    case "selectDate":
      return { stateKey: "selectedDate", value: action.date };
    case "selectVenue":
      return { stateKey: "selectedVenueId", value: action.venueId };
  }
}

function setSelectionValue(
  state: NormalizedExplorerViewState,
  selectionUpdate: SelectionUpdate,
  willSelect: boolean,
): NormalizedExplorerViewState {
  switch (selectionUpdate.stateKey) {
    case "selectedCountryId":
      return { ...state, selectedCountryId: willSelect ? selectionUpdate.value : null };
    case "selectedGroupCode":
      return { ...state, selectedGroupCode: willSelect ? selectionUpdate.value : null };
    case "selectedDate":
      return { ...state, selectedDate: willSelect ? selectionUpdate.value : null };
    case "selectedVenueId":
      return { ...state, selectedVenueId: willSelect ? selectionUpdate.value : null };
  }
}

function removeConflictingSelections(
  data: AppData,
  state: NormalizedExplorerViewState,
  lockedStateKey: StateKey,
): NormalizedExplorerViewState {
  let nextState = state;

  for (const removableStateKey of stateKeys) {
    if (removableStateKey === lockedStateKey || !nextState[removableStateKey]) continue;

    nextState = clearStateKey(nextState, removableStateKey);
    if (queryMatchesByViewState(data, nextState).length > 0) return nextState;
  }

  return nextState;
}

function clearStateKey(
  state: NormalizedExplorerViewState,
  stateKey: StateKey,
): NormalizedExplorerViewState {
  switch (stateKey) {
    case "selectedCountryId":
      return { ...state, selectedCountryId: null };
    case "selectedGroupCode":
      return { ...state, selectedGroupCode: null };
    case "selectedDate":
      return { ...state, selectedDate: null };
    case "selectedVenueId":
      return { ...state, selectedVenueId: null };
  }
}
