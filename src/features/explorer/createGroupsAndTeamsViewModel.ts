import { getMatchCountryIds } from "../../data/matchParticipants";
import type { CountryId, GroupCode } from "../../domain/ids";
import type { AppData, Match } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import type {
  FilterOptionAvailability,
  GroupsAndTeamsViewModel,
  NormalizedExplorerViewState,
} from "./types";

export function createGroupsAndTeamsViewModel(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
): GroupsAndTeamsViewModel {
  const hitSets = createHitSets(data, viewState);
  const hasAnySelection = hasSelection(viewState);

  return {
    title: "Groups & Teams",
    groups: data.groups.map((group) => {
      const isSelected = viewState.selectedGroupCode === group.code;
      const hasHit = hitSets.groupCodes.has(group.code);
      const isRelatedToSelectedCountry = group.slots.some((slotId) => {
        const slotEntry = indexes.slotEntriesBySlotId.get(slotId);
        return Boolean(
          viewState.selectedCountryId && slotEntry?.countryId === viewState.selectedCountryId,
        );
      });
      const availability = getAvailability(
        hasAnySelection,
        isSelected || hasHit || isRelatedToSelectedCountry,
      );

      return {
        groupCode: group.code,
        groupName: group.name,
        isSelected,
        isRelatedToSelectedCountry,
        availability,
        teams: group.slots.map((slotId) => {
          const slotEntry = indexes.slotEntriesBySlotId.get(slotId);
          const countryId = slotEntry?.countryId ?? null;
          const country = countryId ? indexes.countriesById.get(countryId) : undefined;
          const isCountrySelected = Boolean(
            countryId && viewState.selectedCountryId && countryId === viewState.selectedCountryId,
          );
          const isCountryHit = Boolean(countryId && hitSets.countryIds.has(countryId));

          return {
            slotId,
            countryId,
            countryCode: country?.fifaCode ?? slotId,
            countryName: country?.name ?? `Slot ${slotId}`,
            flagEmoji: country?.flagEmoji ?? "🏳️",
            isSelected: isCountrySelected,
            availability: getAvailability(hasAnySelection, isCountrySelected || isCountryHit),
          };
        }),
      };
    }),
  };
}

type HitSets = {
  readonly countryIds: ReadonlySet<CountryId>;
  readonly groupCodes: ReadonlySet<GroupCode>;
};

function createHitSets(data: AppData, viewState: NormalizedExplorerViewState): HitSets {
  const countryHits = new Set<CountryId>();
  const groupHits = new Set<GroupCode>();

  getMatchesForAvailability(data, viewState, "country").forEach((match) => {
    appendMatchCountries(countryHits, match);
  });

  getMatchesForAvailability(data, viewState, "group").forEach((match) => {
    if (match.groupCode) {
      groupHits.add(match.groupCode);
    }
  });

  return { countryIds: countryHits, groupCodes: groupHits };
}

type AvailabilityTarget = "country" | "group";

function getMatchesForAvailability(
  data: AppData,
  viewState: NormalizedExplorerViewState,
  target: AvailabilityTarget,
): readonly Match[] {
  if (target === "country") {
    return queryMatchesByViewState(data, { ...viewState, selectedCountryId: null });
  }

  return queryMatchesByViewState(data, { ...viewState, selectedGroupCode: null });
}

function appendMatchCountries(countryIds: Set<CountryId>, match: Match): void {
  for (const countryId of getMatchCountryIds(match)) {
    countryIds.add(countryId);
  }
}

function getAvailability(
  hasAnySelection: boolean,
  isAvailableUnderCurrentFilter: boolean,
): FilterOptionAvailability {
  return !hasAnySelection || isAvailableUnderCurrentFilter ? "available" : "outsideCurrentFilter";
}

function hasSelection(viewState: NormalizedExplorerViewState): boolean {
  return Boolean(
    viewState.selectedCountryId ||
      viewState.selectedGroupCode ||
      viewState.selectedDate ||
      viewState.selectedVenueId,
  );
}
