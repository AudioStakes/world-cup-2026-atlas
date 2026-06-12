import type { VenueId } from "../../domain/ids";
import type {
  DetailMetricViewModel,
  ExplorerDetailViewModel,
  ExplorerResultViewModel,
  GroupDetailViewModel,
} from "../../features/explorer/types";

type ResultCardProps = {
  readonly result: ExplorerResultViewModel;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
};

export function ResultCard({ result, onMatchVenueFocusChange }: ResultCardProps) {
  return (
    <section class="result-card" aria-labelledby="result-card-title">
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
          {result.routeSummary.venueCountExplanationLabel ? (
            <p class="route-summary__note">{result.routeSummary.venueCountExplanationLabel}</p>
          ) : null}
        </div>
      ) : null}

      <ResultDetails details={result.details} />

      {result.matches.length > 0 ? (
        <ol class="match-list">
          {result.matches.map((match) => (
            <li key={match.matchId}>
              <button
                class="match-card"
                type="button"
                onBlur={() => onMatchVenueFocusChange(null)}
                onClick={() => onMatchVenueFocusChange(match.venueId)}
                onFocus={() => onMatchVenueFocusChange(match.venueId)}
                onMouseEnter={() => onMatchVenueFocusChange(match.venueId)}
                onMouseLeave={() => onMatchVenueFocusChange(null)}
              >
                <span class="match-card__when">
                  {match.dateLabel} {match.secondaryText}
                </span>
                <span class="match-card__matchup">
                  <span aria-hidden="true">{match.matchupText}</span>
                  <span class="visually-hidden">{match.matchupAriaLabel}</span>
                </span>
                <span class="match-card__status">{match.scoreLineLabel ?? match.statusLabel}</span>
                <span class="match-card__venue">{match.venueLabel}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p class="result-card__empty">{result.emptyMessage}</p>
      )}
    </section>
  );
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
    <section class="group-standings" aria-label="Group table">
      <table>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">D</th>
            <th scope="col">L</th>
            <th scope="col">GF</th>
            <th scope="col">GA</th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
            <th scope="col">Matches</th>
          </tr>
        </thead>
        <tbody>
          {details.standings.map((row) => (
            <tr key={row.countryId ?? row.teamLabel}>
              <th scope="row">{row.teamLabel}</th>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td>{row.goalDifferenceLabel}</td>
              <td>{row.points}</td>
              <td>{row.matchSummary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
