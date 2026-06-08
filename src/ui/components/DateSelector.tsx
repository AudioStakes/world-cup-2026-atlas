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

export function DateSelector({ dateSelector, onAction }: DateSelectorProps) {
  return (
    <section class="panel-section date-section" aria-labelledby="date-selector-title">
      <div class="section-heading">
        <h2 id="date-selector-title">{dateSelector.title}</h2>
      </div>
      <div class="date-months">
        {dateSelector.months.map((month) => (
          <section
            class="date-month"
            key={month.monthLabel}
            aria-label={`${month.monthLabel} dates`}
          >
            <p class="date-month__label">{month.monthLabel}</p>
            <div class="date-chip-grid">
              {month.dates.map((dateOption) => (
                <DateChip key={dateOption.date} dateOption={dateOption} onAction={onAction} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

type DateChipProps = {
  readonly dateOption: DateOptionViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

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
      <span class="date-chip__date">{dateOption.label}</span>
      {dateOption.matchCountLabel ? (
        <span class="date-chip__meta">{dateOption.matchCountLabel}</span>
      ) : null}
      {dateOption.kickoffRangeLabel ? (
        <span class="date-chip__time">
          {dateOption.kickoffRangeLabel}
          {dateOption.timeZoneSummaryLabel ? ` · ${dateOption.timeZoneSummaryLabel}` : ""}
        </span>
      ) : null}
    </button>
  );
}

function createDateChipAriaLabel(dateOption: DateOptionViewModel): string {
  const kickoffSummary =
    dateOption.kickoffRangeLabel && dateOption.timeZoneSummaryLabel
      ? `${dateOption.kickoffRangeLabel} ${dateOption.timeZoneSummaryLabel}`
      : dateOption.kickoffRangeLabel;
  const details = [dateOption.matchCountLabel, kickoffSummary].filter(Boolean);

  return details.length > 0
    ? `Select ${dateOption.label}, ${details.join(", ")}`
    : `Select ${dateOption.label}`;
}
