import type {
  CountryId,
  GroupCode,
  LocalDateString,
  MatchId,
  SlotId,
  VenueId,
} from "../../domain/ids";
import type { MapPoint, MatchStatus } from "../../domain/types";
import type { DisplayTimeZoneId } from "./displayTimeZone";

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
  readonly timeZoneSelector: HeaderTimeZoneSelectorViewModel;
};

export type HeaderTimeZoneSelectorViewModel = {
  readonly label: string;
  readonly selectedValue: DisplayTimeZoneId;
  readonly options: readonly HeaderTimeZoneOptionViewModel[];
};

export type HeaderTimeZoneOptionViewModel = {
  readonly value: DisplayTimeZoneId;
  readonly label: string;
  readonly detailLabel: string;
};

export type ExplorePanelViewModel = {
  readonly helpText: string;
  readonly venueHelpText: string;
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly dateSelector: DateSelectorViewModel;
  readonly result: ExplorerResultViewModel;
};

export type GroupsAndTeamsViewModel = {
  readonly groups: readonly GroupTeamCardViewModel[];
  readonly tournamentRounds: readonly TournamentRoundViewModel[];
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

export type TournamentRoundViewModel = {
  readonly stageLabel: string;
  readonly matchCountLabel: string;
  readonly matches: readonly TournamentMatchViewModel[];
};

export type TournamentMatchViewModel = {
  readonly matchId: MatchId;
  readonly matchNumberLabel: string;
  readonly dateLabel: string;
  readonly venueLabel: string;
  readonly matchupLabel: string;
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
  readonly isToday: boolean;
  readonly availability: FilterOptionAvailability;
  readonly hasFixture: boolean;
};

export type ExplorerResultType = "country" | "group" | "date" | "venue" | "empty";

export type ExplorerResultViewModel = {
  readonly type: ExplorerResultType;
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly matchCount: number;
  readonly groupNavigation: ResultGroupNavigationViewModel | null;
  readonly details: ExplorerDetailViewModel | null;
  readonly emptyMessage: string | null;
  readonly matches: readonly MatchListItemViewModel[];
  readonly routeSummary: CountryRouteSummaryViewModel | null;
};

export type ResultGroupNavigationViewModel = {
  readonly groupCode: GroupCode;
  readonly label: string;
  readonly trailingLabel: string;
  readonly href: string;
  readonly ariaLabel: string;
};

export type ExplorerDetailViewModel =
  | CountryDetailViewModel
  | DateDetailViewModel
  | VenueDetailViewModel
  | GroupDetailViewModel;

export type DetailMetricViewModel = {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
};

export type CountryDetailViewModel = {
  readonly type: "country";
  readonly metrics: readonly DetailMetricViewModel[];
};

export type DateDetailViewModel = {
  readonly type: "date";
  readonly metrics: readonly DetailMetricViewModel[];
};

export type VenueDetailViewModel = {
  readonly type: "venue";
  readonly metrics: readonly DetailMetricViewModel[];
};

export type GroupDetailViewModel = {
  readonly type: "group";
  readonly groupLabel: string;
  readonly standings: readonly GroupStandingRowViewModel[];
};

export type GroupStandingRowViewModel = {
  readonly countryId: CountryId | null;
  readonly position: number;
  readonly teamLabel: string;
  readonly teamPlainLabel: string;
  readonly teamCodeLabel: string;
  readonly teamFlagEmoji: string | null;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifferenceLabel: string;
  readonly points: number;
  readonly form: readonly GroupStandingFormEntryViewModel[];
};

export type GroupStandingFormEntryViewModel = {
  readonly result: "win" | "draw" | "loss" | "pending";
  readonly label: string;
};

export type MatchListItemViewModel = {
  readonly matchId: MatchId;
  readonly matchNumberLabel: string;
  readonly stageLabel: string;
  readonly stageMetaLabel: string;
  readonly groupCode: GroupCode | null;
  readonly groupLabel: string | null;
  readonly dateLabel: string;
  readonly dateHeadingLabel: string;
  readonly isInitialScrollTarget: boolean;
  readonly primaryText: string;
  readonly homeTeam: MatchTeamViewModel;
  readonly awayTeam: MatchTeamViewModel;
  readonly matchupText: string;
  readonly matchupAriaLabel: string;
  readonly kickoffLabel: string;
  readonly homeScoreLabel: string | null;
  readonly awayScoreLabel: string | null;
  readonly winningSide: "home" | "away" | null;
  readonly scoreLineLabel: string | null;
  readonly normalizedStatus: MatchStatus;
  readonly shortStatusLabel: string | null;
  readonly statusLabel: string;
  readonly secondaryText: string;
  readonly fixtureMetaLabel: string;
  readonly venueId: VenueId;
  readonly venueLabel: string;
  readonly venueFixtureLabel: string;
  readonly venueDetailLabel: string;
};

export type MatchTeamViewModel = {
  readonly countryId: CountryId | null;
  readonly flagEmoji: string | null;
  readonly displayName: string;
  readonly code: string | null;
};

export type CountryRouteSummaryViewModel = {
  readonly matchCount: number;
  readonly visitedVenueCount: number;
  readonly itineraryLabel: string;
  readonly distanceMethodLabel: string;
  readonly venueCountExplanationLabel: string | null;
  readonly totalDistanceKm: number;
  readonly totalDistanceLabel: string;
  readonly legs: readonly CountryRouteLegViewModel[];
};

export type CountryRouteLegViewModel = {
  readonly fromDateLabel: string;
  readonly toDateLabel: string;
  readonly fromVenueLabel: string;
  readonly toVenueLabel: string;
  readonly distanceLabel: string;
};

export type ExplorerMapViewModel = {
  readonly backgroundFeatures: readonly ExplorerMapBackgroundFeatureViewModel[];
  readonly venueMarkers: readonly VenueMarkerViewModel[];
  readonly routes: readonly MapRouteViewModel[];
};

export type ExplorerMapBackgroundFeatureViewModel = {
  readonly id: string;
  readonly className: string;
  readonly pathData: string;
};

export type VenueMarkerState = "selected" | "highlighted" | "dimmed" | "normal";

export type VenueMarkerViewModel = {
  readonly venueId: VenueId;
  readonly venueName: string;
  readonly stadiumName: string;
  readonly cityLabel: string;
  readonly timeZoneLabel: string;
  readonly matchCount: number;
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
