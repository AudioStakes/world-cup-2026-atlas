import { useState } from "preact/hooks";
import type {
  ExplorerAction,
  GroupsAndTeamsViewModel,
  GroupTeamCardViewModel,
  GroupTeamRowViewModel,
  TournamentMatchViewModel,
  TournamentRoundViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";

type GroupsAndTeamsTableProps = {
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

type GroupPanelTab = "group" | "tournament";

export function GroupsAndTeamsTable({ groupsAndTeams, onAction }: GroupsAndTeamsTableProps) {
  const [activeTab, setActiveTab] = useState<GroupPanelTab>("group");

  return (
    <section class="panel-section groups-section" aria-label="Group and Tournament">
      <div class="group-panel-tabs" role="tablist" aria-label="Group and Tournament">
        <GroupPanelTabButton
          tab="group"
          label="Group"
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <GroupPanelTabButton
          tab="tournament"
          label="Tournament"
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      {activeTab === "group" ? (
        <div
          id="group-panel-group"
          class="group-team-grid"
          role="tabpanel"
          aria-labelledby="group-panel-tab-group"
        >
          {groupsAndTeams.groups.map((group) => (
            <GroupTeamCard key={group.groupCode} group={group} onAction={onAction} />
          ))}
        </div>
      ) : (
        <TournamentPanel tournamentRounds={groupsAndTeams.tournamentRounds} />
      )}
    </section>
  );
}

type GroupPanelTabButtonProps = {
  readonly tab: GroupPanelTab;
  readonly label: string;
  readonly activeTab: GroupPanelTab;
  readonly onTabChange: (tab: GroupPanelTab) => void;
};

function GroupPanelTabButton({ tab, label, activeTab, onTabChange }: GroupPanelTabButtonProps) {
  const isSelected = activeTab === tab;

  return (
    <button
      id={`group-panel-tab-${tab}`}
      class="group-panel-tab"
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={`group-panel-${tab}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onTabChange(tab)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const nextTab = tab === "group" ? "tournament" : "group";
          onTabChange(nextTab);
          requestAnimationFrame(() =>
            document.getElementById(`group-panel-tab-${nextTab}`)?.focus(),
          );
        }
      }}
    >
      {label}
    </button>
  );
}

type GroupTeamCardProps = {
  readonly group: GroupTeamCardViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

function GroupTeamCard({ group, onAction }: GroupTeamCardProps) {
  return (
    <article
      class={classNames(
        "group-team-card",
        group.isSelected && "is-selected",
        group.isRelatedToSelectedCountry && "is-related",
        group.availability === "outsideCurrentFilter" && "is-outside-current-filter",
      )}
    >
      <button
        class="group-team-header-button"
        type="button"
        aria-pressed={group.isSelected}
        aria-label={`Select ${group.groupName}`}
        onClick={() => onAction({ type: "selectGroup", groupCode: group.groupCode })}
      >
        {group.groupCode}
      </button>
      <div class="group-team-rows">
        {group.teams.map((team) => (
          <GroupTeamRow key={team.slotId} team={team} onAction={onAction} />
        ))}
      </div>
    </article>
  );
}

type GroupTeamRowProps = {
  readonly team: GroupTeamRowViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

function GroupTeamRow({ team, onAction }: GroupTeamRowProps) {
  const countryId = team.countryId;

  if (!countryId) {
    return (
      <div class="group-team-row-button is-placeholder">
        <span class="group-team-flag" aria-hidden="true">
          {team.flagEmoji}
        </span>
        <span class="group-team-copy">
          <span class="group-team-name">{team.countryCode}</span>
        </span>
      </div>
    );
  }

  return (
    <button
      class={classNames(
        "group-team-row-button",
        team.isSelected && "is-selected",
        team.availability === "outsideCurrentFilter" && "is-outside-current-filter",
      )}
      type="button"
      title={team.countryName}
      aria-pressed={team.isSelected}
      aria-label={`Select ${team.countryName}`}
      onClick={(event) => {
        event.stopPropagation();
        onAction({ type: "selectCountry", countryId });
      }}
    >
      <span class="group-team-flag" aria-hidden="true">
        {team.flagEmoji}
      </span>
      <span class="group-team-copy">
        <span class="group-team-name">{team.countryCode}</span>
      </span>
    </button>
  );
}

type TournamentPanelProps = {
  readonly tournamentRounds: readonly TournamentRoundViewModel[];
};

function TournamentPanel({ tournamentRounds }: TournamentPanelProps) {
  return (
    <div
      id="group-panel-tournament"
      class="tournament-rounds"
      role="tabpanel"
      aria-labelledby="group-panel-tab-tournament"
    >
      {tournamentRounds.map((round) => (
        <TournamentRound key={round.stageLabel} round={round} />
      ))}
    </div>
  );
}

type TournamentRoundProps = {
  readonly round: TournamentRoundViewModel;
};

function TournamentRound({ round }: TournamentRoundProps) {
  const headingId = createTournamentRoundHeadingId(round.stageLabel);

  return (
    <section class="tournament-round" aria-labelledby={headingId}>
      <div class="tournament-round__header">
        <h3 id={headingId}>{round.stageLabel}</h3>
        <span>{round.matchCountLabel}</span>
      </div>
      <ol class="tournament-match-list">
        {round.matches.map((match) => (
          <TournamentMatch key={match.matchId} match={match} />
        ))}
      </ol>
    </section>
  );
}

type TournamentMatchProps = {
  readonly match: TournamentMatchViewModel;
};

function TournamentMatch({ match }: TournamentMatchProps) {
  return (
    <li class="tournament-match">
      <span class="tournament-match__number">{match.matchNumberLabel}</span>
      <span class="tournament-match__date">{match.dateLabel}</span>
      <span class="tournament-match__matchup">{match.matchupLabel}</span>
      <span class="tournament-match__venue">{match.venueLabel}</span>
    </li>
  );
}

function createTournamentRoundHeadingId(stageLabel: string): string {
  return `tournament-round-${stageLabel.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
}
