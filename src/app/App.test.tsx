import { fireEvent, render, screen } from "@testing-library/preact";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("renders the explorer UI", () => {
    render(<App />);

    expect(screen.getAllByText("World Cup 2026 Atlas").length).toBeGreaterThan(0);
    expect(screen.getByText("Groups & Teams")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
  });

  it("selects a team from the groups table", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Select Japan" }));

    expect(screen.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByText("/?country=jpn")).toBeInTheDocument();
  });
});
