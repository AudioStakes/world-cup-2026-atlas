import type { AppData, Match } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { createDateSelectorViewModel } from "./createDateSelectorViewModel";
import { createGroupsAndTeamsViewModel } from "./createGroupsAndTeamsViewModel";
import { createResultViewModel } from "./createResultViewModel";
import { venueLocalDisplayTimeZoneId } from "./displayTimeZone";
import type { ExplorePanelViewModel, NormalizedExplorerViewState } from "./types";

export function createExplorePanelViewModel(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
  matchingMatches: readonly Match[],
  displayTimeZoneId = venueLocalDisplayTimeZoneId,
  browserLocalTimeZone: string | null = null,
): ExplorePanelViewModel {
  return {
    helpText: "Choose a group, team, date, or venue on the map.",
    venueHelpText: "Click a venue pin on the map to filter by venue.",
    groupsAndTeams: createGroupsAndTeamsViewModel(data, indexes, viewState),
    dateSelector: createDateSelectorViewModel(
      data,
      viewState,
      undefined,
      displayTimeZoneId,
      browserLocalTimeZone,
    ),
    result: createResultViewModel(
      data,
      indexes,
      viewState,
      matchingMatches,
      displayTimeZoneId,
      browserLocalTimeZone,
    ),
  };
}
