import { fireEvent, render, screen, within } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function clearSelection() {
  const clearButton = screen.getByRole("button", { name: /clear/i });

  if (!clearButton.hasAttribute("disabled")) {
    fireEvent.click(clearButton);
  }
}

function selectJapan() {
  fireEvent.click(screen.getByRole("button", { name: "Select Japan" }));
}

function getFirstMatchCard() {
  const matchCard = document.querySelector(".match-card");

  if (!matchCard) {
    throw new Error("Expected at least one rendered match card");
  }

  return matchCard as HTMLElement;
}

function expectMatchCardProductionMetadata(matchCard: HTMLElement) {
  const matchScope = within(matchCard);

  expect(matchScope.getByText(/^Match \d+ · /)).toBeInTheDocument();
  expect(matchScope.getByText(/^(Jun|Jul) \d+$/)).toBeInTheDocument();
  expect(matchScope.getByText(/^\d{2}:\d{2} (PT|CT|ET)$/)).toBeInTheDocument();
  expect(
    matchScope.getByText((content, element) =>
      Boolean(
        element?.classList.contains("match-card__venue") &&
          content.includes("📍") &&
          content.includes("·") &&
          content.match(/PT|CT|ET/),
      ),
    ),
  ).toBeInTheDocument();
}

describe("App", () => {
  it("renders the default explorer state from the production A1 country", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Mexico" })).toBeInTheDocument();
    expect(screen.getByText("Group A · MEX · CONCACAF")).toBeInTheDocument();
    expect(screen.getByText("/?country=mex")).toBeInTheDocument();
  });

  it("updates selection when a different team is clicked", () => {
    render(<App />);

    selectJapan();

    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByText("Group F · JPN · AFC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders team production metadata in the groups table", () => {
    render(<App />);

    const japanButton = screen.getByRole("button", { name: "Select Japan" });

    expect(within(japanButton).getByText("Japan")).toBeInTheDocument();
    expect(within(japanButton).getByText("JPN · AFC")).toBeInTheDocument();
  });

  it("renders date result production metadata and match-item production metadata", () => {
    render(<App />);

    clearSelection();
    fireEvent.click(screen.getByRole("button", { name: /Select Jun 14/i }));

    expect(screen.getByRole("heading", { name: "Jun 14" })).toBeInTheDocument();
    expect(screen.getByText("4 matches · 12:00–20:00 · CT/ET")).toBeInTheDocument();
    expectMatchCardProductionMetadata(getFirstMatchCard());
  });

  it("renders venue result production metadata after selecting a venue", () => {
    render(<App />);

    clearSelection();
    fireEvent.click(screen.getByRole("button", { name: /Select venue Dallas/i }));

    expect(screen.getByRole("heading", { name: "Dallas" })).toBeInTheDocument();
    expect(screen.getByText("AT&T Stadium · Arlington, USA · CT")).toBeInTheDocument();
  });
});
