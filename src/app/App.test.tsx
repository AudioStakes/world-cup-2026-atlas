import { fireEvent, render, screen, within } from "@testing-library/preact";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

function selectJapan() {
  fireEvent.click(screen.getByRole("button", { name: "Select Japan" }));
}

function getFirstMatchCard() {
  const matchCard = document.querySelector(".match-card");

  if (!matchCard) {
    throw new Error("Expected match card to render");
  }

  return matchCard as HTMLElement;
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("renders the default explorer state from the production A1 country", () => {
    render(<App />);

    expect(screen.getByText("World Cup 2026 Atlas")).toBeInTheDocument();
    expect(screen.queryByText("/?country=mex")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("updates selection when a different team is clicked", () => {
    render(<App />);

    selectJapan();

    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders readable country names in the groups table", () => {
    render(<App />);

    const groupsSection = screen.getByRole("region", { name: "Groups & Teams" });

    expect(within(groupsSection).getByText("South Africa")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Korea Republic")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Czechia")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Japan")).toBeInTheDocument();
    expect(within(groupsSection).queryByText("JPN")).not.toBeInTheDocument();
    expect(within(groupsSection).queryByText("JPN · AFC")).not.toBeInTheDocument();
  });

  it("omits redundant panel headings from the visible explorer controls", () => {
    render(<App />);

    expect(screen.queryByText("Explore")).not.toBeInTheDocument();
    expect(screen.queryByText("Dates")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Date" })).toHaveClass("visually-hidden");
    expect(screen.getByRole("region", { name: "Date" })).toBeInTheDocument();
  });

  it("keeps date chips visually compact while preserving date selection", () => {
    render(<App />);

    const dateButton = screen.getByRole("button", { name: /Select Sun Jun 14/ });
    fireEvent.click(dateButton);

    expect(dateButton).toHaveAttribute("aria-pressed", "true");
    expect(dateButton).toHaveTextContent("14");
    expect(dateButton).not.toHaveTextContent("Sun");
    expect(dateButton).not.toHaveTextContent("Jun");
    expect(screen.queryByText(/matches/)).not.toBeInTheDocument();
  });

  it("renders match cards as compact date matchup venue rows", () => {
    render(<App />);

    const matchCard = getFirstMatchCard();
    const matchScope = within(matchCard);

    expect(matchScope.getByText("🇲🇽 vs 🇿🇦")).toBeInTheDocument();
    expect(matchScope.getByText("🇲🇽 Mexico vs 🇿🇦 South Africa")).toHaveClass("visually-hidden");
    expect(matchScope.queryByText(/Estadio Azteca · Mexico City, Mexico/)).not.toBeInTheDocument();
  });

  it("highlights the matching venue marker when a match card is hovered or focused", () => {
    render(<App />);

    const matchCard = getFirstMatchCard();

    fireEvent.mouseEnter(matchCard);
    expect(document.querySelectorAll(".venue-marker.is-highlighted")).toHaveLength(1);
    expect(document.querySelector(".venue-marker.is-highlighted")).toHaveAttribute(
      "data-venue-id",
      "mexico-city",
    );

    fireEvent.mouseLeave(matchCard);
    fireEvent.focus(matchCard);
    expect(document.querySelectorAll(".venue-marker.is-highlighted")).toHaveLength(1);
    expect(document.querySelector(".venue-marker.is-highlighted")).toHaveAttribute(
      "data-venue-id",
      "mexico-city",
    );
  });

  it("renders venue results after selecting a venue", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Select venue Dallas/ }));

    expect(screen.getByRole("heading", { name: "Dallas" })).toBeInTheDocument();
    expect(getFirstMatchCard()).not.toHaveTextContent("Arlington, USA");
  });
});
