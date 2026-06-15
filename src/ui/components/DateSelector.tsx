import type {
  DateOptionViewModel,
  DateSelectorViewModel,
  ExplorerAction,
} from "../../features/explorer/types";
import { classNames } from "./classNames";
import s from "./DateSelector.module.css";

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
  return (
    <section
      class={classNames("panel-section", s.root)}
      aria-labelledby="date-selector-title"
      data-testid="date-section"
    >
      <h2 id="date-selector-title" class="visually-hidden">
        {dateSelector.title}
      </h2>

      <div class={s.dateMonths}>
        {dateSelector.months.map((month) => (
          <div class={s.dateMonth} key={month.monthLabel}>
            <p class={s.dateMonthLabel}>{month.monthLabel}</p>
            <div class={s.dateCalendar}>
              {weekdayLabels.map((weekday) => (
                <span class={s.dateCalendarWeekday} key={weekday}>
                  {weekday}
                </span>
              ))}
              {createLeadingBlankDays(month.dates).map((blankDay) => (
                <span class={s.dateCalendarBlank} key={blankDay} aria-hidden="true" />
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
  const visibleStatus = createVisibleDateStatus(dateOption);

  return (
    <button
      class={classNames(
        s.dateChip,
        dateOption.isSelected && s.isSelected,
        dateOption.isToday && s.isToday,
        !dateOption.hasFixture && s.hasNoFixture,
        dateOption.availability === "outsideCurrentFilter" && s.isOutsideCurrentFilter,
      )}
      type="button"
      aria-current={dateOption.isSelected ? "date" : undefined}
      aria-pressed={dateOption.isSelected}
      aria-label={createDateChipAriaLabel(dateOption)}
      onClick={() => onAction({ type: "selectDate", date: dateOption.date })}
    >
      <span class={s.dateChipDate}>{formatDayOfMonth(dateOption.date)}</span>
      <span class={s.dateChipMeta} aria-hidden="true">
        {createVisibleDateMeta(dateOption)}
      </span>
      {visibleStatus ? (
        <span class={s.dateChipStatus} aria-hidden="true">
          {visibleStatus}
        </span>
      ) : null}
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

  if (dateOption.isSelected) {
    parts.push("selected");
  }

  if (dateOption.matchCountLabel) {
    parts.push(dateOption.matchCountLabel);
  }

  if (dateOption.isToday) {
    parts.push("today");
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

function createVisibleDateStatus(dateOption: DateOptionViewModel): string | null {
  if (dateOption.isSelected) {
    return "Selected";
  }

  if (dateOption.isToday) {
    return "Today";
  }

  return null;
}
