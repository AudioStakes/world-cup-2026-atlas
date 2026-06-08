import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { createDateSelectorViewModel } from "./createDateSelectorViewModel";
import { emptyExplorerViewState } from "./types";

function getDateOption(date: string) {
  const viewModel = createDateSelectorViewModel(appData, emptyExplorerViewState);

  for (const month of viewModel.months) {
    const option = month.dates.find((dateOption) => dateOption.date === date);
    if (option) return option;
  }

  throw new Error(`Unknown date option: ${date}`);
}

describe("createDateSelectorViewModel", () => {
  it("adds match count and kickoff range labels to fixture dates", () => {
    const dateOption = getDateOption("2026-06-14");

    expect(dateOption.hasFixture).toBe(true);
    expect(dateOption.matchCountLabel).toBe("4 matches");
    expect(dateOption.kickoffRangeLabel).toBe("12:00–20:00");
  });

  it("uses a singular match count and single kickoff time for one-match dates", () => {
    const dateOption = getDateOption("2026-07-19");

    expect(dateOption.hasFixture).toBe(true);
    expect(dateOption.matchCountLabel).toBe("1 match");
    expect(dateOption.kickoffRangeLabel).toBe("15:00");
  });

  it("keeps rest dates without match metadata", () => {
    const dateOption = getDateOption("2026-07-08");

    expect(dateOption.hasFixture).toBe(false);
    expect(dateOption.matchCountLabel).toBeNull();
    expect(dateOption.kickoffRangeLabel).toBeNull();
  });
});
