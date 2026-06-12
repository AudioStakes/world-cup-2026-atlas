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
              <span class="match-card__when">
                {match.dateLabel} {match.secondaryText}
              </span>
              <span class="match-card__matchup">
                <span aria-hidden="true">{match.matchupText}</span>
                <span class="visually-hidden">{match.matchupAriaLabel}</span>
              </span>
              <span class="match-card__venue">{match.venueLabel}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p class="result-card__empty">{result.emptyMessage}</p>
      )}
    </section>
  );
}
