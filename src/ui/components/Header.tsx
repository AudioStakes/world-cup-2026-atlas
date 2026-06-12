import type { ExplorerHeaderViewModel } from "../../features/explorer/types";

type HeaderProps = {
  readonly header: ExplorerHeaderViewModel;
};

export function Header({ header }: HeaderProps) {
  return (
    <header class="atlas-header">
      <div>
        <h1 class="atlas-header__title">{header.title}</h1>
        <p class="atlas-header__subtitle">{header.subtitle}</p>
      </div>
    </header>
  );
}
