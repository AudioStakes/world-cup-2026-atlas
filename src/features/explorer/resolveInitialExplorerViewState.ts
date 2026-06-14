import type { LocalDateString } from "../../domain/ids";
import type { Indexes } from "../../indexes/createIndexes";
import {
  createDefaultExplorerViewState,
  ensureExplorerSelection,
} from "./defaultExplorerViewState";
import { hasExplorerSearchParams, parseExplorerSearchParams } from "./parseExplorerSearchParams";
import type { NormalizedExplorerViewState } from "./types";

export function resolveInitialExplorerViewState(
  searchParamsInput: URLSearchParams | string,
  indexes: Indexes,
  today?: LocalDateString,
): NormalizedExplorerViewState {
  if (hasExplorerSearchParams(searchParamsInput)) {
    return ensureExplorerSelection(parseExplorerSearchParams(searchParamsInput, indexes), today);
  }

  return createDefaultExplorerViewState(today);
}
