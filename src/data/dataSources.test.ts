import { describe, expect, it } from "vitest";
import { dataSources } from "./dataSources";

describe("data source policy", () => {
  it("uses unique data source ids", () => {
    const ids = dataSources.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every data source documented with a URL and access date", () => {
    for (const source of dataSources) {
      expect(source.title.length).toBeGreaterThan(0);
      expect(source.publisher.length).toBeGreaterThan(0);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.purposes.length).toBeGreaterThan(0);
      expect(source.notes.length).toBeGreaterThan(0);
    }
  });

  it("keeps at least one official source target for core production data", () => {
    const officialPurposes = new Set(
      dataSources
        .filter((source) => source.reliability === "official")
        .flatMap((source) => source.purposes),
    );

    expect(officialPurposes.has("fixtures")).toBe(true);
    expect(officialPurposes.has("groups")).toBe(true);
    expect(officialPurposes.has("venues")).toBe(true);
    expect(officialPurposes.has("competition-format")).toBe(true);
  });
});
