import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { localDate } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createResultViewModel } from "./createResultViewModel";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createResultForDate(date: string) {
  const matches = appData.matches.filter((match) => match.date === localDate(date));

  return createResultViewModel(
    appData,
    indexes,
    { ...emptyExplorerViewState, selectedDate: localDate(date) },
    matches,
  );
}

describe("createResultViewModel match metadata", () => {
  it("adds match number and group labels for group-stage matches", () => {
    const result = createResultForDate("2026-06-14");
    const japanMatch = result.matches.find((match) => match.matchNumberLabel === "Match 11");

    expect(japanMatch?.stageLabel).toBe("Group F");
    expect(japanMatch?.secondaryText).toBe("15:00 CT");
  });

  it("adds final stage labels and time zone abbreviations for knockout matches", () => {
    const result = createResultForDate("2026-07-19");
    const final = result.matches[0];

    expect(final?.matchNumberLabel).toBe("Match 104");
    expect(final?.stageLabel).toBe("Final");
    expect(final?.secondaryText).toBe("15:00 ET");
  });
});
