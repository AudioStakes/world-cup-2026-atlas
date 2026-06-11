import type { ExplorerHeaderViewModel } from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
};

export function Header({ header }: HeaderProps) {
  return (
    <header class="atlas-header">
      <div>
        <p class="atlas-header__title">{header.title}</p>
        <p class="atlas-header__subtitle">{header.subtitle}</p>
      </div>
    </header>
  );
}
