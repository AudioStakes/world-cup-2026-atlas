import { useLayoutEffect, useRef } from "preact/hooks";
import type { VenueId } from "../../domain/ids";
import type {
  DetailMetricViewModel,
  ExplorerAction,
  ExplorerDetailViewModel,
  ExplorerResultViewModel,
  GroupDetailViewModel,
  GroupStandingFormEntryViewModel,
  MatchListItemViewModel,
  MatchTeamViewModel,
  ResultGroupNavigationViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";
import s from "./ResultCard.module.css";

type ResultCardProps = {
  readonly result: ExplorerResultViewModel;
  readonly onAction: (action: ExplorerAction) => void;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
};

export function ResultCard({ result, onAction, onMatchVenueFocusChange }: ResultCardProps) {
  const isDateTimeline = result.type === "date";
  const isGroupDetail = result.details?.type === "group";
  const shouldShowHeader = !isDateTimeline && !isGroupDetail;
  const matchListRef = useRef<HTMLOListElement>(null);
  const initialScrollTargetMatchId =
    result.matches.find((match) => match.isInitialScrollTarget)?.matchId ?? null;

  useLayoutEffect(() => {
    if (!isDateTimeline) {
      return;
    }

    const matchList = matchListRef.current;
    const scrollTarget = matchList?.querySelector<HTMLElement>("[data-initial-scroll-target]");

    if (!matchList || !scrollTarget) {
      return;
    }

    matchList.scrollTop = scrollTarget.offsetTop - matchList.offsetTop;
  }, [isDateTimeline, initialScrollTargetMatchId]);

  return (
    <section
      id="selection-results"
      class={classNames(s.root, isDateTimeline && s.dateTimeline)}
      aria-labelledby="result-card-title"
      data-testid="result-card"
    >
      <p class="visually-hidden" aria-live="polite">
        {createResultStatusLabel(result)}
      </p>
      {shouldShowHeader ? (
        <header class={s.header} data-testid="result-card-header">
          <span class={s.icon} aria-hidden="true">
            {result.icon}
          </span>
          <div>
            <h2 id="result-card-title">{result.title}</h2>
            <ResultSubtitle
              groupNavigation={result.groupNavigation}
              subtitle={result.subtitle}
              onAction={onAction}
            />
          </div>
        </header>
      ) : (
        <h2 id="result-card-title" class="visually-hidden">
          {result.title}
        </h2>
      )}

      {!isDateTimeline && result.routeSummary ? (
        <div class={s.routeSummary}>
          <div class={s.routeSummaryHeadline}>
            <span>{result.routeSummary.itineraryLabel}</span>
            <strong>{result.routeSummary.totalDistanceLabel}</strong>
          </div>
          <p class={s.routeSummaryNote}>{result.routeSummary.distanceMethodLabel}</p>
          {result.routeSummary.venueCountExplanationLabel ? (
            <p class={s.routeSummaryNote}>{result.routeSummary.venueCountExplanationLabel}</p>
          ) : null}
          {result.routeSummary.legs.length > 0 ? (
            <ol class={s.routeLegList} aria-label="Route legs by fixture date">
              {result.routeSummary.legs.map((leg) => (
                <li key={`${leg.fromDateLabel}-${leg.toDateLabel}-${leg.fromVenueLabel}`}>
                  <span>{leg.fromDateLabel}</span>
                  <strong>
                    {leg.fromVenueLabel} → {leg.toVenueLabel}
                  </strong>
                  <span>
                    {leg.toDateLabel} · {leg.distanceLabel}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {!isDateTimeline ? <ResultDetails details={result.details} /> : null}

      {result.matches.length > 0 ? (
        <ol
          ref={matchListRef}
          class={classNames(s.matchList, isDateTimeline && s.matchListDateTimeline)}
          aria-label={isDateTimeline ? "Tournament fixtures by date" : undefined}
          data-testid="match-list"
        >
          {result.matches.map((match, index) => (
            <li
              class={s.matchListItem}
              data-initial-scroll-target={match.isInitialScrollTarget ? "true" : undefined}
              key={match.matchId}
            >
              {shouldShowMatchDateHeading(result.matches, index) ? (
                <div class={s.matchListDateRow}>
                  <h3>{match.dateHeadingLabel}</h3>
                </div>
              ) : null}
              <article
                class={s.matchCard}
                aria-label={`${match.matchupAriaLabel}, ${match.statusLabel}, ${match.secondaryText}`}
                data-testid="match-card"
              >
                <span class={s.matchCardScoreRow} data-testid="match-card-score-row">
                  <MatchTeam team={match.homeTeam} side="home" onAction={onAction} />
                  <MatchCenter match={match} />
                  <MatchTeam team={match.awayTeam} side="away" onAction={onAction} />
                </span>
                <MatchFixtureMeta
                  match={match}
                  onAction={onAction}
                  onMatchVenueFocusChange={onMatchVenueFocusChange}
                />
                <span class={s.matchCardA11y}>
                  <span class="visually-hidden">{match.matchupAriaLabel}</span>
                  <span class="visually-hidden">
                    {match.scoreLineLabel ?? `${match.statusLabel}, ${match.secondaryText}`}
                  </span>
                </span>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <div class={s.empty}>
          <p>{result.emptyMessage}</p>
          <button
            class={s.clearButton}
            type="button"
            onClick={() => onAction({ type: "clearAll" })}
          >
            Clear selection
          </button>
        </div>
      )}
    </section>
  );
}

function ResultSubtitle({
  groupNavigation,
  onAction,
  subtitle,
}: {
  readonly groupNavigation: ResultGroupNavigationViewModel | null;
  readonly onAction: (action: ExplorerAction) => void;
  readonly subtitle: string;
}) {
  if (!subtitle) {
    return null;
  }

  if (!groupNavigation) {
    return <p>{subtitle}</p>;
  }

  return (
    <p>
      <a
        class={s.groupLink}
        href={groupNavigation.href}
        onClick={(event) => {
          event.preventDefault();
          onAction({ type: "selectGroup", groupCode: groupNavigation.groupCode });
        }}
        aria-label={groupNavigation.ariaLabel}
      >
        {groupNavigation.label}
      </a>
      <span class={s.subtitleSeparator} aria-hidden="true">
        ·
      </span>
      <span>{groupNavigation.trailingLabel}</span>
    </p>
  );
}

function shouldShowMatchDateHeading(matches: readonly MatchListItemViewModel[], index: number) {
  const match = matches[index];
  const previousMatch = matches[index - 1];

  return Boolean(match && match.dateHeadingLabel !== previousMatch?.dateHeadingLabel);
}

function MatchTeam({
  onAction,
  side,
  team,
}: {
  readonly onAction: (action: ExplorerAction) => void;
  readonly side: "home" | "away";
  readonly team: MatchTeamViewModel;
}) {
  const flag = team.flagEmoji ? (
    <span class={s.matchCardFlag} aria-hidden="true" data-testid="match-card-flag">
      {team.flagEmoji}
    </span>
  ) : null;
  const countryId = team.countryId;
  const content =
    side === "home" ? (
      <>
        <span class={s.matchCardTeamName} data-testid="match-card-team-name">
          {team.displayName}
        </span>
        {flag}
      </>
    ) : (
      <>
        {flag}
        <span class={s.matchCardTeamName} data-testid="match-card-team-name">
          {team.displayName}
        </span>
      </>
    );

  return (
    <span class={classNames(s.matchCardTeam, matchTeamSideClassBySide[side])} data-team-side={side}>
      {countryId ? (
        <button
          class={classNames(s.matchCardAction, s.matchCardTeamButton)}
          type="button"
          aria-label={`Select country ${team.displayName}`}
          onClick={() => onAction({ type: "selectCountry", countryId })}
        >
          {content}
        </button>
      ) : (
        <span class={s.matchCardTeamCopy}>{content}</span>
      )}
    </span>
  );
}

const matchTeamSideClassBySide: Readonly<Record<"home" | "away", string>> = {
  away: s.matchCardTeamAway,
  home: s.matchCardTeamHome,
};

function MatchFixtureMeta({
  match,
  onAction,
  onMatchVenueFocusChange,
}: {
  readonly match: MatchListItemViewModel;
  readonly onAction: (action: ExplorerAction) => void;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
}) {
  const groupCode = match.groupCode;
  const groupLabel = match.groupLabel;

  return (
    <span class={s.matchCardMetaLine} data-testid="match-card-meta-line">
      {groupCode && groupLabel ? (
        <>
          <button
            class={classNames(s.matchCardAction, s.matchCardMetaButton, s.matchCardGroupButton)}
            type="button"
            aria-label={`Select group ${groupLabel}`}
            onClick={() => onAction({ type: "selectGroup", groupCode })}
          >
            {groupLabel}
          </button>
          <span class={s.matchCardMetaSeparator} aria-hidden="true">
            ·
          </span>
        </>
      ) : null}
      <span>{match.stageMetaLabel}</span>
      <span class={s.matchCardMetaSeparator} aria-hidden="true">
        ·
      </span>
      <button
        class={classNames(s.matchCardAction, s.matchCardMetaButton)}
        type="button"
        aria-label={`Select match venue ${match.venueLabel}`}
        onBlur={() => onMatchVenueFocusChange(null)}
        onClick={() => onAction({ type: "selectVenue", venueId: match.venueId })}
        onFocus={() => onMatchVenueFocusChange(match.venueId)}
        onMouseEnter={() => onMatchVenueFocusChange(match.venueId)}
        onMouseLeave={() => onMatchVenueFocusChange(null)}
      >
        {match.venueFixtureLabel}
      </button>
    </span>
  );
}

function MatchCenter({ match }: { readonly match: MatchListItemViewModel }) {
  if (match.homeScoreLabel && match.awayScoreLabel) {
    return (
      <span class={s.matchCardCenter}>
        <span
          class={classNames(
            s.matchCardScore,
            match.winningSide === "home" && s.isWinner,
            match.winningSide === "away" && s.isMuted,
          )}
          data-score-state={
            match.winningSide === "home"
              ? "winner"
              : match.winningSide === "away"
                ? "muted"
                : "neutral"
          }
          data-testid="match-card-score"
        >
          {match.homeScoreLabel}
        </span>
        <span class={s.matchCardStatus}>{match.shortStatusLabel ?? match.statusLabel}</span>
        <span
          class={classNames(
            s.matchCardScore,
            match.winningSide === "away" && s.isWinner,
            match.winningSide === "home" && s.isMuted,
          )}
          data-score-state={
            match.winningSide === "away"
              ? "winner"
              : match.winningSide === "home"
                ? "muted"
                : "neutral"
          }
          data-testid="match-card-score"
        >
          {match.awayScoreLabel}
        </span>
      </span>
    );
  }

  return (
    <span class={s.matchCardCenter}>
      {match.normalizedStatus === "scheduled" ? (
        <span class={s.matchCardKickoff} data-testid="match-card-kickoff">
          {match.kickoffLabel}
        </span>
      ) : (
        <span class={classNames(s.matchCardStatus, s.matchCardStatusScoreless)}>
          {match.shortStatusLabel ?? match.statusLabel}
        </span>
      )}
    </span>
  );
}

function createResultStatusLabel(result: ExplorerResultViewModel): string {
  if (result.type === "empty") {
    return result.title;
  }

  return `${result.title}, ${result.matchCount} ${result.matchCount === 1 ? "match" : "matches"}`;
}

function ResultDetails({ details }: { readonly details: ExplorerDetailViewModel | null }) {
  if (!details) {
    return null;
  }

  if (details.type === "group") {
    return <GroupStandings details={details} />;
  }

  return <MetricGrid metrics={details.metrics} />;
}

function MetricGrid({ metrics }: { readonly metrics: readonly DetailMetricViewModel[] }) {
  return (
    <dl class={s.detailMetrics} data-testid="detail-metrics">
      {metrics.map((metric) => (
        <div class={s.detailMetric} key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function GroupStandings({ details }: { readonly details: GroupDetailViewModel }) {
  return (
    // biome-ignore-start lint/a11y/noNoninteractiveTabindex: Wide standings tables need a keyboard-focusable scroll container.
    <section
      class={s.groupStandings}
      aria-label="Scrollable group table"
      tabIndex={0}
      onKeyDown={handleGroupStandingsKeyDown}
    >
      <table>
        <caption>{details.groupLabel} standings</caption>
        <thead>
          <tr>
            <th class={s.groupStandingsTeamHeading} scope="col">
              {details.groupLabel}
            </th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">D</th>
            <th scope="col">L</th>
            <th scope="col">GF</th>
            <th scope="col">GA</th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          {details.standings.map((row) => (
            <tr key={row.countryId ?? row.teamLabel}>
              <th scope="row">
                <span class={s.groupStandingsTeam}>
                  <span class={s.groupStandingsRank} aria-hidden="true">
                    {row.position}
                  </span>
                  {row.teamFlagEmoji ? (
                    <span class={s.groupStandingsFlag} aria-hidden="true">
                      {row.teamFlagEmoji}
                    </span>
                  ) : null}
                  <span class={s.groupStandingsCode} aria-hidden="true">
                    {row.teamCodeLabel}
                  </span>
                  <span class="visually-hidden">
                    {row.position}. {row.teamPlainLabel}
                  </span>
                </span>
              </th>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.goalDifferenceLabel}</td>
              <td>{row.points}</td>
              <td>
                <span class={s.groupStandingsForm}>
                  <span class="visually-hidden">{row.teamPlainLabel} form:</span>
                  {row.form.map((entry, index) => (
                    <GroupStandingFormEntry entry={entry} index={index} key={index} />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
    // biome-ignore-end lint/a11y/noNoninteractiveTabindex: Wide standings tables need a keyboard-focusable scroll container.
  );
}

function GroupStandingFormEntry({
  entry,
  index,
}: {
  readonly entry: GroupStandingFormEntryViewModel;
  readonly index: number;
}) {
  return (
    <span
      class={classNames(
        s.groupStandingsFormEntry,
        groupStandingFormEntryClassByResult[entry.result],
      )}
      data-form-result={entry.result}
      title={entry.label}
    >
      <span class="visually-hidden">
        {index + 1}: {entry.label}
      </span>
    </span>
  );
}

const groupStandingFormEntryClassByResult: Readonly<
  Record<GroupStandingFormEntryViewModel["result"], string>
> = {
  draw: s.isDraw,
  loss: s.isLoss,
  pending: s.isPending,
  win: s.isWin,
};

function handleGroupStandingsKeyDown(event: KeyboardEvent) {
  const scrollContainer = event.currentTarget as HTMLElement;
  const pageStep = Math.max(80, scrollContainer.clientWidth * 0.8);
  const keyScrollSteps: Readonly<Record<string, number>> = {
    ArrowLeft: -40,
    ArrowRight: 40,
    PageUp: -pageStep,
    PageDown: pageStep,
  };
  const scrollStep = keyScrollSteps[event.key];

  if (scrollStep !== undefined) {
    event.preventDefault();
    scrollContainer.scrollLeft += scrollStep;
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    scrollContainer.scrollLeft = 0;
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    scrollContainer.scrollLeft = scrollContainer.scrollWidth;
  }
}
