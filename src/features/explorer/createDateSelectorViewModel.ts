import type { LocalDateString } from "../../domain/ids";
import { localDate } from "../../domain/ids";
import type { AppData } from "../../domain/types";
import { queryMatchesByViewState } from "../../queries/queryMatchesByViewState";
import { formatDateLabel } from "./formatExplorerLabels";
import type {
  DateMonthViewModel,
  DateOptionViewModel,
  DateSelectorViewModel,
  FilterOptionAvailability,
  NormalizedExplorerViewState,
} from "./types";

const FIRST_TOURNAMENT_DATE = "2026-06-11";
const LAST_TOURNAMENT_DATE = "2026-07-19";

export function createDateSelectorViewModel(
  data: AppData,
  viewState: NormalizedExplorerViewState,
): DateSelectorViewModel {
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
    const option: DateOptionViewModel = {
      date,
      label: formatDateLabel(date),
      isSelected,
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

function createTournamentDates(): readonly LocalDateString[] {
  const dates: LocalDateString[] = [];
  const cursor = new Date(`${FIRST_TOURNAMENT_DATE}T00:00:00Z`);
  const end = new Date(`${LAST_TOURNAMENT_DATE}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(localDate(cursor.toISOString().slice(0, 10)));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
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
