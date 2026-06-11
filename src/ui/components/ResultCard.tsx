import type { ExplorerResultViewModel } from "../../features/explorer/types";

type ResultCardProps = {
  readonly result: ExplorerResultViewModel;
};

export function ResultCard({ result }: ResultCardProps) {
  return (
    <section class="result-card" aria-labelledby="result-card-title">
      <p class="eyebrow">Result</p>
      <div class="result-card__header">
        <span class="result-card__icon" aria-hidden="true">
          {result.icon}
        </span>
        <div>
          <h2 id="result-card-title">{result.title}</h2>
        </div>
      </div>

      {result.matches.length > 0 ? (
        <ol class="match-list">
          {result.matches.map((match) => (
            <li class="match-card" key={match.matchId}>
              <p class="match-card__meta">
                {match.matchNumberLabel} · {match.stageLabel}
              </p>
              <p class="match-card__date">{match.dateLabel}</p>
              <p class="match-card__primary">{match.primaryText}</p>
              <p class="match-card__secondary">{match.secondaryText}</p>
              <p class="match-card__venue">📍 {match.venueLabel}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p class="result-card__empty">{result.emptyMessage}</p>
      )}
    </section>
  );
}
