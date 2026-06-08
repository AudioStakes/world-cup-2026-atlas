import { describe, expect, it } from "vitest";
import type { MatchId } from "../domain/ids";
import { groupCode, matchId, venueId } from "../domain/ids";
import type { Match, MatchParticipant, TournamentStage } from "../domain/types";
import { appData } from "./appData";

const expectedKnockoutStageCounts = {
  roundOf32: 16,
  roundOf16: 8,
  quarterFinal: 4,
  semiFinal: 2,
  thirdPlace: 1,
  final: 1,
} as const satisfies Partial<Record<TournamentStage, number>>;

function getMatchByNumber(matchNumber: number): Match {
  const match = appData.matches.find((candidate) => candidate.matchNumber === matchNumber);

  if (!match) {
    throw new Error(`Unknown match number: ${matchNumber}`);
  }

  return match;
}

function expectGroupPlacementParticipant(
  participant: MatchParticipant,
  expectedGroupCode: string,
  expectedPlacement: number,
) {
  expect(participant).toMatchObject({
    type: "groupPlacement",
    groupCode: groupCode(expectedGroupCode),
    placement: expectedPlacement,
  });
}

function expectThirdPlaceParticipant(
  participant: MatchParticipant,
  expectedCandidateGroupCodes: readonly string[],
) {
  expect(participant.type).toBe("thirdPlaceQualifier");

  if (participant.type !== "thirdPlaceQualifier") {
    return;
  }

  expect(participant.candidateGroupCodes).toEqual(
    expectedCandidateGroupCodes.map((candidateGroupCode) => groupCode(candidateGroupCode)),
  );
}

function expectMatchReferenceParticipant(
  participant: MatchParticipant,
  expectedType: "matchWinner" | "matchLoser",
  expectedMatchNumber: number,
) {
  expect(participant).toMatchObject({
    type: expectedType,
    matchId: matchId(`match-${String(expectedMatchNumber).padStart(3, "0")}`),
  });
}

function getReferencedMatchIds(participant: MatchParticipant): readonly MatchId[] {
  if (participant.type === "matchWinner" || participant.type === "matchLoser") {
    return [participant.matchId];
  }

  return [];
}

describe("knockout fixture coverage", () => {
  it("keeps knockout stage counts stable", () => {
    for (const [stage, expectedCount] of Object.entries(expectedKnockoutStageCounts)) {
      expect(
        appData.matches.filter((match) => match.stage === stage),
        `${stage} should have ${expectedCount} matches`,
      ).toHaveLength(expectedCount);
    }
  });

  it("keeps Round of 32 bracket entry participants stable", () => {
    expectGroupPlacementParticipant(getMatchByNumber(73).homeParticipant, "A", 2);
    expectGroupPlacementParticipant(getMatchByNumber(73).awayParticipant, "B", 2);

    expectGroupPlacementParticipant(getMatchByNumber(74).homeParticipant, "E", 1);
    expectThirdPlaceParticipant(getMatchByNumber(74).awayParticipant, ["A", "B", "C", "D", "F"]);

    expectGroupPlacementParticipant(getMatchByNumber(79).homeParticipant, "A", 1);
    expectThirdPlaceParticipant(getMatchByNumber(79).awayParticipant, ["C", "E", "F", "H", "I"]);

    expectGroupPlacementParticipant(getMatchByNumber(85).homeParticipant, "B", 1);
    expectThirdPlaceParticipant(getMatchByNumber(85).awayParticipant, ["E", "F", "G", "I", "J"]);
  });

  it("keeps later knockout rounds linked to prior match winners", () => {
    expectMatchReferenceParticipant(getMatchByNumber(89).homeParticipant, "matchWinner", 74);
    expectMatchReferenceParticipant(getMatchByNumber(89).awayParticipant, "matchWinner", 77);

    expectMatchReferenceParticipant(getMatchByNumber(97).homeParticipant, "matchWinner", 89);
    expectMatchReferenceParticipant(getMatchByNumber(97).awayParticipant, "matchWinner", 90);

    expectMatchReferenceParticipant(getMatchByNumber(101).homeParticipant, "matchWinner", 97);
    expectMatchReferenceParticipant(getMatchByNumber(101).awayParticipant, "matchWinner", 98);
  });

  it("keeps the third-place match linked to semi-final losers", () => {
    const thirdPlaceMatch = getMatchByNumber(103);

    expect(thirdPlaceMatch.stage).toBe("thirdPlace");
    expect(thirdPlaceMatch.venueId).toBe(venueId("miami"));
    expectMatchReferenceParticipant(thirdPlaceMatch.homeParticipant, "matchLoser", 101);
    expectMatchReferenceParticipant(thirdPlaceMatch.awayParticipant, "matchLoser", 102);
  });

  it("keeps the final linked to semi-final winners", () => {
    const final = getMatchByNumber(104);

    expect(final.stage).toBe("final");
    expect(final.date).toBe("2026-07-19");
    expect(final.venueId).toBe(venueId("new-york-new-jersey"));
    expectMatchReferenceParticipant(final.homeParticipant, "matchWinner", 101);
    expectMatchReferenceParticipant(final.awayParticipant, "matchWinner", 102);
  });

  it("keeps match winner and loser references pointing backward", () => {
    const matchNumberById = new Map(
      appData.matches.map((match) => [match.id, match.matchNumber] as const),
    );

    for (const match of appData.matches) {
      const referencedMatchIds = [
        ...getReferencedMatchIds(match.homeParticipant),
        ...getReferencedMatchIds(match.awayParticipant),
      ];

      for (const referencedMatchId of referencedMatchIds) {
        const referencedMatchNumber = matchNumberById.get(referencedMatchId);

        expect(referencedMatchNumber, `${match.id} should reference a known match`).toBeDefined();
        expect(referencedMatchNumber, `${match.id} should reference an earlier match`).toBeLessThan(
          match.matchNumber,
        );
      }
    }
  });

  it("keeps knockout matches free of concrete country participants before results are known", () => {
    const knockoutMatches = appData.matches.filter((match) => match.stage !== "group");

    for (const match of knockoutMatches) {
      expect(match.homeParticipant.type).not.toBe("slot");
      expect(match.awayParticipant.type).not.toBe("slot");
    }
  });
});
