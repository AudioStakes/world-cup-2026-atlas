import type { ExplorerHeaderViewModel } from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
  readonly onClearAll: () => void;
};

export function Header({ header, onClearAll }: HeaderProps) {
  return (
    <header class="atlas-header">
      <div>
        <p class="atlas-header__title">{header.title}</p>
        <p class="atlas-header__subtitle">{header.subtitle}</p>
      </div>
      <div class="atlas-header__state">
        <code>{header.urlStateLabel}</code>
        <button class="clear-button" type="button" onClick={onClearAll} disabled={!header.canClear}>
          Clear all
        </button>
      </div>
    </header>
  );
}
