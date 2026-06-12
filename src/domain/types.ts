import type {
  CountryId,
  GroupCode,
  LocalDateString,
  LocalTimeString,
  MatchId,
  SlotId,
  VenueId,
} from "./ids";

export type DataStatus = "official" | "provisional" | "placeholder";

export type Confederation = "AFC" | "CAF" | "CONCACAF" | "CONMEBOL" | "OFC" | "UEFA";

export type Country = {
  readonly id: CountryId;
  readonly fifaCode: string;
  readonly name: string;
  readonly shortName: string;
  readonly flagEmoji: string;
  readonly confederation: Confederation;
  readonly fifaRanking?: {
    readonly rank: number;
    readonly sourceDate: LocalDateString;
  };
  readonly previousWorldCupResult?: string;
  readonly dataStatus: DataStatus;
  readonly sourceNote?: string;
};

export type GroupSlotIndex = 1 | 2 | 3 | 4;

export type Group = {
  readonly code: GroupCode;
  readonly name: string;
  readonly slots: readonly SlotId[];
};

export type SlotEntry = {
  readonly slotId: SlotId;
  readonly groupCode: GroupCode;
  readonly slotIndex: GroupSlotIndex;
  readonly countryId?: CountryId;
  readonly dataStatus: DataStatus;
  readonly sourceNote?: string;
};

export type HostCountryCode = "CAN" | "MEX" | "USA";

export type VenueTimeZone = {
  readonly ianaName: string;
  readonly abbreviation: "PT" | "MT" | "CT" | "ET";
};

export type GeoPoint = {
  readonly latitude: number;
  readonly longitude: number;
};

export type MapPoint = {
  readonly x: number;
  readonly y: number;
};

export type Venue = {
  readonly id: VenueId;
  readonly name: string;
  readonly city: string;
  readonly countryCode: HostCountryCode;
  readonly stadiumName: string;
  readonly timeZone: VenueTimeZone;
  readonly geoPoint: GeoPoint;
  readonly mapPoint: MapPoint;
  readonly dataStatus: DataStatus;
  readonly sourceNote?: string;
};

export type TournamentStage =
  | "group"
  | "roundOf32"
  | "roundOf16"
  | "quarterFinal"
  | "semiFinal"
  | "thirdPlace"
  | "final";

export type GroupPlacement = 1 | 2 | 3;

export type MatchParticipant =
  | {
      readonly type: "slot";
      readonly slotId: SlotId;
      readonly countryId?: CountryId;
    }
  | {
      readonly type: "groupPlacement";
      readonly groupCode: GroupCode;
      readonly placement: GroupPlacement;
    }
  | {
      readonly type: "thirdPlaceQualifier";
      readonly candidateGroupCodes: readonly GroupCode[];
    }
  | {
      readonly type: "matchWinner";
      readonly matchId: MatchId;
    }
  | {
      readonly type: "matchLoser";
      readonly matchId: MatchId;
    };

export type Match = {
  readonly id: MatchId;
  readonly matchNumber: number;
  readonly stage: TournamentStage;
  readonly date: LocalDateString;
  readonly kickoffLocal: LocalTimeString;
  readonly groupCode?: GroupCode;
  readonly venueId: VenueId;
  readonly homeParticipant: MatchParticipant;
  readonly awayParticipant: MatchParticipant;
  readonly result?: MatchResult;
  readonly dataStatus: DataStatus;
  readonly sourceNote?: string;
};

export type MatchResult = {
  readonly status: "fullTime";
  readonly homeGoals: number;
  readonly awayGoals: number;
};

export type AppData = {
  readonly countries: readonly Country[];
  readonly groups: readonly Group[];
  readonly slotEntries: readonly SlotEntry[];
  readonly venues: readonly Venue[];
  readonly matches: readonly Match[];
};
