import type { DisplayTimeZoneId } from "../../features/explorer/displayTimeZone";
import type {
  ExplorerHeaderViewModel,
  HeaderTimeZoneOptionViewModel,
} from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
  readonly onTimeZoneChange: (displayTimeZoneId: DisplayTimeZoneId) => void;
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
              const displayTimeZoneId = getDisplayTimeZoneIdForSelectValue(
                event.currentTarget.value,
                header.timeZoneSelector.options,
              );

              if (displayTimeZoneId) {
                onTimeZoneChange(displayTimeZoneId);
              }
            }}
          >
            {header.timeZoneSelector.options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label} · {option.detailLabel}
              </option>
            ))}
          </select>
        </label>
        <p class="atlas-header__data-status" aria-live="polite">
          {header.statusItems.map((item) => (
            <span key={item.key}>{item.label}</span>
          ))}
        </p>
      </div>
    </header>
  );
}

function getDisplayTimeZoneIdForSelectValue(
  value: string,
  options: readonly HeaderTimeZoneOptionViewModel[],
): DisplayTimeZoneId | null {
  return options.find((option) => option.value === value)?.value ?? null;
}
