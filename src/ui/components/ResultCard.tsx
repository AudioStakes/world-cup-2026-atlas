import type { VenueId } from "../../domain/ids";
import type { ExplorerResultViewModel } from "../../features/explorer/types";

type ResultCardProps = {
  readonly result: ExplorerResultViewModel;
  readonly onMatchVenueFocusChange: (venueId: VenueId | null) => void;
};

export function ResultCard({ result, onMatchVenueFocusChange }: ResultCardProps) {
  return (
    <section class="result-card" aria-labelledby="result-card-title">
      <h2 id="result-card-title" class="visually-hidden">
        {result.title}
      </h2>

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
