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
import s from "./GroupsAndTeamsTable.module.css";

type GroupsAndTeamsTableProps = {
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

type GroupPanelTab = "group" | "tournament";

export function GroupsAndTeamsTable({ groupsAndTeams, onAction }: GroupsAndTeamsTableProps) {
  const [activeTab, setActiveTab] = useState<GroupPanelTab>("group");

  return (
    <section
      class={classNames("panel-section", s.root)}
      aria-label="Group and Tournament"
      data-testid="groups-section"
    >
      <div class={s.groupPanelTabs} role="tablist" aria-label="Group and Tournament">
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
          class={s.groupTeamGrid}
          role="tabpanel"
          aria-labelledby="group-panel-tab-group"
          data-testid="group-team-grid"
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
      class={s.groupPanelTab}
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
        s.groupTeamCard,
        group.isSelected && s.isSelected,
        group.isRelatedToSelectedCountry && s.isRelated,
        group.availability === "outsideCurrentFilter" && s.isOutsideCurrentFilter,
      )}
      data-testid="group-team-card"
    >
      <button
        class={s.groupTeamHeaderButton}
        type="button"
        aria-pressed={group.isSelected}
        aria-label={`Select ${group.groupName}`}
        onClick={() => onAction({ type: "selectGroup", groupCode: group.groupCode })}
      >
        {group.groupCode}
      </button>
      <div class={s.groupTeamRows}>
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
      <div
        class={classNames(s.groupTeamRowButton, s.isPlaceholder)}
        data-testid="group-team-row-button"
      >
        <span class={s.groupTeamFlag} aria-hidden="true" data-testid="group-team-flag">
          {team.flagEmoji}
        </span>
        <span class={s.groupTeamCopy} data-testid="group-team-copy">
          <span class={s.groupTeamName} data-testid="group-team-name">
            {team.countryCode}
          </span>
        </span>
      </div>
    );
  }

  return (
    <button
      class={classNames(
        s.groupTeamRowButton,
        team.isSelected && s.isSelected,
        team.availability === "outsideCurrentFilter" && s.isOutsideCurrentFilter,
      )}
      type="button"
      title={team.countryName}
      aria-pressed={team.isSelected}
      aria-label={`Select ${team.countryName}`}
      data-testid="group-team-row-button"
      onClick={(event) => {
        event.stopPropagation();
        onAction({ type: "selectCountry", countryId });
      }}
    >
      <span class={s.groupTeamFlag} aria-hidden="true" data-testid="group-team-flag">
        {team.flagEmoji}
      </span>
      <span class={s.groupTeamCopy} data-testid="group-team-copy">
        <span class={s.groupTeamName} data-testid="group-team-name">
          {team.countryCode}
        </span>
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
      class={s.tournamentRounds}
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
    <section class={s.tournamentRound} aria-labelledby={headingId}>
      <div class={s.tournamentRoundHeader}>
        <h3 id={headingId}>{round.stageLabel}</h3>
        <span>{round.matchCountLabel}</span>
      </div>
      <ol class={s.tournamentMatchList}>
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
    <li class={s.tournamentMatch}>
      <span class={s.tournamentMatchNumber}>{match.matchNumberLabel}</span>
      <span class={s.tournamentMatchDate}>{match.dateLabel}</span>
      <span class={s.tournamentMatchMatchup}>{match.matchupLabel}</span>
      <span class={s.tournamentMatchVenue}>{match.venueLabel}</span>
    </li>
  );
}

function createTournamentRoundHeadingId(stageLabel: string): string {
  return `tournament-round-${stageLabel.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
}
