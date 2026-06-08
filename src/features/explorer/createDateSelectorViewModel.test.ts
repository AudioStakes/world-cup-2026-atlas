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
  it("adds match count, kickoff range, and time zone summary labels to fixture dates", () => {
    const dateOption = getDateOption("2026-06-14");

    expect(dateOption.hasFixture).toBe(true);
    expect(dateOption.matchCountLabel).toBe("4 matches");
    expect(dateOption.kickoffRangeLabel).toBe("12:00–20:00");
    expect(dateOption.timeZoneSummaryLabel).toBe("CT/ET");
  });

  it("uses a singular match count and one time zone for one-match dates", () => {
    const dateOption = getDateOption("2026-07-19");

    expect(dateOption.hasFixture).toBe(true);
    expect(dateOption.matchCountLabel).toBe("1 match");
    expect(dateOption.kickoffRangeLabel).toBe("15:00");
    expect(dateOption.timeZoneSummaryLabel).toBe("ET");
  });

  it("summarizes multi-time-zone dates in west-to-east display order", () => {
    const dateOption = getDateOption("2026-06-13");

    expect(dateOption.timeZoneSummaryLabel).toBe("PT/ET");
  });

  it("keeps rest dates without match metadata", () => {
    const dateOption = getDateOption("2026-07-08");

    expect(dateOption.hasFixture).toBe(false);
    expect(dateOption.matchCountLabel).toBeNull();
    expect(dateOption.kickoffRangeLabel).toBeNull();
    expect(dateOption.timeZoneSummaryLabel).toBeNull();
  });
});
