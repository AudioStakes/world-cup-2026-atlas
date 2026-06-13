import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { countryId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createGroupsAndTeamsViewModel } from "./createGroupsAndTeamsViewModel";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createViewModel() {
  return createGroupsAndTeamsViewModel(appData, indexes, emptyExplorerViewState);
}

describe("createGroupsAndTeamsViewModel team metadata", () => {
  it("adds FIFA code and confederation metadata for teams", () => {
    const viewModel = createViewModel();
    const groupF = viewModel.groups.find((group) => group.groupCode === "F");
    const japan = groupF?.teams.find((team) => team.countryId === countryId("jpn"));

    expect(japan).toMatchObject({
      countryCode: "JPN",
      countryName: "Japan",
      confederationLabel: "AFC",
      countryMetaLabel: "JPN · AFC",
    });
  });

  it("keeps host team metadata visible", () => {
    const viewModel = createViewModel();
    const groupD = viewModel.groups.find((group) => group.groupCode === "D");
    const unitedStates = groupD?.teams.find((team) => team.countryId === countryId("usa"));

    expect(unitedStates).toMatchObject({
      countryCode: "USA",
      countryName: "United States",
      confederationLabel: "CONCACAF",
      countryMetaLabel: "USA · CONCACAF",
    });
  });

  it("creates tournament rounds from knockout fixtures", () => {
    const viewModel = createViewModel();
    const roundOf32 = viewModel.tournamentRounds.find(
      (round) => round.stageLabel === "Round of 32",
    );
    const final = viewModel.tournamentRounds.find((round) => round.stageLabel === "Final");

    expect(viewModel.tournamentRounds.map((round) => round.stageLabel)).toEqual([
      "Round of 32",
      "Round of 16",
      "Quarter-finals",
      "Semi-finals",
      "Third-place match",
      "Final",
    ]);
    expect(roundOf32?.matchCountLabel).toBe("16 matches");
    expect(roundOf32?.matches[0]).toMatchObject({
      matchNumberLabel: "Match 73",
      dateLabel: "Jun 28",
      venueLabel: "Los Angeles",
      matchupLabel: "Runner-up Group A vs Runner-up Group B",
    });
    expect(final?.matchCountLabel).toBe("1 match");
    expect(final?.matches[0]).toMatchObject({
      matchNumberLabel: "Match 104",
      matchupLabel: "Winner Match 101 vs Winner Match 102",
    });
  });
});
