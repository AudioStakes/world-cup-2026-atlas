import type { ExplorerAction, ExplorerViewModel } from "../../features/explorer/types";
import { DateSelector } from "./DateSelector";
import { GroupsAndTeamsTable } from "./GroupsAndTeamsTable";
import { Header } from "./Header";
import { MapView } from "./MapView";
import { ResultCard } from "./ResultCard";

type ExplorerPageProps = {
  readonly viewModel: ExplorerViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function ExplorerPage({ viewModel, onAction }: ExplorerPageProps) {
  return (
    <main class="atlas-shell" aria-label="World Cup 2026 Atlas explorer">
      <Header header={viewModel.header} />
      <section class="atlas-body" aria-label="Explorer workspace">
        <aside class="explore-panel" aria-label="Explore panel">
          <div class="explore-panel__intro">
            <p class="eyebrow">Explore</p>
          </div>
          <GroupsAndTeamsTable
            groupsAndTeams={viewModel.explorePanel.groupsAndTeams}
            onAction={onAction}
          />
          <DateSelector dateSelector={viewModel.explorePanel.dateSelector} onAction={onAction} />
          <ResultCard result={viewModel.explorePanel.result} />
        </aside>
        <MapView map={viewModel.map} onAction={onAction} />
      </section>
    </main>
  );
}
