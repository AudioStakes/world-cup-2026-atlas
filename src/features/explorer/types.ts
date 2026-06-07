import type { CountryId, GroupCode, LocalDateString, VenueId } from "../../domain/ids";

export type ExplorerSelectionType = "country" | "group" | "date" | "venue";

export type ExplorerViewState = {
  readonly selectedCountryId: CountryId | null;
  readonly selectedGroupCode: GroupCode | null;
  readonly selectedDate: LocalDateString | null;
  readonly selectedVenueId: VenueId | null;
};

export type NormalizedExplorerViewState = ExplorerViewState;

export type ExplorerAction =
  | { readonly type: "selectCountry"; readonly countryId: CountryId }
  | { readonly type: "selectGroup"; readonly groupCode: GroupCode }
  | { readonly type: "selectDate"; readonly date: LocalDateString }
  | { readonly type: "selectVenue"; readonly venueId: VenueId }
  | { readonly type: "clearAll" };

export type ExplorerSearchParams = {
  readonly country?: CountryId;
  readonly group?: GroupCode;
  readonly date?: LocalDateString;
  readonly venue?: VenueId;
};

export const emptyExplorerViewState: NormalizedExplorerViewState = {
  selectedCountryId: null,
  selectedGroupCode: null,
  selectedDate: null,
  selectedVenueId: null,
};
