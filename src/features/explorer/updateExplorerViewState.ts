import type { CountryId, GroupCode, LocalDateString, VenueId } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { normalizeExplorerViewState } from "./normalizeExplorerViewState";
import type { ExplorerAction, NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

type SelectionUpdate =
  | { readonly stateKey: "selectedCountryId"; readonly value: CountryId }
  | { readonly stateKey: "selectedGroupCode"; readonly value: GroupCode }
  | { readonly stateKey: "selectedDate"; readonly value: LocalDateString }
  | { readonly stateKey: "selectedVenueId"; readonly value: VenueId };

export function updateExplorerViewState(
  _data: AppData,
  indexes: Indexes,
  currentState: NormalizedExplorerViewState,
  action: ExplorerAction,
): NormalizedExplorerViewState {
  if (action.type === "clearAll") return emptyExplorerViewState;

  const normalizedCurrentState = normalizeExplorerViewState(currentState, indexes);
  const selectionUpdate = getActionSelection(action);
  const willSelect = normalizedCurrentState[selectionUpdate.stateKey] !== selectionUpdate.value;

  return setSingleSelectionValue(selectionUpdate, willSelect);
}

function getActionSelection(
  action: Exclude<ExplorerAction, { type: "clearAll" }>,
): SelectionUpdate {
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

function setSingleSelectionValue(
  selectionUpdate: SelectionUpdate,
  willSelect: boolean,
): NormalizedExplorerViewState {
  if (!willSelect) {
    return emptyExplorerViewState;
  }

  switch (selectionUpdate.stateKey) {
    case "selectedCountryId":
      return { ...emptyExplorerViewState, selectedCountryId: selectionUpdate.value };
    case "selectedGroupCode":
      return { ...emptyExplorerViewState, selectedGroupCode: selectionUpdate.value };
    case "selectedDate":
      return { ...emptyExplorerViewState, selectedDate: selectionUpdate.value };
    case "selectedVenueId":
      return { ...emptyExplorerViewState, selectedVenueId: selectionUpdate.value };
  }
}
