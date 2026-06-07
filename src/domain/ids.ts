export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type CountryId = Brand<string, "CountryId">;
export type GroupCode = Brand<string, "GroupCode">;
export type SlotId = Brand<string, "SlotId">;
export type VenueId = Brand<string, "VenueId">;
export type MatchId = Brand<string, "MatchId">;
export type LocalDateString = Brand<string, "LocalDateString">;
export type LocalTimeString = Brand<string, "LocalTimeString">;

export function countryId(value: string): CountryId {
  return value as CountryId;
}

export function groupCode(value: string): GroupCode {
  return value as GroupCode;
}

export function slotId(value: string): SlotId {
  return value as SlotId;
}

export function venueId(value: string): VenueId {
  return value as VenueId;
}

export function matchId(value: string): MatchId {
  return value as MatchId;
}

export function localDate(value: string): LocalDateString {
  return value as LocalDateString;
}

export function localTime(value: string): LocalTimeString {
  return value as LocalTimeString;
}
