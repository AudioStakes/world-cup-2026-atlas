import { describe, expect, it } from "vitest";
import { localDate, localTime, venueId } from "../domain/ids";
import { appData } from "./appData";

const expectedMatchCountsByDate = {
  "2026-06-11": 2,
  "2026-06-12": 2,
  "2026-06-13": 4,
  "2026-06-14": 4,
  "2026-06-15": 4,
  "2026-06-16": 4,
  "2026-06-17": 4,
  "2026-06-18": 4,
  "2026-06-19": 4,
  "2026-06-20": 4,
  "2026-06-21": 4,
  "2026-06-22": 4,
  "2026-06-23": 4,
  "2026-06-24": 6,
  "2026-06-25": 6,
  "2026-06-26": 6,
  "2026-06-27": 6,
  "2026-06-28": 1,
  "2026-06-29": 3,
  "2026-06-30": 3,
  "2026-07-01": 3,
  "2026-07-02": 3,
  "2026-07-03": 3,
  "2026-07-04": 2,
  "2026-07-05": 2,
  "2026-07-06": 2,
  "2026-07-07": 2,
  "2026-07-09": 1,
  "2026-07-10": 1,
  "2026-07-11": 2,
  "2026-07-14": 1,
  "2026-07-15": 1,
  "2026-07-18": 1,
  "2026-07-19": 1,
} as const;

const expectedScheduleByMatchNumber = {
  1: ["2026-06-11", "13:00", "mexico-city"],
  2: ["2026-06-11", "20:00", "guadalajara"],
  3: ["2026-06-12", "15:00", "toronto"],
  4: ["2026-06-12", "18:00", "los-angeles"],
  5: ["2026-06-13", "12:00", "san-francisco-bay-area"],
  6: ["2026-06-13", "18:00", "boston"],
  7: ["2026-06-13", "21:00", "new-york-new-jersey"],
  8: ["2026-06-13", "21:00", "vancouver"],
  9: ["2026-06-14", "12:00", "houston"],
  10: ["2026-06-14", "19:00", "philadelphia"],
  11: ["2026-06-14", "15:00", "dallas"],
  12: ["2026-06-14", "20:00", "monterrey"],
  13: ["2026-06-15", "12:00", "seattle"],
  14: ["2026-06-15", "18:00", "los-angeles"],
  15: ["2026-06-15", "12:00", "atlanta"],
  16: ["2026-06-15", "18:00", "miami"],
  17: ["2026-06-16", "15:00", "new-york-new-jersey"],
  18: ["2026-06-16", "18:00", "boston"],
  19: ["2026-06-16", "20:00", "kansas-city"],
  20: ["2026-06-16", "21:00", "san-francisco-bay-area"],
  21: ["2026-06-17", "12:00", "houston"],
  22: ["2026-06-17", "20:00", "mexico-city"],
  23: ["2026-06-17", "15:00", "dallas"],
  24: ["2026-06-17", "19:00", "toronto"],
  25: ["2026-06-18", "12:00", "atlanta"],
  26: ["2026-06-18", "12:00", "los-angeles"],
  27: ["2026-06-18", "15:00", "vancouver"],
  28: ["2026-06-18", "19:00", "guadalajara"],
  29: ["2026-06-19", "18:00", "philadelphia"],
  30: ["2026-06-19", "21:00", "boston"],
  31: ["2026-06-19", "12:00", "seattle"],
  32: ["2026-06-19", "21:00", "san-francisco-bay-area"],
  33: ["2026-06-20", "16:00", "toronto"],
  34: ["2026-06-20", "19:00", "kansas-city"],
  35: ["2026-06-20", "12:00", "houston"],
  36: ["2026-06-20", "22:00", "monterrey"],
  37: ["2026-06-21", "12:00", "los-angeles"],
  38: ["2026-06-21", "18:00", "vancouver"],
  39: ["2026-06-21", "12:00", "atlanta"],
  40: ["2026-06-21", "18:00", "miami"],
  41: ["2026-06-22", "17:00", "philadelphia"],
  42: ["2026-06-22", "20:00", "new-york-new-jersey"],
  43: ["2026-06-22", "12:00", "dallas"],
  44: ["2026-06-22", "20:00", "san-francisco-bay-area"],
  45: ["2026-06-23", "12:00", "houston"],
  46: ["2026-06-23", "20:00", "guadalajara"],
  47: ["2026-06-23", "16:00", "boston"],
  48: ["2026-06-23", "19:00", "toronto"],
  49: ["2026-06-24", "18:00", "miami"],
  50: ["2026-06-24", "18:00", "atlanta"],
  51: ["2026-06-24", "12:00", "vancouver"],
  52: ["2026-06-24", "12:00", "seattle"],
  53: ["2026-06-24", "19:00", "mexico-city"],
  54: ["2026-06-24", "19:00", "monterrey"],
  55: ["2026-06-25", "16:00", "philadelphia"],
  56: ["2026-06-25", "16:00", "new-york-new-jersey"],
  57: ["2026-06-25", "18:00", "dallas"],
  58: ["2026-06-25", "18:00", "kansas-city"],
  59: ["2026-06-25", "19:00", "los-angeles"],
  60: ["2026-06-25", "19:00", "san-francisco-bay-area"],
  61: ["2026-06-26", "15:00", "boston"],
  62: ["2026-06-26", "15:00", "toronto"],
  63: ["2026-06-26", "20:00", "seattle"],
  64: ["2026-06-26", "20:00", "vancouver"],
  65: ["2026-06-26", "19:00", "houston"],
  66: ["2026-06-26", "18:00", "guadalajara"],
  67: ["2026-06-27", "17:00", "new-york-new-jersey"],
  68: ["2026-06-27", "17:00", "philadelphia"],
  69: ["2026-06-27", "21:00", "kansas-city"],
  70: ["2026-06-27", "21:00", "dallas"],
  71: ["2026-06-27", "19:30", "miami"],
  72: ["2026-06-27", "19:30", "atlanta"],
  73: ["2026-06-28", "12:00", "los-angeles"],
  74: ["2026-06-29", "16:30", "boston"],
  75: ["2026-06-29", "19:00", "monterrey"],
  76: ["2026-06-29", "12:00", "houston"],
  77: ["2026-06-30", "17:00", "new-york-new-jersey"],
  78: ["2026-06-30", "12:00", "dallas"],
  79: ["2026-06-30", "19:00", "mexico-city"],
  80: ["2026-07-01", "12:00", "atlanta"],
  81: ["2026-07-01", "17:00", "san-francisco-bay-area"],
  82: ["2026-07-01", "13:00", "seattle"],
  83: ["2026-07-02", "19:00", "toronto"],
  84: ["2026-07-02", "12:00", "los-angeles"],
  85: ["2026-07-02", "20:00", "vancouver"],
  86: ["2026-07-03", "18:00", "miami"],
  87: ["2026-07-03", "20:30", "kansas-city"],
  88: ["2026-07-03", "13:00", "dallas"],
  89: ["2026-07-04", "17:00", "philadelphia"],
  90: ["2026-07-04", "12:00", "houston"],
  91: ["2026-07-05", "16:00", "new-york-new-jersey"],
  92: ["2026-07-05", "18:00", "mexico-city"],
  93: ["2026-07-06", "14:00", "dallas"],
  94: ["2026-07-06", "17:00", "seattle"],
  95: ["2026-07-07", "12:00", "atlanta"],
  96: ["2026-07-07", "13:00", "vancouver"],
  97: ["2026-07-09", "16:00", "boston"],
  98: ["2026-07-10", "12:00", "los-angeles"],
  99: ["2026-07-11", "17:00", "miami"],
  100: ["2026-07-11", "20:00", "kansas-city"],
  101: ["2026-07-14", "14:00", "dallas"],
  102: ["2026-07-15", "15:00", "atlanta"],
  103: ["2026-07-18", "17:00", "miami"],
  104: ["2026-07-19", "15:00", "new-york-new-jersey"],
} as const;

function getMatchesByDate(date: string) {
  return appData.matches.filter((match) => match.date === localDate(date));
}

describe("date and kickoff fixture coverage", () => {
  it("keeps the tournament date range stable", () => {
    const dates = appData.matches.map((match) => match.date).sort();

    expect(dates[0]).toBe("2026-06-11");
    expect(dates.at(-1)).toBe("2026-07-19");
  });

  it("keeps all active match dates and daily match counts stable", () => {
    const actualCountsByDate = new Map<string, number>();

    for (const match of appData.matches) {
      const currentCount = actualCountsByDate.get(match.date) ?? 0;
      actualCountsByDate.set(match.date, currentCount + 1);
    }

    expect(Object.fromEntries(actualCountsByDate.entries())).toEqual(expectedMatchCountsByDate);
  });

  it("keeps every match date, local kickoff time, and venue stable", () => {
    for (const [
      matchNumberText,
      [expectedDate, expectedKickoffLocal, expectedVenueId],
    ] of Object.entries(expectedScheduleByMatchNumber)) {
      const matchNumber = Number(matchNumberText);
      const match = appData.matches.find((candidate) => candidate.matchNumber === matchNumber);

      expect(match, `Match ${matchNumber} should exist`).toBeDefined();
      expect(match?.date, `Match ${matchNumber} date`).toBe(localDate(expectedDate));
      expect(match?.kickoffLocal, `Match ${matchNumber} kickoff`).toBe(
        localTime(expectedKickoffLocal),
      );
      expect(match?.venueId, `Match ${matchNumber} venue`).toBe(venueId(expectedVenueId));
    }
  });

  it("keeps all local kickoff times formatted as HH:mm", () => {
    for (const match of appData.matches) {
      expect(match.kickoffLocal, `Match ${match.matchNumber} kickoff`).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("keeps active dates represented by at least one venue", () => {
    for (const date of Object.keys(expectedMatchCountsByDate)) {
      const venueIdsForDate = new Set(getMatchesByDate(date).map((match) => match.venueId));

      expect(venueIdsForDate.size, `${date} should have at least one active venue`).toBeGreaterThan(
        0,
      );
    }
  });

  it("keeps group-stage closing dates at six matches each", () => {
    for (const date of ["2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"]) {
      const matches = getMatchesByDate(date);

      expect(matches).toHaveLength(6);
      expect(matches.every((match) => match.stage === "group")).toBe(true);
    }
  });

  it("keeps knockout opening and final dates stable", () => {
    expect(getMatchesByDate("2026-06-28").map((match) => match.matchNumber)).toEqual([73]);
    expect(getMatchesByDate("2026-07-19").map((match) => match.matchNumber)).toEqual([104]);
  });

  it("keeps semi-final dates, kickoff times, and venues stable", () => {
    const firstSemiFinal = getMatchesByDate("2026-07-14")[0];
    const secondSemiFinal = getMatchesByDate("2026-07-15")[0];

    expect(firstSemiFinal?.matchNumber).toBe(101);
    expect(firstSemiFinal?.kickoffLocal).toBe(localTime("14:00"));
    expect(firstSemiFinal?.venueId).toBe(venueId("dallas"));

    expect(secondSemiFinal?.matchNumber).toBe(102);
    expect(secondSemiFinal?.kickoffLocal).toBe(localTime("15:00"));
    expect(secondSemiFinal?.venueId).toBe(venueId("atlanta"));
  });

  it("keeps third-place and final weekend dates, kickoff times, and venues stable", () => {
    const thirdPlaceMatch = getMatchesByDate("2026-07-18")[0];
    const final = getMatchesByDate("2026-07-19")[0];

    expect(thirdPlaceMatch?.matchNumber).toBe(103);
    expect(thirdPlaceMatch?.kickoffLocal).toBe(localTime("17:00"));
    expect(thirdPlaceMatch?.venueId).toBe(venueId("miami"));

    expect(final?.matchNumber).toBe(104);
    expect(final?.kickoffLocal).toBe(localTime("15:00"));
    expect(final?.venueId).toBe(venueId("new-york-new-jersey"));
  });

  it("keeps date ordering aligned with match numbers for every active date", () => {
    for (const date of Object.keys(expectedMatchCountsByDate)) {
      const matchNumbers = getMatchesByDate(date).map((match) => match.matchNumber);
      const sortedMatchNumbers = matchNumbers.slice().sort((left, right) => left - right);

      expect(matchNumbers, `${date} match numbers should be sorted`).toEqual(sortedMatchNumbers);
    }
  });
});
