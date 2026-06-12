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
};

export function ExplorerPage({ viewModel, onAction, onMatchVenueFocusChange }: ExplorerPageProps) {
  return (
    <main class="atlas-shell" aria-label="World Cup 2026 Atlas explorer">
      <Header header={viewModel.header} onAction={onAction} />
      <section class="atlas-body" aria-label="Explorer workspace">
        <section class="explore-panel" aria-label="Explore controls">
          <ExplorerSearch viewModel={viewModel} onAction={onAction} />
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

function ExplorerSearch({
  viewModel,
  onAction,
}: {
  readonly viewModel: ExplorerViewModel;
  readonly onAction: (action: ExplorerAction) => void;
}) {
  const searchOptions = [
    ...viewModel.explorePanel.groupsAndTeams.groups.flatMap((group) =>
      group.teams
        .filter((team) => team.countryId)
        .map((team) => ({
          action: { type: "selectCountry", countryId: team.countryId } as ExplorerAction,
          label: team.countryName,
          meta: `Team · ${group.groupName}`,
        })),
    ),
    ...viewModel.map.venueMarkers.map((venue) => ({
      action: { type: "selectVenue", venueId: venue.venueId } as ExplorerAction,
      label: venue.label,
      meta: `Venue · ${venue.cityLabel}`,
    })),
  ];
  const optionByValue = new Map(
    searchOptions.map((option) => [normalizeSearchValue(option.label), option]),
  );

  function selectSearchValue(value: string, form: HTMLFormElement | null) {
    const option = findSearchOption(value);

    if (!option) {
      return;
    }

    onAction(option.action);
    form?.reset();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    selectSearchValue(String(formData.get("atlas-search") ?? ""), form);
  }

  function handleSearchKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const input = event.currentTarget as HTMLInputElement;

    selectSearchValue(input.value, input.form);
  }

  function findSearchOption(value: string) {
    const normalizedValue = normalizeSearchValue(value);

    if (!normalizedValue) {
      return null;
    }

    return (
      optionByValue.get(normalizedValue) ??
      searchOptions.find((option) =>
        normalizeSearchValue(option.label).startsWith(normalizedValue),
      ) ??
      searchOptions.find((option) => normalizeSearchValue(option.label).includes(normalizedValue))
    );
  }

  return (
    <search aria-label="Find a team or city">
      <form class="explorer-search" onSubmit={handleSubmit}>
        <label class="visually-hidden" for="atlas-search">
          Search team or city
        </label>
        <input
          id="atlas-search"
          name="atlas-search"
          class="explorer-search__input"
          type="search"
          list="atlas-search-options"
          placeholder="Search team or city"
          autocomplete="off"
          onKeyDown={handleSearchKeyDown}
        />
        <datalist id="atlas-search-options">
          {searchOptions.map((option) => (
            <option key={`${option.meta}-${option.label}`} value={option.label}>
              {option.meta}
            </option>
          ))}
        </datalist>
        <button class="explorer-search__button" type="submit">
          Search
        </button>
      </form>
    </search>
  );
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}
