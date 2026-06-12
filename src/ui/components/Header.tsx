import type { ExplorerAction, ExplorerHeaderViewModel } from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function Header({ header, onAction }: HeaderProps) {
  return (
    <header class="atlas-header">
      <div>
        <h1 class="atlas-header__title">{header.title}</h1>
        <p class="atlas-header__subtitle">{header.subtitle}</p>
      </div>
      {header.canClear ? (
        <div class="atlas-header__state">
          <code>{header.urlStateLabel}</code>
          <button class="clear-button" type="button" onClick={() => onAction({ type: "clearAll" })}>
            Clear
          </button>
        </div>
      ) : null}
    </header>
  );
}
