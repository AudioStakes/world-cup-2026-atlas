import type { VenueId } from "../../domain/ids";
import type { DisplayTimeZoneId } from "../../features/explorer/displayTimeZone";
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
  readonly onTimeZoneChange: (displayTimeZoneId: DisplayTimeZoneId) => void;
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
          matchCount={viewModel.explorePanel.result.matchCount}
          onAction={onAction}
        />
        <MobileSelectionSummary
          matchCount={viewModel.explorePanel.result.matchCount}
          map={viewModel.map}
          resultTitle={viewModel.explorePanel.result.title}
          resultType={viewModel.explorePanel.result.type}
          subtitle={viewModel.explorePanel.result.subtitle}
          onClear={() => onAction({ type: "clearAll" })}
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

type MobileSelectionSummaryProps = {
  readonly map: ExplorerViewModel["map"];
  readonly matchCount: number;
  readonly resultTitle: string;
  readonly resultType: ExplorerViewModel["explorePanel"]["result"]["type"];
  readonly subtitle: string;
  readonly onClear: () => void;
};

function MobileSelectionSummary({
  map,
  matchCount,
  onClear,
  resultTitle,
  resultType,
  subtitle,
}: MobileSelectionSummaryProps) {
  const selectedVenueCount = map.venueMarkers.filter((venue) => venue.state === "selected").length;
  const venuesInViewCount = map.venueMarkers.filter(
    (venue) => venue.state === "selected" || venue.state === "highlighted",
  ).length;
  const matchCountLabel = `${matchCount} ${matchCount === 1 ? "match" : "matches"}`;
  const venueCountLabel =
    selectedVenueCount > 0
      ? `${selectedVenueCount} selected ${selectedVenueCount === 1 ? "venue" : "venues"}`
      : venuesInViewCount > 0
        ? `${venuesInViewCount} ${venuesInViewCount === 1 ? "venue" : "venues"}`
        : "All venues";
  const summaryParts = [
    subtitle,
    subtitle.includes("match") ? null : matchCountLabel,
    `Map: ${venueCountLabel}`,
  ].filter(Boolean);

  return (
    <section class="mobile-selection-summary" aria-label="Current selection">
      <div class="mobile-selection-summary__copy">
        <span>Selection</span>
        <strong>{resultTitle}</strong>
        <small>{summaryParts.join(" · ")}</small>
      </div>
      {resultType !== "empty" ? (
        <button class="mobile-selection-summary__clear" type="button" onClick={onClear}>
          Clear
        </button>
      ) : null}
    </section>
  );
}
