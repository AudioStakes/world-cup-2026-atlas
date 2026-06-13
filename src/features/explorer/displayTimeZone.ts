import { type CountryId, countryId, type LocalDateString, localDate } from "../../domain/ids";
import type { Country, Match, Venue } from "../../domain/types";
import type { HeaderTimeZoneOptionViewModel } from "./types";

export const venueLocalDisplayTimeZoneId = "venue-local";
export const browserLocalDisplayTimeZoneId = "browser-local";

export type DisplayTimeZoneId =
  | typeof venueLocalDisplayTimeZoneId
  | typeof browserLocalDisplayTimeZoneId
  | CountryId;

export type DisplayTimeZonePreference =
  | {
      readonly type: "venueLocal";
      readonly id: typeof venueLocalDisplayTimeZoneId;
      readonly label: string;
      readonly summaryLabel: string;
    }
  | {
      readonly type: "country";
      readonly id: CountryId;
      readonly countryName: string;
      readonly ianaName: string;
      readonly abbreviation: string;
      readonly label: string;
      readonly summaryLabel: string;
    }
  | {
      readonly type: "browserLocal";
      readonly id: typeof browserLocalDisplayTimeZoneId;
      readonly ianaName: string;
      readonly abbreviation: string;
      readonly label: string;
      readonly summaryLabel: string;
    };

export type MatchDisplayDateTime = {
  readonly instantMs: number;
  readonly date: LocalDateString;
  readonly timeLabel: string;
  readonly timeZoneLabel: string;
};

type CountryDisplayTimeZone = {
  readonly ianaName: string;
  readonly abbreviation: string;
};

const countryDisplayTimeZonesById = new Map<CountryId, CountryDisplayTimeZone>([
  [countryId("mex"), { ianaName: "America/Mexico_City", abbreviation: "CST" }],
  [countryId("rsa"), { ianaName: "Africa/Johannesburg", abbreviation: "SAST" }],
  [countryId("kor"), { ianaName: "Asia/Seoul", abbreviation: "KST" }],
  [countryId("cze"), { ianaName: "Europe/Prague", abbreviation: "CEST" }],
  [countryId("can"), { ianaName: "America/Toronto", abbreviation: "ET" }],
  [countryId("bos"), { ianaName: "Europe/Sarajevo", abbreviation: "CEST" }],
  [countryId("qat"), { ianaName: "Asia/Qatar", abbreviation: "AST" }],
  [countryId("sui"), { ianaName: "Europe/Zurich", abbreviation: "CEST" }],
  [countryId("bra"), { ianaName: "America/Sao_Paulo", abbreviation: "BRT" }],
  [countryId("mar"), { ianaName: "Africa/Casablanca", abbreviation: "UTC+1" }],
  [countryId("hti"), { ianaName: "America/Port-au-Prince", abbreviation: "ET" }],
  [countryId("sco"), { ianaName: "Europe/London", abbreviation: "BST" }],
  [countryId("usa"), { ianaName: "America/New_York", abbreviation: "ET" }],
  [countryId("par"), { ianaName: "America/Asuncion", abbreviation: "PYT" }],
  [countryId("aus"), { ianaName: "Australia/Sydney", abbreviation: "AEST" }],
  [countryId("tur"), { ianaName: "Europe/Istanbul", abbreviation: "TRT" }],
  [countryId("ger"), { ianaName: "Europe/Berlin", abbreviation: "CEST" }],
  [countryId("cuw"), { ianaName: "America/Curacao", abbreviation: "AST" }],
  [countryId("civ"), { ianaName: "Africa/Abidjan", abbreviation: "GMT" }],
  [countryId("ecu"), { ianaName: "America/Guayaquil", abbreviation: "ECT" }],
  [countryId("ned"), { ianaName: "Europe/Amsterdam", abbreviation: "CEST" }],
  [countryId("jpn"), { ianaName: "Asia/Tokyo", abbreviation: "JST" }],
  [countryId("swe"), { ianaName: "Europe/Stockholm", abbreviation: "CEST" }],
  [countryId("tun"), { ianaName: "Africa/Tunis", abbreviation: "CET" }],
  [countryId("bel"), { ianaName: "Europe/Brussels", abbreviation: "CEST" }],
  [countryId("egy"), { ianaName: "Africa/Cairo", abbreviation: "EEST" }],
  [countryId("irn"), { ianaName: "Asia/Tehran", abbreviation: "IRST" }],
  [countryId("nzl"), { ianaName: "Pacific/Auckland", abbreviation: "NZST" }],
  [countryId("esp"), { ianaName: "Europe/Madrid", abbreviation: "CEST" }],
  [countryId("cpv"), { ianaName: "Atlantic/Cape_Verde", abbreviation: "CVT" }],
  [countryId("ksa"), { ianaName: "Asia/Riyadh", abbreviation: "AST" }],
  [countryId("uru"), { ianaName: "America/Montevideo", abbreviation: "UYT" }],
  [countryId("fra"), { ianaName: "Europe/Paris", abbreviation: "CEST" }],
  [countryId("sen"), { ianaName: "Africa/Dakar", abbreviation: "GMT" }],
  [countryId("irq"), { ianaName: "Asia/Baghdad", abbreviation: "AST" }],
  [countryId("nor"), { ianaName: "Europe/Oslo", abbreviation: "CEST" }],
  [countryId("arg"), { ianaName: "America/Argentina/Buenos_Aires", abbreviation: "ART" }],
  [countryId("alg"), { ianaName: "Africa/Algiers", abbreviation: "CET" }],
  [countryId("aut"), { ianaName: "Europe/Vienna", abbreviation: "CEST" }],
  [countryId("jor"), { ianaName: "Asia/Amman", abbreviation: "UTC+3" }],
  [countryId("por"), { ianaName: "Europe/Lisbon", abbreviation: "WEST" }],
  [countryId("cod"), { ianaName: "Africa/Kinshasa", abbreviation: "WAT" }],
  [countryId("uzb"), { ianaName: "Asia/Tashkent", abbreviation: "UZT" }],
  [countryId("col"), { ianaName: "America/Bogota", abbreviation: "COT" }],
  [countryId("eng"), { ianaName: "Europe/London", abbreviation: "BST" }],
  [countryId("cro"), { ianaName: "Europe/Zagreb", abbreviation: "CEST" }],
  [countryId("gha"), { ianaName: "Africa/Accra", abbreviation: "GMT" }],
  [countryId("pan"), { ianaName: "America/Panama", abbreviation: "EST" }],
]);

export function createHeaderTimeZoneOptions(
  countries: readonly Country[],
  browserLocalTimeZone: string | null = null,
): readonly HeaderTimeZoneOptionViewModel[] {
  return [
    ...(browserLocalTimeZone
      ? [
          {
            value: browserLocalDisplayTimeZoneId,
            label: "Your local time",
            detailLabel: createBrowserLocalDetailLabel(browserLocalTimeZone),
          },
        ]
      : []),
    {
      value: venueLocalDisplayTimeZoneId,
      label: "Venue local",
      detailLabel: "Use each stadium's local time",
    },
    ...countries.flatMap((country) => {
      const timeZone = countryDisplayTimeZonesById.get(country.id);

      if (!timeZone) {
        return [];
      }

      return [
        {
          value: country.id,
          label: `${country.flagEmoji} ${country.name}`,
          detailLabel: timeZone.abbreviation,
        },
      ];
    }),
  ];
}

export function resolveDisplayTimeZonePreference(
  countries: readonly Country[],
  displayTimeZoneId: DisplayTimeZoneId,
  browserLocalTimeZone: string | null = null,
): DisplayTimeZonePreference {
  if (displayTimeZoneId === browserLocalDisplayTimeZoneId && browserLocalTimeZone) {
    const abbreviation = createTimeZoneAbbreviation(browserLocalTimeZone, referenceInstant);

    return {
      type: "browserLocal",
      id: browserLocalDisplayTimeZoneId,
      ianaName: browserLocalTimeZone,
      abbreviation,
      label: "Your local time",
      summaryLabel: `Your local time · ${abbreviation}`,
    };
  }

  if (displayTimeZoneId !== venueLocalDisplayTimeZoneId) {
    const country = countries.find((candidate) => candidate.id === displayTimeZoneId);
    const timeZone = country ? countryDisplayTimeZonesById.get(country.id) : null;

    if (country && timeZone) {
      return {
        type: "country",
        id: country.id,
        countryName: country.name,
        ianaName: timeZone.ianaName,
        abbreviation: timeZone.abbreviation,
        label: `${country.name} time`,
        summaryLabel: `${country.name} · ${timeZone.abbreviation}`,
      };
    }
  }

  return {
    type: "venueLocal",
    id: venueLocalDisplayTimeZoneId,
    label: "Venue local time",
    summaryLabel: "Venue local",
  };
}

export function createMatchDisplayDateTime(
  match: Match,
  venue: Venue,
  displayTimeZone: DisplayTimeZonePreference,
): MatchDisplayDateTime {
  const instant = createUtcInstantForZonedLocalTime(
    match.date,
    match.kickoffLocal,
    venue.timeZone.ianaName,
  );

  if (displayTimeZone.type === "venueLocal") {
    return {
      instantMs: instant.getTime(),
      date: match.date,
      timeLabel: match.kickoffLocal,
      timeZoneLabel: venue.timeZone.abbreviation,
    };
  }

  return {
    instantMs: instant.getTime(),
    date: formatDateInTimeZone(instant, displayTimeZone.ianaName),
    timeLabel: formatTimeInTimeZone(instant, displayTimeZone.ianaName),
    timeZoneLabel:
      displayTimeZone.type === "browserLocal"
        ? createTimeZoneAbbreviation(displayTimeZone.ianaName, instant)
        : displayTimeZone.abbreviation,
  };
}

const referenceInstant = new Date("2026-06-13T12:00:00Z");

export function getBrowserLocalTimeZone(): string | null {
  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (typeof timeZone !== "string" || timeZone.length === 0) {
    return null;
  }

  return isSupportedTimeZone(timeZone) ? timeZone : null;
}

function isSupportedTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function createBrowserLocalDetailLabel(timeZone: string): string {
  return `${createTimeZoneAbbreviation(timeZone, referenceInstant)} · ${timeZone}`;
}

function createTimeZoneAbbreviation(timeZone: string, instant: Date): string {
  const countryDisplayTimeZone = Array.from(countryDisplayTimeZonesById.values()).find(
    (displayTimeZone) => displayTimeZone.ianaName === timeZone,
  );

  if (countryDisplayTimeZone) {
    return countryDisplayTimeZone.abbreviation;
  }

  return formatShortTimeZoneName(instant, timeZone);
}

function formatShortTimeZoneName(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(instant);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

function createUtcInstantForZonedLocalTime(
  date: LocalDateString,
  time: string,
  sourceTimeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new Error(`Invalid local date/time: ${date} ${time}`);
  }

  const localTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instantMs = localTimeAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    instantMs = localTimeAsUtc - getTimeZoneOffsetMs(new Date(instantMs), sourceTimeZone);
  }

  return new Date(instantMs);
}

function formatDateInTimeZone(instant: Date, timeZone: string): LocalDateString {
  const parts = getDateTimeParts(instant, timeZone);

  return localDate(`${parts.year}-${parts.month}-${parts.day}`);
}

function formatTimeInTimeZone(instant: Date, timeZone: string): string {
  const parts = getDateTimeParts(instant, timeZone);

  return `${parts.hour}:${parts.minute}`;
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getDateTimeParts(instant, timeZone);
  const zonedTimeAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return zonedTimeAsUtc - instant.getTime();
}

function getDateTimeParts(
  instant: Date,
  timeZone: string,
): {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
    minute?: string;
    second?: string;
  } = {};

  for (const part of parts) {
    switch (part.type) {
      case "year":
      case "month":
      case "day":
      case "hour":
      case "minute":
      case "second":
        values[part.type] = part.value;
        break;
    }
  }

  return {
    year: values.year ?? "1970",
    month: values.month ?? "01",
    day: values.day ?? "01",
    hour: values.hour ?? "00",
    minute: values.minute ?? "00",
    second: values.second ?? "00",
  };
}
