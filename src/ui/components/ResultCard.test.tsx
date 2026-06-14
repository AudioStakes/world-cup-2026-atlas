import { fireEvent, render, screen, within } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { countryId, groupCode, matchId, venueId } from "../../domain/ids";
import type {
  ExplorerResultViewModel,
  MatchListItemViewModel,
} from "../../features/explorer/types";
import { ResultCard } from "./ResultCard";

const completedMatch: MatchListItemViewModel = {
  matchId: matchId("match-1"),
  matchNumberLabel: "Match 1",
  stageLabel: "Group D",
  dateLabel: "Sat Jun 13",
  dateHeadingLabel: "Saturday 13 June 2026",
  isInitialScrollTarget: false,
  primaryText: "United States vs Paraguay",
  homeTeam: {
    countryId: countryId("usa"),
    flagEmoji: "🇺🇸",
    displayName: "United States",
    code: "USA",
  },
  awayTeam: {
    countryId: countryId("par"),
    flagEmoji: "🇵🇾",
    displayName: "Paraguay",
    code: "PAR",
  },
  matchupText: "🇺🇸 USA vs 🇵🇾 PAR",
  matchupAriaLabel: "United States vs Paraguay",
  kickoffLabel: "12:00",
  homeScoreLabel: "2",
  awayScoreLabel: "1",
  winningSide: "home",
  scoreLineLabel: "2-1",
  normalizedStatus: "finished",
  shortStatusLabel: "FT",
  statusLabel: "Full time",
  secondaryText: "12:00 PT",
  stageMetaLabel: "First Stage",
  groupCode: groupCode("D"),
  groupLabel: "Group D",
  fixtureMetaLabel: "First Stage · Group D · Los Angeles Stadium (Los Angeles)",
  venueId: venueId("los-angeles"),
  venueLabel: "Los Angeles",
  venueFixtureLabel: "Los Angeles Stadium (Los Angeles)",
  venueDetailLabel: "Los Angeles Stadium · Los Angeles, USA · PT",
};

const completedResult: ExplorerResultViewModel = {
  type: "group",
  icon: "D",
  title: "Group D",
  subtitle: "4 teams",
  matchCount: 1,
  groupNavigation: null,
  details: null,
  emptyMessage: null,
  routeSummary: null,
  matches: [completedMatch],
};

describe("ResultCard", () => {
  it("renders date selections as a scrollable all-fixtures timeline", () => {
    render(
      <ResultCard
        result={{
          ...completedResult,
          type: "date",
          icon: "📅",
          title: "Jun 13",
          subtitle: "4 matches · 12:00–21:00 · PT/ET",
          details: {
            type: "date",
            metrics: [{ label: "Matches", value: "4 matches" }],
          },
          matches: [
            {
              ...completedMatch,
              matchId: matchId("match-previous"),
              dateLabel: "Fri Jun 12",
              dateHeadingLabel: "Friday 12 June 2026",
              isInitialScrollTarget: false,
            },
            {
              ...completedMatch,
              matchId: matchId("match-selected"),
              dateLabel: "Sat Jun 13",
              dateHeadingLabel: "Saturday 13 June 2026",
              isInitialScrollTarget: true,
            },
            {
              ...completedMatch,
              matchId: matchId("match-next"),
              dateLabel: "Sun Jun 14",
              dateHeadingLabel: "Sunday 14 June 2026",
              isInitialScrollTarget: false,
            },
          ],
        }}
        onAction={() => {}}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    expect(screen.getByTestId("result-card")).toBeInTheDocument();
    expect(screen.queryByTestId("result-card-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("detail-metrics")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tournament fixtures by date" })).toBe(
      screen.getByTestId("match-list"),
    );
    expect(screen.getByText("Friday 12 June 2026")).toBeInTheDocument();
    expect(screen.getByText("Saturday 13 June 2026")).toBeInTheDocument();
    expect(screen.getByText("Sunday 14 June 2026")).toBeInTheDocument();
    expect(document.querySelector("[data-initial-scroll-target]")).toBeInTheDocument();
  });

  it("renders a country group subtitle as an actionable route", () => {
    const onAction = vi.fn();

    render(
      <ResultCard
        result={{
          ...completedResult,
          type: "country",
          icon: "🇭🇹",
          title: "Haiti",
          subtitle: "Group C · HAI · CONCACAF",
          groupNavigation: {
            groupCode: groupCode("C"),
            label: "Group C",
            trailingLabel: "HAI · CONCACAF",
            href: "?group=C",
            ariaLabel: "Show Group C details",
          },
          matches: [],
        }}
        onAction={onAction}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    const groupLink = screen.getByRole("link", { name: "Show Group C details" });

    expect(groupLink).toHaveTextContent("Group C");
    expect(groupLink.getAttribute("href")).toBe("?group=C");
    expect(screen.getByText("HAI · CONCACAF")).toBeInTheDocument();

    fireEvent.click(groupLink);

    expect(onAction).toHaveBeenCalledWith({ type: "selectGroup", groupCode: groupCode("C") });
  });

  it("renders group standings with ranks and form without a Matches column", () => {
    render(
      <ResultCard
        result={{
          ...completedResult,
          details: {
            type: "group",
            groupLabel: "Group D",
            standings: [
              {
                countryId: countryId("usa"),
                position: 1,
                teamLabel: "🇺🇸 United States",
                teamPlainLabel: "United States",
                teamCodeLabel: "USA",
                teamFlagEmoji: "🇺🇸",
                played: 1,
                won: 1,
                drawn: 0,
                lost: 0,
                goalsFor: 2,
                goalsAgainst: 1,
                goalDifferenceLabel: "+1",
                points: 3,
                form: [
                  { result: "win", label: "Win 2-1" },
                  { result: "pending", label: "Fixture pending" },
                ],
              },
            ],
          },
        }}
        onAction={() => {}}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Group D" })).toBeInTheDocument();
    expect(screen.queryByTestId("result-card-header")).not.toBeInTheDocument();
    expect(screen.queryByText("4 teams")).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Group D standings" })).getByText("USA"),
    ).toBeInTheDocument();
    expect(screen.getByText("1. United States")).toHaveClass("visually-hidden");
    expect(screen.queryByRole("columnheader", { name: "Matches" })).not.toBeInTheDocument();
    expect(document.querySelector('[data-form-result="win"]')).toHaveAttribute("title", "Win 2-1");
  });

  it("renders completed fixtures with a FIFA-style scoreline", () => {
    const onAction = vi.fn();

    render(
      <ResultCard
        result={completedResult}
        onAction={onAction}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    const matchCard = document.querySelector('[data-testid="match-card"]');

    if (!(matchCard instanceof HTMLElement)) {
      throw new Error("Expected match card to render");
    }

    const matchScope = within(matchCard);

    expect(screen.getByText("Saturday 13 June 2026")).toBeInTheDocument();
    expect(matchScope.getByText("United States")).toBeInTheDocument();
    expect(matchScope.getByText("FT")).toBeInTheDocument();
    expect(matchScope.getByText("2")).toHaveAttribute("data-score-state", "winner");
    expect(matchScope.getByText("1")).toHaveAttribute("data-score-state", "muted");
    expect(matchCard.querySelector('[data-testid="match-card-meta-line"]')).toHaveTextContent(
      "Group D·First Stage·Los Angeles Stadium (Los Angeles)",
    );
    expect(matchScope.getByRole("button", { name: "Select group Group D" })).toHaveTextContent(
      "Group D",
    );

    fireEvent.click(matchCard);

    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(matchScope.getByRole("button", { name: "Select country United States" }));
    fireEvent.click(matchScope.getByRole("button", { name: "Select group Group D" }));
    fireEvent.click(matchScope.getByRole("button", { name: "Select match venue Los Angeles" }));

    expect(onAction).toHaveBeenNthCalledWith(1, {
      type: "selectCountry",
      countryId: countryId("usa"),
    });
    expect(onAction).toHaveBeenNthCalledWith(2, {
      type: "selectGroup",
      groupCode: groupCode("D"),
    });
    expect(onAction).toHaveBeenCalledWith({ type: "selectVenue", venueId: venueId("los-angeles") });
  });

  it("renders the ViewModel short status instead of hardcoding full time", () => {
    render(
      <ResultCard
        result={{
          ...completedResult,
          matches: [
            {
              ...completedMatch,
              normalizedStatus: "live",
              shortStatusLabel: "1H",
              statusLabel: "Live",
              homeScoreLabel: "1",
              awayScoreLabel: "0",
              scoreLineLabel: "1-0",
              winningSide: null,
            },
          ],
        }}
        onAction={() => {}}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    expect(screen.getByText("1H")).toBeInTheDocument();
    expect(screen.queryByText("FT")).not.toBeInTheDocument();
  });

  it("renders scoreless non-scheduled statuses instead of kickoff", () => {
    render(
      <ResultCard
        result={{
          ...completedResult,
          matches: [
            {
              ...completedMatch,
              normalizedStatus: "postponed",
              shortStatusLabel: "PST",
              statusLabel: "Postponed",
              homeScoreLabel: null,
              awayScoreLabel: null,
              scoreLineLabel: null,
            },
          ],
        }}
        onAction={() => {}}
        onMatchVenueFocusChange={() => {}}
      />,
    );

    expect(screen.getByText("PST")).toBeInTheDocument();
    expect(screen.queryByText("12:00")).not.toBeInTheDocument();
  });
});
