import { describe, expect, it } from "vitest";
import type { DataStatus } from "../domain/types";
import { appData } from "./appData";
import { dataSources } from "./dataSources";

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

function getKnownSourceIds(): ReadonlySet<string> {
  return new Set(dataSources.map((source) => source.id));
}

function getSourceNoteId(sourceNote: string): string {
  return sourceNote.split(":")[0]?.trim() ?? sourceNote;
}

describe("data status guardrails", () => {
  it("does not mark any visible data as official without a source note", () => {
    const officialRecordsWithoutSourceNote = getVisibleSourceTrackedRecords().filter(
      (record) => record.dataStatus === "official" && !record.sourceNote,
    );

    expect(officialRecordsWithoutSourceNote).toEqual([]);
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

  it("keeps the current venue seed data official with source notes", () => {
    const venueStatuses = new Set(appData.venues.map((venue) => venue.dataStatus));

    expect(venueStatuses).toEqual(new Set(["official"]));
    expect(appData.venues.every((venue) => Boolean(venue.sourceNote))).toBe(true);
  });

  it("keeps every visible production record traceable to a source note", () => {
    const recordsWithoutSourceNote = getVisibleSourceTrackedRecords().filter(
      (record) => !record.sourceNote,
    );

    expect(recordsWithoutSourceNote).toEqual([]);
  });

  it("keeps every source note linked to a known data source id", () => {
    const knownSourceIds = getKnownSourceIds();
    const unknownSourceNotes = getVisibleSourceTrackedRecords()
      .map((record) => record.sourceNote)
      .filter((sourceNote): sourceNote is string => Boolean(sourceNote))
      .filter((sourceNote) => !knownSourceIds.has(getSourceNoteId(sourceNote)));

    expect(unknownSourceNotes).toEqual([]);
  });
});
