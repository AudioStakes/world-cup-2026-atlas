import type {
  DateOptionViewModel,
  DateSelectorViewModel,
  ExplorerAction,
} from "../../features/explorer/types";
import { classNames } from "./classNames";

type DateSelectorProps = {
  readonly dateSelector: DateSelectorViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

type DateChipProps = {
  readonly dateOption: DateOptionViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function DateSelector({ dateSelector, onAction }: DateSelectorProps) {
  const hasOutsideCurrentFilterDates = dateSelector.months.some((month) =>
    month.dates.some((dateOption) => dateOption.availability === "outsideCurrentFilter"),
  );

  return (
    <section class="panel-section date-section" aria-labelledby="date-selector-title">
      <h2 id="date-selector-title" class="visually-hidden">
        {dateSelector.title}
      </h2>
      {hasOutsideCurrentFilterDates ? (
        <p class="filter-hint">Dimmed dates do not include the current selection.</p>
      ) : null}

      <div class="date-months">
        {dateSelector.months.map((month) => (
          <div class="date-month" key={month.monthLabel}>
            <p class="date-month__label">{month.monthLabel}</p>
            <div class="date-calendar">
              {weekdayLabels.map((weekday) => (
                <span class="date-calendar__weekday" key={weekday}>
                  {weekday}
                </span>
              ))}
              {createLeadingBlankDays(month.dates).map((blankDay) => (
                <span class="date-calendar__blank" key={blankDay} aria-hidden="true" />
              ))}
              {month.dates.map((dateOption) => (
                <DateChip key={dateOption.date} dateOption={dateOption} onAction={onAction} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DateChip({ dateOption, onAction }: DateChipProps) {
  return (
    <button
      class={classNames(
        "date-chip",
        dateOption.isSelected && "is-selected",
        !dateOption.hasFixture && "has-no-fixture",
        dateOption.availability === "outsideCurrentFilter" && "is-outside-current-filter",
      )}
      type="button"
      aria-pressed={dateOption.isSelected}
      aria-label={createDateChipAriaLabel(dateOption)}
      onClick={() => onAction({ type: "selectDate", date: dateOption.date })}
    >
      <span class="date-chip__date">{formatDayOfMonth(dateOption.date)}</span>
      <span class="date-chip__meta" aria-hidden="true">
        {createVisibleDateMeta(dateOption)}
      </span>
    </button>
  );
}

function createLeadingBlankDays(dates: readonly DateOptionViewModel[]): readonly string[] {
  const firstDate = dates[0]?.date;

  if (!firstDate) {
    return [];
  }

  return Array.from(
    { length: getWeekdayIndex(firstDate) },
    (_, index) => `blank-${firstDate}-${index}`,
  );
}

function formatWeekday(date: string): string {
  return weekdayLabels[getWeekdayIndex(date)] ?? weekdayLabels[0];
}

function formatDayOfMonth(date: string): string {
  return String(new Date(`${date}T00:00:00Z`).getUTCDate());
}

function getWeekdayIndex(date: string): number {
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return parsedDate.getUTCDay();
}

function createDateChipAriaLabel(dateOption: DateOptionViewModel): string {
  const parts = [`Select ${formatWeekday(dateOption.date)} ${dateOption.label}`];

  if (dateOption.matchCountLabel) {
    parts.push(dateOption.matchCountLabel);
  }

  if (dateOption.kickoffRangeLabel) {
    const kickoffSummary = dateOption.timeZoneSummaryLabel
      ? `${dateOption.kickoffRangeLabel} ${dateOption.timeZoneSummaryLabel}`
      : dateOption.kickoffRangeLabel;
    parts.push(kickoffSummary);
  }

  if (!dateOption.hasFixture) {
    parts.push("Rest day");
  }

  if (dateOption.availability === "outsideCurrentFilter") {
    parts.push("outside current filter");
  }

  return parts.join(" · ");
}

function createVisibleDateMeta(dateOption: DateOptionViewModel): string {
  if (!dateOption.hasFixture) {
    return "Rest";
  }

  const matchCount = dateOption.matchCountLabel?.match(/^\d+/)?.[0];
  return matchCount ?? "Match";
}
