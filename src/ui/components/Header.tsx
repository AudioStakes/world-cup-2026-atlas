import type { ExplorerHeaderViewModel } from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
  readonly onTimeZoneChange: (displayTimeZoneId: string) => void;
};

export function Header({ header, onTimeZoneChange }: HeaderProps) {
  return (
    <header class="atlas-header">
      <div>
        <h1 class="atlas-header__title">{header.title}</h1>
        <p class="atlas-header__subtitle">{header.subtitle}</p>
      </div>
      <div class="atlas-header__controls">
        <label class="time-zone-control" for="match-time-zone">
          <span class="time-zone-control__label">{header.timeZoneSelector.label}</span>
          <select
            id="match-time-zone"
            name="match-time-zone"
            value={header.timeZoneSelector.selectedValue}
            onChange={(event) => {
              onTimeZoneChange(event.currentTarget.value);
            }}
          >
            {header.timeZoneSelector.options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label} · {option.detailLabel}
              </option>
            ))}
          </select>
        </label>
        <p class="atlas-header__data-status">
          <span>{header.timeZoneSelector.selectedSummary}</span>
          <span>Official/trusted sources · direct distances derived</span>
        </p>
      </div>
    </header>
  );
}
