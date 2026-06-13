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
} from "../../features/explorer/types";
import { classNames } from "./classNames";

type ResultCardProps = {
  readonly result: ExplorerResultViewModel;
  readonly onAction: (action: ExplorerAction) => void;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
};

export function ResultCard({ result, onAction, onMatchVenueFocusChange }: ResultCardProps) {
  return (
    <section id="selection-results" class="result-card" aria-labelledby="result-card-title">
      <p class="visually-hidden" aria-live="polite">
        {createResultStatusLabel(result)}
      </p>
      <header class="result-card__header">
        <span class="result-card__icon" aria-hidden="true">
          {result.icon}
        </span>
        <div>
          <h2 id="result-card-title">{result.title}</h2>
          {result.subtitle ? <p>{result.subtitle}</p> : null}
        </div>
      </header>

      {result.routeSummary ? (
        <div class="route-summary">
          <div class="route-summary__headline">
            <span>{result.routeSummary.itineraryLabel}</span>
            <strong>{result.routeSummary.totalDistanceLabel}</strong>
          </div>
          <p class="route-summary__note">{result.routeSummary.distanceMethodLabel}</p>
          {result.routeSummary.venueCountExplanationLabel ? (
            <p class="route-summary__note">{result.routeSummary.venueCountExplanationLabel}</p>
          ) : null}
          {result.routeSummary.legs.length > 0 ? (
            <ol class="route-leg-list" aria-label="Route legs by fixture date">
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

      <ResultDetails details={result.details} />

      {result.matches.length > 0 ? (
        <ol class="match-list">
          {result.matches.map((match, index) => (
            <li class="match-list__item" key={match.matchId}>
              {shouldShowMatchDateHeading(result.matches, index) ? (
                <div class="match-list__date-row">
                  <h3>{match.dateHeadingLabel}</h3>
                </div>
              ) : null}
              <button
                class="match-card"
                type="button"
                onBlur={() => onMatchVenueFocusChange(null)}
                onClick={() => onAction({ type: "selectVenue", venueId: match.venueId })}
                onFocus={() => onMatchVenueFocusChange(match.venueId)}
                onMouseEnter={() => onMatchVenueFocusChange(match.venueId)}
                onMouseLeave={() => onMatchVenueFocusChange(null)}
                aria-label={`Show venue ${match.venueLabel} for ${match.matchupAriaLabel} on ${match.dateLabel}`}
              >
                <span class="match-card__score-row" aria-hidden="true">
                  <MatchTeam team={match.homeTeam} side="home" />
                  <MatchCenter match={match} />
                  <MatchTeam team={match.awayTeam} side="away" />
                </span>
                <span class="match-card__meta-line" aria-hidden="true">
                  {match.fixtureMetaLabel}
                </span>
                <span class="match-card__a11y">
                  <span class="visually-hidden">{match.matchupAriaLabel}</span>
                  <span class="visually-hidden">
                    {match.scoreLineLabel ?? `${match.statusLabel}, ${match.secondaryText}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div class="result-card__empty">
          <p>{result.emptyMessage}</p>
          <button class="clear-button" type="button" onClick={() => onAction({ type: "clearAll" })}>
            Clear selection
          </button>
        </div>
      )}
    </section>
  );
}

function shouldShowMatchDateHeading(matches: readonly MatchListItemViewModel[], index: number) {
  const match = matches[index];
  const previousMatch = matches[index - 1];

  return Boolean(match && match.dateHeadingLabel !== previousMatch?.dateHeadingLabel);
}

function MatchTeam({
  side,
  team,
}: {
  readonly side: "home" | "away";
  readonly team: MatchTeamViewModel;
}) {
  const flag = team.flagEmoji ? (
    <span class="match-card__flag" aria-hidden="true">
      {team.flagEmoji}
    </span>
  ) : null;

  return (
    <span class={classNames("match-card__team", `match-card__team--${side}`)}>
      {side === "home" ? (
        <>
          <span class="match-card__team-name">{team.displayName}</span>
          {flag}
        </>
      ) : (
        <>
          {flag}
          <span class="match-card__team-name">{team.displayName}</span>
        </>
      )}
    </span>
  );
}

function MatchCenter({ match }: { readonly match: MatchListItemViewModel }) {
  if (match.homeScoreLabel && match.awayScoreLabel) {
    return (
      <span class="match-card__center">
        <span
          class={classNames(
            "match-card__score",
            match.winningSide === "home" && "is-winner",
            match.winningSide === "away" && "is-muted",
          )}
        >
          {match.homeScoreLabel}
        </span>
        <span class="match-card__status">FT</span>
        <span
          class={classNames(
            "match-card__score",
            match.winningSide === "away" && "is-winner",
            match.winningSide === "home" && "is-muted",
          )}
        >
          {match.awayScoreLabel}
        </span>
      </span>
    );
  }

  return (
    <span class="match-card__center">
      <span class="match-card__kickoff">{match.kickoffLabel}</span>
    </span>
  );
}

function createResultStatusLabel(result: ExplorerResultViewModel): string {
  if (result.type === "empty") {
    return result.title;
  }

  return `${result.title}, ${result.matches.length} ${result.matches.length === 1 ? "match" : "matches"}`;
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
    <dl class="detail-metrics">
      {metrics.map((metric) => (
        <div class="detail-metric" key={metric.label}>
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
      class="group-standings"
      aria-label="Scrollable group table"
      tabIndex={0}
      onKeyDown={handleGroupStandingsKeyDown}
    >
      <table>
        <caption>{details.groupLabel} standings</caption>
        <thead>
          <tr>
            <th class="group-standings__team-heading" scope="col">
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
                <span class="group-standings__team">
                  <span class="group-standings__rank" aria-hidden="true">
                    {row.position}
                  </span>
                  {row.teamFlagEmoji ? (
                    <span class="group-standings__flag" aria-hidden="true">
                      {row.teamFlagEmoji}
                    </span>
                  ) : null}
                  <span class="group-standings__code" aria-hidden="true">
                    {row.teamCodeLabel}
                  </span>
                  <span class="visually-hidden">
                    {row.position}. {row.teamLabel}
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
                <span class="group-standings__form">
                  <span class="visually-hidden">{row.teamLabel} form:</span>
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
      class={classNames("group-standings__form-entry", `is-${entry.result}`)}
      title={entry.label}
    >
      <span class="visually-hidden">
        {index + 1}: {entry.label}
      </span>
    </span>
  );
}

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
