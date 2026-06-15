import { useEffect, useRef, useState } from "preact/hooks";
import type {
  ExplorerAction,
  GroupsAndTeamsViewModel,
  GroupTeamCardViewModel,
  GroupTeamRowViewModel,
  TournamentMatchViewModel,
  TournamentRoundViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";
import { trapFocusWithin } from "./focusTrap";
import s from "./GroupsAndTeamsTable.module.css";

type GroupsAndTeamsTableProps = {
  readonly groupsAndTeams: GroupsAndTeamsViewModel;
  readonly matchCount: number;
  readonly onAction: (action: ExplorerAction) => void;
};

type GroupPanelTab = "group" | "tournament";

export function GroupsAndTeamsTable({
  groupsAndTeams,
  matchCount,
  onAction,
}: GroupsAndTeamsTableProps) {
  const [activeTab, setActiveTab] = useState<GroupPanelTab>("group");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileSheetLayout, setIsMobileSheetLayout] = useState(() => isMobileSheetViewport());
  const openerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReturnFocusRef = useRef(false);
  const summary = createGroupFilterSummary(groupsAndTeams, matchCount);
  const sheetDialogProps = isExpanded ? ({ "aria-modal": "true", role: "dialog" } as const) : {};
  const closedMobileSheetStyle =
    isMobileSheetLayout && !isExpanded
      ? ({
          opacity: 0,
          pointerEvents: "none",
          transform: "translateY(calc(100% + 24px))",
          visibility: "hidden",
        } as const)
      : undefined;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(width <= 720px)");
    const handleMediaQueryChange = () => setIsMobileSheetLayout(mediaQuery.matches);

    handleMediaQueryChange();
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => mediaQuery.removeEventListener("change", handleMediaQueryChange);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

      return () => window.cancelAnimationFrame(frame);
    }

    if (shouldReturnFocusRef.current) {
      shouldReturnFocusRef.current = false;
      openerRef.current?.focus();
    }
  }, [isExpanded]);

  const closeExpandedPanel = () => {
    shouldReturnFocusRef.current = true;
    setIsExpanded(false);
  };

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeExpandedPanel();
        return;
      }

      const sheet = sheetRef.current;

      if (sheet) {
        trapFocusWithin(event, sheet);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded]);

  const handleAction = (action: ExplorerAction) => {
    onAction(action);

    if (action.type === "selectCountry" || action.type === "selectGroup") {
      closeExpandedPanel();
    }
  };

  return (
    <section
      class={classNames("panel-section", s.root, isExpanded && s.isExpanded)}
      aria-label="Group and Tournament"
      data-testid="groups-section"
    >
      <button
        ref={openerRef}
        class={s.mobileSummaryButton}
        type="button"
        aria-controls="group-filter-sheet"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(true)}
      >
        <span class={s.mobileSummaryEyebrow}>Filters</span>
        <span class={s.mobileSummaryTitle}>{summary.title}</span>
        <span class={s.mobileSummaryMeta}>{summary.meta}</span>
      </button>
      {isExpanded ? (
        <button
          class={s.mobileSheetBackdrop}
          type="button"
          aria-label="Close filters"
          onClick={closeExpandedPanel}
        />
      ) : null}
      <section
        ref={sheetRef}
        id="group-filter-sheet"
        class={s.groupPanelContent}
        aria-labelledby="group-filter-sheet-title"
        data-expanded={isExpanded}
        style={closedMobileSheetStyle}
        {...sheetDialogProps}
      >
        <div class={s.mobileSheetHeader}>
          <div class={s.mobileSheetHeading}>
            <span class={s.mobileSummaryEyebrow}>Filters</span>
            <h2 id="group-filter-sheet-title">Teams and groups</h2>
            <p>{summary.detail}</p>
          </div>
          <button
            ref={closeButtonRef}
            class={s.mobileSheetCloseButton}
            type="button"
            onClick={closeExpandedPanel}
          >
            Close
          </button>
        </div>
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
              <GroupTeamCard key={group.groupCode} group={group} onAction={handleAction} />
            ))}
          </div>
        ) : (
          <TournamentPanel tournamentRounds={groupsAndTeams.tournamentRounds} />
        )}
      </section>
    </section>
  );
}

function isMobileSheetViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(width <= 720px)").matches
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
        <span>{group.groupCode}</span>
        {group.isSelected ? (
          <span class={s.selectionCue} aria-hidden="true">
            ✓
          </span>
        ) : null}
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
        <span class={s.groupTeamFullName}>{team.countryName}</span>
        {team.isSelected ? (
          <span class={s.selectionCue} aria-hidden="true">
            ✓
          </span>
        ) : null}
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

type GroupFilterSummary = {
  readonly detail: string;
  readonly meta: string;
  readonly title: string;
};

function createGroupFilterSummary(
  groupsAndTeams: GroupsAndTeamsViewModel,
  matchCount: number,
): GroupFilterSummary {
  const selectedTeam = groupsAndTeams.groups
    .flatMap((group) => group.teams)
    .find((team) => team.isSelected);
  const selectedGroup = groupsAndTeams.groups.find((group) => group.isSelected);
  const matchCountLabel = `${matchCount} ${matchCount === 1 ? "match" : "matches"}`;

  if (selectedTeam) {
    return {
      title: `${selectedTeam.flagEmoji} ${selectedTeam.countryCode}`,
      meta: selectedTeam.countryName,
      detail: `${selectedTeam.countryName} · ${matchCountLabel}`,
    };
  }

  if (selectedGroup) {
    return {
      title: `Group ${selectedGroup.groupCode}`,
      meta: selectedGroup.teams.map((team) => team.countryCode).join(" · "),
      detail: `${selectedGroup.groupName} · ${matchCountLabel}`,
    };
  }

  return {
    title: "All groups",
    meta: "Choose teams or tournament rounds",
    detail: `${matchCountLabel} in the current selection`,
  };
}
