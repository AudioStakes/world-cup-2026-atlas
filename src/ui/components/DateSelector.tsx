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
      aria-label={`Select ${dateOption.label}`}
      onClick={() => onAction({ type: "selectDate", date: dateOption.date })}
    >
      {dateOption.label}
    </button>
  );
}
