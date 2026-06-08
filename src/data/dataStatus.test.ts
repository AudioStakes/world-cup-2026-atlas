import { describe, expect, it } from "vitest";
import type { DataStatus } from "../domain/types";
import { appData } from "./appData";

type SourceTrackedRecord = {
  readonly dataStatus: DataStatus;
  readonly sourceNote?: string;
};

function getVisibleSourceTrackedRecords(): readonly SourceTrackedRecord[] {
  return [...appData.countries, ...appData.slotEntries, ...appData.venues, ...appData.matches];
}

function getCompetitionDataRecords(): readonly SourceTrackedRecord[] {
  return [...appData.countries, ...appData.slotEntries, ...appData.matches];
}

describe("data status guardrails", () => {
  it("does not mark competition data as official without a source note", () => {
    const officialCompetitionRecordsWithoutSourceNote = getCompetitionDataRecords().filter(
      (record) => record.dataStatus === "official" && !record.sourceNote,
    );

    expect(officialCompetitionRecordsWithoutSourceNote).toEqual([]);
  });

  it("does not keep placeholder records in the visible tournament dataset", () => {
    const placeholderRecords = getVisibleSourceTrackedRecords().filter(
      (record) => record.dataStatus === "placeholder",
    );

    expect(placeholderRecords).toEqual([]);
  });

  it("keeps imported competition data provisional until official source capture is complete", () => {
    const competitionDataStatuses = new Set(
      getCompetitionDataRecords().map((record) => record.dataStatus),
    );

    expect(competitionDataStatuses).toEqual(new Set(["provisional"]));
  });

  it("allows the current venue seed data to remain official while source notes are migrated", () => {
    const venueStatuses = new Set(appData.venues.map((venue) => venue.dataStatus));

    expect(venueStatuses).toEqual(new Set(["official"]));
  });
});
