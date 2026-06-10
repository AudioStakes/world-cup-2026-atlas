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

export function DateSelector({ dateSelector, onAction }: DateSelectorProps) {
  return (
    <section class="panel-section date-section" aria-labelledby="date-selector-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Dates</p>
          <h2 id="date-selector-title">{dateSelector.title}</h2>
        </div>
      </div>

      <div class="date-months">
        {dateSelector.months.map((month) => (
          <div class="date-month" key={month.monthLabel}>
            <p class="date-month__label">{month.monthLabel}</p>
            <div class="date-chip-grid">
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
      <span class="date-chip__date">{dateOption.label}</span>
      <span class="date-chip__meta">{dateOption.matchCountLabel ?? "No matches"}</span>
    </button>
  );
}

function createDateChipAriaLabel(dateOption: DateOptionViewModel): string {
  const parts = [`Select ${dateOption.label}`];

  if (dateOption.matchCountLabel) {
    parts.push(dateOption.matchCountLabel);
  }

  if (dateOption.kickoffRangeLabel) {
    const kickoffSummary = dateOption.timeZoneSummaryLabel
      ? `${dateOption.kickoffRangeLabel} ${dateOption.timeZoneSummaryLabel}`
      : dateOption.kickoffRangeLabel;
    parts.push(kickoffSummary);
  }

  return parts.join(" · ");
}
