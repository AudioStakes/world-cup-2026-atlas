import { countryId, groupCode, localDate, venueId } from "../../domain/ids";
import type { Indexes } from "../../indexes/createIndexes";
import type { ExplorerSearchParams, NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

export function parseExplorerSearchParams(
  searchParamsInput: URLSearchParams | string,
  indexes: Indexes,
): NormalizedExplorerViewState {
  const searchParams = toUrlSearchParams(searchParamsInput);
  const parsedParams = parseKnownSearchParams(searchParams, indexes);

  return {
    selectedCountryId: parsedParams.country ?? emptyExplorerViewState.selectedCountryId,
    selectedGroupCode: parsedParams.group ?? emptyExplorerViewState.selectedGroupCode,
    selectedDate: parsedParams.date ?? emptyExplorerViewState.selectedDate,
    selectedVenueId: parsedParams.venue ?? emptyExplorerViewState.selectedVenueId,
  };
}

export function hasExplorerSearchParams(searchParamsInput: URLSearchParams | string): boolean {
  const searchParams = toUrlSearchParams(searchParamsInput);
  return ["country", "group", "date", "venue"].some((name) => searchParams.has(name));
}

function parseKnownSearchParams(
  searchParams: URLSearchParams,
  indexes: Indexes,
): ExplorerSearchParams {
  const parsedCountryId = parseCountryId(searchParams.get("country"), indexes);
  const parsedGroupCode = parseGroupCode(searchParams.get("group"), indexes);
  const parsedDate = parseLocalDate(searchParams.get("date"));
  const parsedVenueId = parseVenueId(searchParams.get("venue"), indexes);

  return {
    ...(parsedCountryId ? { country: parsedCountryId } : {}),
    ...(parsedGroupCode ? { group: parsedGroupCode } : {}),
    ...(parsedDate ? { date: parsedDate } : {}),
    ...(parsedVenueId ? { venue: parsedVenueId } : {}),
  };
}

function parseCountryId(value: string | null, indexes: Indexes) {
  if (!value) return null;
  const parsedCountryId = countryId(value.toLowerCase());
  return indexes.countriesById.has(parsedCountryId) ? parsedCountryId : null;
}

function parseGroupCode(value: string | null, indexes: Indexes) {
  if (!value) return null;
  const parsedGroupCode = groupCode(value.toUpperCase());
  return indexes.groupsByCode.has(parsedGroupCode) ? parsedGroupCode : null;
}

function parseLocalDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return localDate(value);
}

function parseVenueId(value: string | null, indexes: Indexes) {
  if (!value) return null;
  const parsedVenueId = venueId(value.toLowerCase());
  return indexes.venuesById.has(parsedVenueId) ? parsedVenueId : null;
}

function toUrlSearchParams(searchParamsInput: URLSearchParams | string): URLSearchParams {
  if (typeof searchParamsInput !== "string") return searchParamsInput;
  const withoutLeadingQuestionMark = searchParamsInput.startsWith("?")
    ? searchParamsInput.slice(1)
    : searchParamsInput;
  return new URLSearchParams(withoutLeadingQuestionMark);
}
