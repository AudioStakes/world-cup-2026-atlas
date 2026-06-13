import type { VenueId } from "../../domain/ids";
import type { ExplorerAction, ExplorerViewModel } from "../../features/explorer/types";
import { DateSelector } from "./DateSelector";
import { GroupsAndTeamsTable } from "./GroupsAndTeamsTable";
import { Header } from "./Header";
import { MapView } from "./MapView";
import { ResultCard } from "./ResultCard";

type ExplorerPageProps = {
  readonly viewModel: ExplorerViewModel;
  readonly onAction: (action: ExplorerAction) => void;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
  readonly onTimeZoneChange: (displayTimeZoneId: string) => void;
};

export function ExplorerPage({
  viewModel,
  onAction,
  onMatchVenueFocusChange,
  onTimeZoneChange,
}: ExplorerPageProps) {
  return (
    <main class="atlas-shell" aria-label="World Cup 2026 Atlas explorer">
      <Header header={viewModel.header} onTimeZoneChange={onTimeZoneChange} />
      <section class="atlas-body">
        <section class="explore-panel">
          <DateSelector dateSelector={viewModel.explorePanel.dateSelector} onAction={onAction} />
        </section>
        <GroupsAndTeamsTable
          groupsAndTeams={viewModel.explorePanel.groupsAndTeams}
          onAction={onAction}
        />
        <section class="explorer-output" aria-label="Selection results">
          <ResultCard
            result={viewModel.explorePanel.result}
            onAction={onAction}
            onMatchVenueFocusChange={onMatchVenueFocusChange}
          />
          <MapView map={viewModel.map} onAction={onAction} />
        </section>
      </section>
    </main>
  );
}
