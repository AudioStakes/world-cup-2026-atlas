import type { Match, Venue } from "../domain/types";

export const DAILY_REQUEST_SOFT_LIMIT = 90;
export const DAILY_REQUEST_HARD_LIMIT = 98;
export const PROVIDER_POLL_INTERVAL_MS = 20 * 60 * 1000;
export const MATCH_POLLING_WINDOW_MS = 4 * 60 * 60 * 1000;

export type PollingDecision = {
  readonly shouldPoll: boolean;
  readonly activeDates: readonly string[];
  readonly reason:
    | "active"
    | "outside-window"
    | "interval-not-elapsed"
    | "soft-limit-reached"
    | "hard-limit-reached";
};

export function createPollingDecision(input: {
  readonly matches: readonly Match[];
  readonly venues: readonly Venue[];
  readonly now: Date;
  readonly lastFetchedAt: Date | null;
  readonly requestCountToday: number;
}): PollingDecision {
  const activeDates = createActivePollingDates(input.matches, input.venues, input.now);

  if (activeDates.length === 0) {
    return { shouldPoll: false, activeDates, reason: "outside-window" };
  }

  if (
    input.lastFetchedAt &&
    input.now.getTime() - input.lastFetchedAt.getTime() < PROVIDER_POLL_INTERVAL_MS
  ) {
    return { shouldPoll: false, activeDates, reason: "interval-not-elapsed" };
  }

  if (input.requestCountToday >= DAILY_REQUEST_HARD_LIMIT) {
    return { shouldPoll: false, activeDates, reason: "hard-limit-reached" };
  }

  if (input.requestCountToday + activeDates.length > DAILY_REQUEST_HARD_LIMIT) {
    return { shouldPoll: false, activeDates, reason: "hard-limit-reached" };
  }

  if (input.requestCountToday >= DAILY_REQUEST_SOFT_LIMIT) {
    return { shouldPoll: false, activeDates, reason: "soft-limit-reached" };
  }

  return { shouldPoll: true, activeDates, reason: "active" };
}

export function createActivePollingDates(
  matches: readonly Match[],
  venues: readonly Venue[],
  now: Date,
): readonly string[] {
  const activeDateSet = new Set<string>();
  const nowMs = now.getTime();
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

  for (const match of matches) {
    const venue = venuesById.get(match.venueId);

    if (!venue) {
      continue;
    }

    const kickoffAt = createUtcInstantForZonedLocalTime(
      match.date,
      match.kickoffLocal,
      venue.timeZone.ianaName,
    );
    const kickoffAtMs = kickoffAt.getTime();

    if (kickoffAtMs <= nowMs && nowMs <= kickoffAtMs + MATCH_POLLING_WINDOW_MS) {
      activeDateSet.add(kickoffAt.toISOString().slice(0, 10));
    }
  }

  return Array.from(activeDateSet).sort();
}

function createUtcInstantForZonedLocalTime(
  date: string,
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

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get("year"));
  const month = Number(values.get("month"));
  const day = Number(values.get("day"));
  const hour = Number(values.get("hour")) % 24;
  const minute = Number(values.get("minute"));
  const zonedAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  return zonedAsUtc - instant.getTime();
}
