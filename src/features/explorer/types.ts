import type {
  CountryId,
  GroupCode,
  LocalDateString,
  MatchId,
  SlotId,
  VenueId,
} from "../../domain/ids";
import type { MapPoint } from "../../domain/types";

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

export type FilterOptionAvailability = "available" | "outsideCurrentFilter";

export type ExplorerViewModel = {
  readonly viewState: NormalizedExplorerViewState;
  readonly header: ExplorerHeaderViewModel;
  readonly explorePanel: ExplorePanelViewModel;
  readonly map: ExplorerMapViewModel;
};

export type ExplorerHeaderViewModel = {
  readonly title: string;
  readonly subtitle: string;
  readonly urlStateLabel: string;
  readonly canClear: boolean;
};

export type ExplorePanelViewModel = {
  readonly helpText: string;
  readonly venueHelpText: string;
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly dateSelector: DateSelectorViewModel;
  readonly result: ExplorerResultViewModel;
};

export type GroupsAndTeamsViewModel = {
  readonly title: string;
  readonly groups: readonly GroupTeamCardViewModel[];
};

export type GroupTeamCardViewModel = {
  readonly groupCode: GroupCode;
  readonly groupName: string;
  readonly isSelected: boolean;
  readonly isRelatedToSelectedCountry: boolean;
  readonly availability: FilterOptionAvailability;
  readonly teams: readonly GroupTeamRowViewModel[];
};

export type GroupTeamRowViewModel = {
  readonly slotId: SlotId;
  readonly countryId: CountryId | null;
  readonly countryCode: string;
  readonly countryName: string;
  readonly confederationLabel: string | null;
  readonly countryMetaLabel: string;
  readonly flagEmoji: string;
  readonly isSelected: boolean;
  readonly availability: FilterOptionAvailability;
};

export type DateSelectorViewModel = {
  readonly title: string;
  readonly months: readonly DateMonthViewModel[];
};

export type DateMonthViewModel = {
  readonly monthLabel: string;
  readonly dates: readonly DateOptionViewModel[];
};

export type DateOptionViewModel = {
  readonly date: LocalDateString;
  readonly label: string;
  readonly matchCountLabel: string | null;
  readonly kickoffRangeLabel: string | null;
  readonly timeZoneSummaryLabel: string | null;
  readonly isSelected: boolean;
  readonly availability: FilterOptionAvailability;
  readonly hasFixture: boolean;
};

export type ExplorerResultType = "country" | "group" | "date" | "venue" | "empty";

export type ExplorerResultViewModel = {
  readonly type: ExplorerResultType;
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly emptyMessage: string | null;
  readonly matches: readonly MatchListItemViewModel[];
  readonly routeSummary: CountryRouteSummaryViewModel | null;
};

export type MatchListItemViewModel = {
  readonly matchId: MatchId;
  readonly matchNumberLabel: string;
  readonly stageLabel: string;
  readonly dateLabel: string;
  readonly primaryText: string;
  readonly secondaryText: string;
  readonly venueId: VenueId;
  readonly venueLabel: string;
  readonly venueDetailLabel: string;
};

export type CountryRouteSummaryViewModel = {
  readonly matchCount: number;
  readonly visitedVenueCount: number;
  readonly itineraryLabel: string;
  readonly totalDistanceKm: number;
  readonly totalDistanceLabel: string;
};

export type ExplorerMapViewModel = {
  readonly venueMarkers: readonly VenueMarkerViewModel[];
  readonly routes: readonly MapRouteViewModel[];
};

export type VenueMarkerState = "selected" | "highlighted" | "dimmed" | "normal";

export type VenueMarkerViewModel = {
  readonly venueId: VenueId;
  readonly venueName: string;
  readonly stadiumName: string;
  readonly cityLabel: string;
  readonly timeZoneLabel: string;
  readonly label: string;
  readonly tooltipLabel: string;
  readonly ariaLabel: string;
  readonly position: MapPoint;
  readonly state: VenueMarkerState;
};

export type MapRouteKind = "groupStage" | "knockout";

export type MapRouteViewModel = {
  readonly kind: MapRouteKind;
  readonly fromVenueId: VenueId;
  readonly toVenueId: VenueId;
  readonly from: MapPoint;
  readonly to: MapPoint;
  readonly distanceKm: number;
  readonly distanceLabel: string;
  readonly showDistanceLabel: boolean;
};
