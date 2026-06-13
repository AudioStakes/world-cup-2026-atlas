import { fireEvent, render, screen, within } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { matchId, venueId } from "../../domain/ids";
import type { ExplorerResultViewModel } from "../../features/explorer/types";
import { ResultCard } from "./ResultCard";

const completedResult: ExplorerResultViewModel = {
  type: "group",
  icon: "D",
  title: "Group D",
  subtitle: "4 teams",
  details: null,
  emptyMessage: null,
  routeSummary: null,
  matches: [
    {
      matchId: matchId("match-1"),
      matchNumberLabel: "Match 1",
      stageLabel: "Group D",
      dateLabel: "Sat Jun 13",
      dateHeadingLabel: "Saturday 13 June 2026",
      primaryText: "United States vs Paraguay",
      homeTeam: {
        flagEmoji: "🇺🇸",
        displayName: "United States",
        code: "USA",
      },
      awayTeam: {
        flagEmoji: "🇵🇾",
        displayName: "Paraguay",
        code: "PAR",
      },
      matchupText: "🇺🇸 USA vs 🇵🇾 PAR",
      matchupAriaLabel: "🇺🇸 United States vs 🇵🇾 Paraguay",
      kickoffLabel: "12:00",
      homeScoreLabel: "2",
      awayScoreLabel: "1",
      winningSide: "home",
      scoreLineLabel: "2-1",
      statusLabel: "Full time",
      secondaryText: "12:00 PT",
      fixtureMetaLabel: "First Stage · Group D · Los Angeles Stadium (Los Angeles)",
      venueId: venueId("los-angeles"),
      venueLabel: "Los Angeles",
      venueDetailLabel: "Los Angeles Stadium · Los Angeles, USA · PT",
    },
  ],
};

describe("ResultCard", () => {
  it("renders completed fixtures with a FIFA-style scoreline", () => {
    const onAction = vi.fn();

    render(
      <ResultCard
        result={completedResult}
        onAction={onAction}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    const matchCard = screen.getByRole("button", {
      name: /Show venue Los Angeles for 🇺🇸 United States vs 🇵🇾 Paraguay/,
    });
    const matchScope = within(matchCard);

    expect(screen.getByText("Saturday 13 June 2026")).toBeInTheDocument();
    expect(matchScope.getByText("United States")).toBeInTheDocument();
    expect(matchScope.getByText("FT")).toBeInTheDocument();
    expect(matchScope.getByText("2")).toHaveClass("is-winner");
    expect(matchScope.getByText("1")).toHaveClass("is-muted");
    expect(
      matchScope.getByText("First Stage · Group D · Los Angeles Stadium (Los Angeles)"),
    ).toBeInTheDocument();

    fireEvent.click(matchCard);

    expect(onAction).toHaveBeenCalledWith({ type: "selectVenue", venueId: venueId("los-angeles") });
  });
});
