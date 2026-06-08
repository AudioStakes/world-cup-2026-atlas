import type { CountryId, GroupCode, MatchId, SlotId } from "../domain/ids";
import type { GroupPlacement, Match, MatchParticipant } from "../domain/types";

export function slotParticipant(slotId: SlotId, countryId: CountryId): MatchParticipant {
  return {
    type: "slot",
    slotId,
    countryId,
  };
}

export function groupPlacementParticipant(
  groupCode: GroupCode,
  placement: GroupPlacement,
): MatchParticipant {
  return {
    type: "groupPlacement",
    groupCode,
    placement,
  };
}

export function thirdPlaceQualifierParticipant(
  candidateGroupCodes: readonly GroupCode[],
): MatchParticipant {
  return {
    type: "thirdPlaceQualifier",
    candidateGroupCodes,
  };
}

export function matchWinnerParticipant(matchId: MatchId): MatchParticipant {
  return {
    type: "matchWinner",
    matchId,
  };
}

export function matchLoserParticipant(matchId: MatchId): MatchParticipant {
  return {
    type: "matchLoser",
    matchId,
  };
}

export function getParticipantCountryId(participant: MatchParticipant): CountryId | null {
  return participant.type === "slot" ? (participant.countryId ?? null) : null;
}

export function getParticipantSlotId(participant: MatchParticipant): SlotId | null {
  return participant.type === "slot" ? participant.slotId : null;
}

export function getMatchCountryIds(match: Match): readonly CountryId[] {
  return [match.homeParticipant, match.awayParticipant]
    .map((participant) => getParticipantCountryId(participant))
    .filter((countryId): countryId is CountryId => Boolean(countryId));
}

export function matchHasCountry(match: Match, countryId: CountryId): boolean {
  return getMatchCountryIds(match).includes(countryId);
}

export function getOpponentCountryId(match: Match, selectedCountryId: CountryId): CountryId | null {
  const [homeCountryId, awayCountryId] = [
    getParticipantCountryId(match.homeParticipant),
    getParticipantCountryId(match.awayParticipant),
  ];

  if (homeCountryId === selectedCountryId) return awayCountryId;
  if (awayCountryId === selectedCountryId) return homeCountryId;
  return null;
}
