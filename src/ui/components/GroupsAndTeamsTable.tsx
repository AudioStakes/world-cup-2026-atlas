import type {
  ExplorerAction,
  GroupsAndTeamsViewModel,
  GroupTeamCardViewModel,
  GroupTeamRowViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";

type GroupsAndTeamsTableProps = {
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function GroupsAndTeamsTable({ groupsAndTeams, onAction }: GroupsAndTeamsTableProps) {
  return (
    <section class="panel-section groups-section" aria-labelledby="groups-and-teams-title">
      <div class="section-heading">
        <h2 id="groups-and-teams-title">{groupsAndTeams.title}</h2>
      </div>
      <div class="group-team-grid">
        {groupsAndTeams.groups.map((group) => (
          <GroupTeamCard key={group.groupCode} group={group} onAction={onAction} />
        ))}
      </div>
    </section>
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
        {group.groupName}
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
          <span class="group-team-name">{team.countryName}</span>
          <span class="group-team-code">{team.countryMetaLabel}</span>
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
      title={`${team.countryName} (${team.countryMetaLabel})`}
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
        <span class="group-team-name">{team.countryName}</span>
        <span class="group-team-code">{team.countryMetaLabel}</span>
      </span>
    </button>
  );
}
