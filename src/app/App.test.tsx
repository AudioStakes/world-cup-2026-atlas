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

    expect(within(groupsSection).getByText("JPN")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Japan")).toBeInTheDocument();
    expect(within(groupsSection).queryByText("JPN · AFC")).not.toBeInTheDocument();
  });

  it("keeps date chips visually compact while preserving date selection", () => {
    render(<App />);

    const dateButton = screen.getByRole("button", { name: /Select Sun Jun 14/ });
    fireEvent.click(dateButton);

    expect(dateButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/matches/)).not.toBeInTheDocument();
  });

  it("renders match cards without long venue detail lines", () => {
    render(<App />);

    const matchCard = getFirstMatchCard();
    const matchScope = within(matchCard);

    expect(matchCard).toHaveTextContent("Match 1 · Group A");
    expect(matchScope.queryByText(/Estadio Azteca · Mexico City, Mexico/)).not.toBeInTheDocument();
  });

  it("renders venue results after selecting a venue", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Select venue Dallas/ }));

    expect(screen.getByRole("heading", { name: "Dallas" })).toBeInTheDocument();
    expect(getFirstMatchCard()).not.toHaveTextContent("Arlington, USA");
  });
});
