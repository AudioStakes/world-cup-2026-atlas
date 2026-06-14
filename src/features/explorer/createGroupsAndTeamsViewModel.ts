import { formatParticipantLabel, getMatchCountryIds } from "../../data/matchParticipants";
import type { CountryId, GroupCode } from "../../domain/ids";
import type { AppData, Country, Match, TournamentStage } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { formatDateLabel } from "./formatExplorerLabels";
import type {
  FilterOptionAvailability,
  GroupsAndTeamsViewModel,
  NormalizedExplorerViewState,
  TournamentMatchViewModel,
  TournamentRoundViewModel,
} from "./types";

const knockoutStageOrder: readonly TournamentStage[] = [
  "roundOf32",
  "roundOf16",
  "quarterFinal",
  "semiFinal",
  "thirdPlace",
  "final",
];

export function createGroupsAndTeamsViewModel(
  data: AppData,
  indexes: Indexes,
  viewState: NormalizedExplorerViewState,
): GroupsAndTeamsViewModel {
  const hitSets = createHitSets(data, viewState);
  const hasAnySelection = hasSelection(viewState);

  return {
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
          const countryCode = country?.fifaCode ?? slotId;
          const confederationLabel = country?.confederation ?? null;

          return {
            slotId,
            countryId,
            countryCode,
            countryName: country?.name ?? `Slot ${slotId}`,
            confederationLabel,
            countryMetaLabel: createCountryMetaLabel(countryCode, country),
            flagEmoji: country?.flagEmoji ?? "🏳️",
            isSelected: isCountrySelected,
            availability: getAvailability(hasAnySelection, isCountrySelected || isCountryHit),
          };
        }),
      };
    }),
    tournamentRounds: createTournamentRounds(data, indexes),
  };
}

function createTournamentRounds(
  data: AppData,
  indexes: Indexes,
): readonly TournamentRoundViewModel[] {
  return knockoutStageOrder.flatMap((stage) => {
    const matches = data.matches
      .filter((match) => match.stage === stage)
      .slice()
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) || left.matchNumber - right.matchNumber,
      );

    if (matches.length === 0) {
      return [];
    }

    return [
      {
        stageLabel: formatTournamentStageLabel(stage),
        matchCountLabel: `${matches.length} ${matches.length === 1 ? "match" : "matches"}`,
        matches: matches.map((match) => createTournamentMatch(match, indexes)),
      },
    ];
  });
}

function createTournamentMatch(match: Match, indexes: Indexes): TournamentMatchViewModel {
  return {
    matchId: match.id,
    matchNumberLabel: `Match ${match.matchNumber}`,
    dateLabel: formatDateLabel(match.date),
    venueLabel: indexes.venuesById.get(match.venueId)?.name ?? "Venue TBD",
    matchupLabel: `${formatParticipantLabel(match.homeParticipant)} vs ${formatParticipantLabel(
      match.awayParticipant,
    )}`,
  };
}

function formatTournamentStageLabel(stage: TournamentStage): string {
  switch (stage) {
    case "group":
      return "Group stage";
    case "roundOf32":
      return "Round of 32";
    case "roundOf16":
      return "Round of 16";
    case "quarterFinal":
      return "Quarter-finals";
    case "semiFinal":
      return "Semi-finals";
    case "thirdPlace":
      return "Third-place match";
    case "final":
      return "Final";
  }
}

function createCountryMetaLabel(countryCode: string, country: Country | undefined): string {
  return country ? `${countryCode} · ${country.confederation}` : countryCode;
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
    if ("groupCode" in match && match.groupCode) {
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
