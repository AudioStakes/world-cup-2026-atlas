import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the product name", () => {
    render(<App />);

    expect(screen.getByText("World Cup 2026 Atlas")).toBeInTheDocument();
  });
});
