import { describe, expect, it } from "vitest";
import { appData } from "./appData";

const expectedGroupCountryCodes = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COD", "UZB", "COL"],
  L: ["ENG", "CRO", "GHA", "PAN"],
} as const;

function getCountryCodeById(countryId: string): string {
  const country = appData.countries.find((candidate) => candidate.id === countryId);

  if (!country) {
    throw new Error(`Unknown country id: ${countryId}`);
  }

  return country.fifaCode;
}

function getGroupCountryCodes(groupCode: string): string[] {
  return appData.slotEntries
    .filter((slotEntry) => slotEntry.groupCode === groupCode)
    .slice()
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map((slotEntry) => {
      if (!slotEntry.countryId) {
        throw new Error(`Unassigned country slot: ${slotEntry.slotId}`);
      }

      return getCountryCodeById(slotEntry.countryId);
    });
}

describe("group slot alignment", () => {
  it.each(
    Object.entries(expectedGroupCountryCodes),
  )("keeps Group %s aligned with the expected country order", (groupCode, expectedCountryCodes) => {
    expect(getGroupCountryCodes(groupCode)).toEqual(expectedCountryCodes);
  });

  it("keeps the group table fully assigned", () => {
    expect(appData.slotEntries.every((slotEntry) => Boolean(slotEntry.countryId))).toBe(true);
  });
});
