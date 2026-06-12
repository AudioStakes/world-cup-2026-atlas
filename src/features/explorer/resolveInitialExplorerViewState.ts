import type { LocalDateString } from "../../domain/ids";
import type { Indexes } from "../../indexes/createIndexes";
import { hasExplorerSearchParams, parseExplorerSearchParams } from "./parseExplorerSearchParams";
import { getDefaultTournamentDate } from "./tournamentDates";
import type { NormalizedExplorerViewState } from "./types";
import { emptyExplorerViewState } from "./types";

export function resolveInitialExplorerViewState(
  searchParamsInput: URLSearchParams | string,
  indexes: Indexes,
  today?: LocalDateString,
): NormalizedExplorerViewState {
  if (hasExplorerSearchParams(searchParamsInput)) {
    return parseExplorerSearchParams(searchParamsInput, indexes);
  }

  return { ...emptyExplorerViewState, selectedDate: getDefaultTournamentDate(today) };
}
