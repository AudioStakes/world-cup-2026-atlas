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
});
