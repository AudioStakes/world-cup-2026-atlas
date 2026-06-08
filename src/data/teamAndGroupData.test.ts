import { describe, expect, it } from "vitest";
import { countryId, groupCode } from "../domain/ids";
import { appData } from "./appData";

const expectedGroupCountryIds = {
  A: ["mex", "rsa", "kor", "cze"],
  B: ["can", "bos", "qat", "sui"],
  C: ["bra", "mar", "hti", "sco"],
  D: ["usa", "par", "aus", "tur"],
  E: ["ger", "cuw", "civ", "ecu"],
  F: ["ned", "jpn", "swe", "tun"],
  G: ["bel", "egy", "irn", "nzl"],
  H: ["esp", "cpv", "ksa", "uru"],
  I: ["fra", "sen", "irq", "nor"],
  J: ["arg", "alg", "aut", "jor"],
  K: ["por", "cod", "uzb", "col"],
  L: ["eng", "cro", "gha", "pan"],
} as const;

const expectedHostCountryIds = ["can", "mex", "usa"] as const;

const allowedFlagEmojiExceptions = new Set(["eng", "sco"]);

function getSlotCountryIdsForGroup(group: keyof typeof expectedGroupCountryIds) {
  return appData.slotEntries
    .filter((slotEntry) => slotEntry.groupCode === groupCode(group))
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map((slotEntry) => slotEntry.countryId);
}

describe("team and group data guardrails", () => {
  it("keeps exactly 48 assigned countries", () => {
    expect(appData.countries).toHaveLength(48);
    expect(appData.slotEntries.filter((slotEntry) => slotEntry.countryId)).toHaveLength(48);
  });

  it("keeps every group slot assigned to a concrete country", () => {
    const unassignedSlotEntries = appData.slotEntries.filter((slotEntry) => !slotEntry.countryId);

    expect(unassignedSlotEntries).toEqual([]);
  });

  it("keeps group draw positions stable", () => {
    for (const [group, expectedCountryIds] of Object.entries(expectedGroupCountryIds)) {
      expect(getSlotCountryIdsForGroup(group as keyof typeof expectedGroupCountryIds)).toEqual(
        expectedCountryIds.map((expectedCountryId) => countryId(expectedCountryId)),
      );
    }
  });

  it("keeps every country assigned to exactly one slot", () => {
    const slotCountryIds = appData.slotEntries.map((slotEntry) => slotEntry.countryId);

    expect(new Set(slotCountryIds).size).toBe(48);

    for (const country of appData.countries) {
      expect(slotCountryIds.filter((countryIdValue) => countryIdValue === country.id)).toHaveLength(
        1,
      );
    }
  });

  it("keeps FIFA codes present, uppercase, and unique", () => {
    const fifaCodes = appData.countries.map((country) => country.fifaCode);

    expect(new Set(fifaCodes).size).toBe(48);

    for (const fifaCode of fifaCodes) {
      expect(fifaCode).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("keeps all team display labels production-ready", () => {
    for (const country of appData.countries) {
      expect(country.name.trim()).not.toBe("");
      expect(country.shortName.trim()).not.toBe("");
      expect(country.name.toLowerCase()).not.toContain("placeholder");
      expect(country.shortName.toLowerCase()).not.toContain("placeholder");
      expect(country.name.toLowerCase()).not.toContain("tbd");
      expect(country.shortName.toLowerCase()).not.toContain("tbd");

      if (!allowedFlagEmojiExceptions.has(country.id)) {
        expect(country.flagEmoji).not.toBe("🏳️");
        expect(country.flagEmoji.trim()).not.toBe("");
      }
    }
  });

  it("keeps host countries present in the group-stage team set", () => {
    const countryIds = new Set(appData.countries.map((country) => country.id));

    for (const expectedHostCountryId of expectedHostCountryIds) {
      expect(countryIds.has(countryId(expectedHostCountryId))).toBe(true);
    }
  });

  it("keeps Group F Japan path anchored to the expected draw slot", () => {
    const japanSlotEntry = appData.slotEntries.find(
      (slotEntry) => slotEntry.countryId === countryId("jpn"),
    );

    expect(japanSlotEntry).toMatchObject({
      groupCode: groupCode("F"),
      slotIndex: 2,
    });
  });

  it("keeps source notes on all team and slot records", () => {
    expect(
      appData.countries.every((country) => country.sourceNote === "fifa-world-cup-26-groups"),
    ).toBe(true);
    expect(
      appData.slotEntries.every((slotEntry) => slotEntry.sourceNote === "fifa-world-cup-26-groups"),
    ).toBe(true);
  });
});
