import { type LocalDateString, localDate } from "../../domain/ids";
import type { AppData, Match, Venue } from "../../domain/types";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import {
  createMatchDisplayDateTime,
  type DisplayTimeZonePreference,
  resolveDisplayTimeZonePreference,
  venueLocalDisplayTimeZoneId,
} from "./displayTimeZone";
import { formatDateLabel } from "./formatExplorerLabels";
import { createTournamentDates } from "./tournamentDates";
import type {
  DateMonthViewModel,
  DateOptionViewModel,
  DateSelectorViewModel,
  FilterOptionAvailability,
  NormalizedExplorerViewState,
} from "./types";

const timeZoneDisplayOrder = ["PT", "MT", "CT", "ET"] as const;

export function createDateSelectorViewModel(
  data: AppData,
  viewState: NormalizedExplorerViewState,
  today: LocalDateString = createTodayLocalDate(),
  displayTimeZoneId = venueLocalDisplayTimeZoneId,
): DateSelectorViewModel {
  const matchesByDate = createMatchesByDate(data.matches);
  const venuesById = new Map(data.venues.map((venue) => [venue.id, venue] as const));
  const displayTimeZone = resolveDisplayTimeZonePreference(data.countries, displayTimeZoneId);
  const fixtureDateSet = new Set(data.matches.map((match) => match.date));
  const hitDateSet = new Set(
    queryMatchesByViewState(data, { ...viewState, selectedDate: null }).map((match) => match.date),
  );
  const hasAnySelection = Boolean(
    viewState.selectedCountryId ||
      viewState.selectedGroupCode ||
      viewState.selectedDate ||
      viewState.selectedVenueId,
  );
  const monthMap = new Map<string, DateOptionViewModel[]>();

  for (const date of createTournamentDates()) {
    const monthLabel = getMonthLabel(date);
    const isSelected = viewState.selectedDate === date;
    const hasFixture = fixtureDateSet.has(date);
    const isHit = hitDateSet.has(date);
    const matchesForDate = matchesByDate.get(date) ?? [];
    const option: DateOptionViewModel = {
      date,
      label: formatDateLabel(date),
      matchCountLabel: createMatchCountLabel(matchesForDate),
      kickoffRangeLabel: createKickoffRangeLabel(matchesForDate, venuesById, displayTimeZone),
      timeZoneSummaryLabel: createTimeZoneSummaryLabel(matchesForDate, venuesById, displayTimeZone),
      isSelected,
      isToday: today === date,
      availability: getAvailability(hasAnySelection, isSelected || isHit),
      hasFixture,
    };
    const existingOptions = monthMap.get(monthLabel);

    if (existingOptions) {
      existingOptions.push(option);
    } else {
      monthMap.set(monthLabel, [option]);
    }
  }

  return {
    title: "Date",
    months: Array.from(monthMap.entries()).map<DateMonthViewModel>(([monthLabel, dates]) => ({
      monthLabel,
      dates,
    })),
  };
}

function createTodayLocalDate(now = new Date()): LocalDateString {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return localDate(`${year}-${month}-${day}`);
}

function createMatchesByDate(
  matches: readonly Match[],
): ReadonlyMap<LocalDateString, readonly Match[]> {
  const matchesByDate = new Map<LocalDateString, Match[]>();

  for (const match of matches) {
    const existingMatches = matchesByDate.get(match.date);

    if (existingMatches) {
      existingMatches.push(match);
    } else {
      matchesByDate.set(match.date, [match]);
    }
  }

  for (const matchesForDate of matchesByDate.values()) {
    matchesForDate.sort(
      (left, right) =>
        left.kickoffLocal.localeCompare(right.kickoffLocal) || left.matchNumber - right.matchNumber,
    );
  }

  return matchesByDate;
}

function createMatchCountLabel(matches: readonly Match[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  return matches.length === 1 ? "1 match" : `${matches.length} matches`;
}

function createKickoffRangeLabel(
  matches: readonly Match[],
  venuesById: ReadonlyMap<Venue["id"], Venue>,
  displayTimeZone: DisplayTimeZonePreference,
): string | null {
  if (matches.length === 0) {
    return null;
  }

  const kickoffTimes = matches
    .map((match) => {
      const venue = venuesById.get(match.venueId);

      if (!venue) {
        return null;
      }

      return createMatchDisplayDateTime(match, venue, displayTimeZone);
    })
    .filter((dateTime): dateTime is NonNullable<typeof dateTime> => Boolean(dateTime))
    .sort((left, right) => left.instantMs - right.instantMs)
    .map((dateTime) => dateTime.timeLabel);

  const firstKickoff = kickoffTimes[0];
  const lastKickoff = kickoffTimes.at(-1);

  if (!firstKickoff || !lastKickoff) {
    return null;
  }

  return firstKickoff === lastKickoff ? firstKickoff : `${firstKickoff}–${lastKickoff}`;
}

function createTimeZoneSummaryLabel(
  matches: readonly Match[],
  venuesById: ReadonlyMap<Venue["id"], Venue>,
  displayTimeZone: DisplayTimeZonePreference,
): string | null {
  if (matches.length === 0) {
    return null;
  }

  if (displayTimeZone.type === "country") {
    return displayTimeZone.abbreviation;
  }

  const timeZoneAbbreviations = new Set(
    matches
      .map((match) => venuesById.get(match.venueId)?.timeZone.abbreviation)
      .filter((abbreviation): abbreviation is Venue["timeZone"]["abbreviation"] =>
        Boolean(abbreviation),
      ),
  );

  if (timeZoneAbbreviations.size === 0) {
    return null;
  }

  return timeZoneDisplayOrder
    .filter((abbreviation) => timeZoneAbbreviations.has(abbreviation))
    .join("/");
}

function getMonthLabel(date: string): string {
  return date.slice(5, 7) === "06" ? "Jun" : "Jul";
}

function getAvailability(
  hasAnySelection: boolean,
  isAvailableUnderCurrentFilter: boolean,
): FilterOptionAvailability {
  return !hasAnySelection || isAvailableUnderCurrentFilter ? "available" : "outsideCurrentFilter";
}
