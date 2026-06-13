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
  matchupAriaLabel: "🇺🇸 United States vs 🇵🇾 Paraguay",
  kickoffLabel: "12:00",
  homeScoreLabel: "2",
  awayScoreLabel: "1",
  winningSide: "home",
  scoreLineLabel: "2-1",
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

    expect(document.querySelector(".result-card--date-timeline")).toBeInTheDocument();
    expect(document.querySelector(".result-card__header")).not.toBeInTheDocument();
    expect(document.querySelector(".detail-metrics")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tournament fixtures by date" })).toHaveClass(
      "match-list--date-timeline",
    );
    expect(screen.getByText("Friday 12 June 2026")).toBeInTheDocument();
    expect(screen.getByText("Saturday 13 June 2026")).toBeInTheDocument();
    expect(screen.getByText("Sunday 14 June 2026")).toBeInTheDocument();
    expect(document.querySelector("[data-initial-scroll-target]")).toHaveClass(
      "is-initial-scroll-target",
    );
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

    expect(groupLink).toHaveClass("result-card__group-link");
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
    expect(screen.getByText("USA")).toBeInTheDocument();
    expect(screen.getByText("1. 🇺🇸 United States")).toHaveClass("visually-hidden");
    expect(screen.queryByRole("columnheader", { name: "Matches" })).not.toBeInTheDocument();
    expect(document.querySelector(".group-standings__form-entry.is-win")).toHaveAttribute(
      "title",
      "Win 2-1",
    );
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

    const matchCard = document.querySelector(".match-card");

    if (!(matchCard instanceof HTMLElement)) {
      throw new Error("Expected match card to render");
    }

    const matchScope = within(matchCard);

    expect(screen.getByText("Saturday 13 June 2026")).toBeInTheDocument();
    expect(matchScope.getByText("United States")).toBeInTheDocument();
    expect(matchScope.getByText("FT")).toBeInTheDocument();
    expect(matchScope.getByText("2")).toHaveClass("is-winner");
    expect(matchScope.getByText("1")).toHaveClass("is-muted");
    expect(matchCard.querySelector(".match-card__meta-line")).toHaveTextContent(
      "First Stage·Group D·Los Angeles Stadium (Los Angeles)",
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
});
