import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPLORER_MAP_DISPLAY_VIEWBOX,
  EXPLORER_MAP_VIEWBOX,
} from "../features/explorer/mapViewport";
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

function getVenueMarker(venueId: string) {
  const marker = document.querySelector(`[data-venue-id="${venueId}"]`);

  if (!marker) {
    throw new Error(`Expected ${venueId} marker to render`);
  }

  return marker;
}

function getVenueControl(venueId: string) {
  const control = document.querySelector(`.venue-marker-control[data-venue-id="${venueId}"]`);

  if (!control) {
    throw new Error(`Expected ${venueId} marker control to render`);
  }

  return control as HTMLElement;
}

function getVenueLabelBox(venueId: string) {
  const marker = getVenueMarker(venueId);
  const label = marker.querySelector(".venue-marker__map-label");
  const labelBackground = marker.querySelector(".venue-marker__label-bg");
  const transform = label?.getAttribute("transform");
  const match = transform?.match(/^translate\(([-\d.]+) ([-\d.]+)\)$/);

  if (!match || !labelBackground) {
    throw new Error(`Expected ${venueId} label bounds to render`);
  }

  return {
    height: Number(labelBackground.getAttribute("height")),
    width: Number(labelBackground.getAttribute("width")),
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

function doBoxesOverlap(
  left: { readonly height: number; readonly width: number; readonly x: number; readonly y: number },
  right: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  },
) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function getVenueAnchorPoint(venueId: string) {
  const anchor = document.querySelector(`[data-venue-anchor-id="${venueId}"]`);

  if (!(anchor instanceof Element) || anchor.tagName.toLowerCase() !== "circle") {
    throw new Error(`Expected ${venueId} marker anchor to render`);
  }

  return {
    x: Number(anchor.getAttribute("cx")),
    y: Number(anchor.getAttribute("cy")),
  };
}

type MockScreenMatrix = {
  readonly a: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

const originalResizeObserver = window.ResizeObserver;
const originalCreateSvgPoint = Object.getOwnPropertyDescriptor(
  SVGSVGElement.prototype,
  "createSVGPoint",
);
const originalGetScreenCTM = Object.getOwnPropertyDescriptor(
  SVGSVGElement.prototype,
  "getScreenCTM",
);
const originalGetBoundingClientRect = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "getBoundingClientRect",
);

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }

  static reset() {
    MockResizeObserver.instances = [];
  }

  static triggerAll() {
    for (const instance of MockResizeObserver.instances) {
      instance.trigger();
    }
  }
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    MockResizeObserver.reset();
    vi.restoreAllMocks();

    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      delete (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver })
        .ResizeObserver;
    }

    if (originalCreateSvgPoint) {
      Object.defineProperty(SVGSVGElement.prototype, "createSVGPoint", originalCreateSvgPoint);
    }

    if (originalGetScreenCTM) {
      Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", originalGetScreenCTM);
    }

    if (originalGetBoundingClientRect) {
      Object.defineProperty(
        HTMLElement.prototype,
        "getBoundingClientRect",
        originalGetBoundingClientRect,
      );
    }
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

  it("keeps only the last clicked filter in the browser URL", () => {
    render(<App />);

    selectJapan();
    expect(window.location.search).toBe("?country=jpn");

    fireEvent.click(screen.getByRole("button", { name: /Select Sun Jun 14/ }));

    expect(window.location.search).toBe("?date=2026-06-14");
  });

  it("renders readable country names in the groups table", () => {
    render(<App />);

    const groupsSection = screen.getByRole("region", { name: "Groups & Teams" });

    expect(within(groupsSection).getByText("South Africa")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Korea Republic")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Czechia")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Canada")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Bosnia and Herzegovina")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Qatar")).toBeInTheDocument();
    expect(within(groupsSection).getByText("Switzerland")).toBeInTheDocument();
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

    expect(matchScope.getByText("Thu Jun 11 13:00 CT")).toBeInTheDocument();
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

  it("keeps map marker labels compact with visible venue names only", () => {
    render(<App />);

    const seattleMarker = document.querySelector('[data-venue-id="seattle"]');
    const labelText = seattleMarker?.querySelector(".venue-marker__label-text");

    expect(labelText).toHaveTextContent("Seattle");
    expect(labelText).not.toHaveTextContent("Lumen Field");
  });

  it("renders a closer map crop while preserving venue center coordinates", async () => {
    let screenMatrix: MockScreenMatrix = { a: 0.4, d: 0.5, e: 180, f: 90 };
    const mapCanvasRect = new DOMRect(24, 36, 960, 720);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);

      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(SVGSVGElement.prototype, "createSVGPoint", {
      configurable: true,
      value() {
        return {
          x: 0,
          y: 0,
          matrixTransform(matrix: MockScreenMatrix) {
            return {
              x: this.x * matrix.a + matrix.e,
              y: this.y * matrix.d + matrix.f,
            };
          },
        };
      },
    });
    Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", {
      configurable: true,
      value() {
        return screenMatrix;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value() {
        if (this.classList.contains("map-canvas")) {
          return mapCanvasRect;
        }

        return new DOMRect();
      },
    });

    const firstRender = render(<App />);

    const svg = document.querySelector(".map-svg");
    const bostonControl = getVenueControl("boston");
    const bostonPosition = getVenueAnchorPoint("boston");

    expect(svg).toHaveAttribute(
      "viewBox",
      `${EXPLORER_MAP_DISPLAY_VIEWBOX.minX} ${EXPLORER_MAP_DISPLAY_VIEWBOX.minY} ${EXPLORER_MAP_DISPLAY_VIEWBOX.width} ${EXPLORER_MAP_DISPLAY_VIEWBOX.height}`,
    );
    expect(EXPLORER_MAP_DISPLAY_VIEWBOX.width).toBeLessThan(EXPLORER_MAP_VIEWBOX.width);
    expect(EXPLORER_MAP_DISPLAY_VIEWBOX.height).toBeLessThan(EXPLORER_MAP_VIEWBOX.height);
    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0]?.observe).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(Number.isFinite(Number.parseFloat(bostonControl.style.left))).toBe(true);
      expect(Number.isFinite(Number.parseFloat(bostonControl.style.top))).toBe(true);
    });

    const initialLeft = Number.parseFloat(bostonControl.style.left);
    const initialTop = Number.parseFloat(bostonControl.style.top);
    const initialScreenMatrix = screenMatrix;

    firstRender.unmount();
    screenMatrix = { a: 0.32, d: 0.44, e: 150, f: 112 };
    render(<App />);

    const updatedBostonControl = getVenueControl("boston");

    await waitFor(() => {
      expect(Number.parseFloat(updatedBostonControl.style.left)).toBeCloseTo(
        initialLeft +
          bostonPosition.x * (screenMatrix.a - initialScreenMatrix.a) +
          (screenMatrix.e - initialScreenMatrix.e),
      );
      expect(Number.parseFloat(updatedBostonControl.style.top)).toBeCloseTo(
        initialTop +
          bostonPosition.y * (screenMatrix.d - initialScreenMatrix.d) +
          (screenMatrix.f - initialScreenMatrix.f),
      );
    });
  });

  it("stacks dense East Coast venue labels without moving marker centers", () => {
    render(<App />);

    const bostonLabel = getVenueLabelBox("boston");
    const newYorkLabel = getVenueLabelBox("new-york-new-jersey");
    const philadelphiaLabel = getVenueLabelBox("philadelphia");

    expect(doBoxesOverlap(bostonLabel, newYorkLabel)).toBe(false);
    expect(doBoxesOverlap(bostonLabel, philadelphiaLabel)).toBe(false);
    expect(doBoxesOverlap(newYorkLabel, philadelphiaLabel)).toBe(false);
  });

  it("renders venue results after selecting a venue", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Select venue Dallas/ }));

    expect(screen.getByRole("heading", { name: "Dallas" })).toBeInTheDocument();
    expect(getFirstMatchCard()).not.toHaveTextContent("Arlington, USA");
  });
});
