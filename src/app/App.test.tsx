import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countryId, matchId } from "../domain/ids";
import {
  EXPLORER_MAP_DISPLAY_VIEWBOX,
  EXPLORER_MAP_VIEWBOX,
} from "../features/explorer/mapViewport";
import type { MatchResultsSnapshot } from "../matchResults/types";
import { App } from "./App";

const originalDateTimeFormatResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

function selectJapan() {
  fireEvent.click(screen.getByRole("button", { name: "Select Japan" }));
}

function mockBrowserTimeZone(timeZone: string | null) {
  const resolvedOptions = originalDateTimeFormatResolvedOptions.call(new Intl.DateTimeFormat());

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...resolvedOptions,
    timeZone: timeZone ?? undefined,
  } as Intl.ResolvedDateTimeFormatOptions);
}

function getFirstMatchCard() {
  const matchCard = document.querySelector(".match-card");

  if (!matchCard) {
    throw new Error("Expected match card to render");
  }

  return matchCard as HTMLElement;
}

function mockResultsSnapshotFetch(snapshot: MatchResultsSnapshot) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(snapshot)),
  );
}

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });
}

function getFirstMatchVenueButton() {
  const venueButton = within(getFirstMatchCard()).getByRole("button", {
    name: "Select match venue Mexico City",
  });

  return venueButton;
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
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 5, 11, 9).getTime());
    mockBrowserTimeZone(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, { status: 404 })),
    );
  });

  afterEach(() => {
    MockResizeObserver.reset();
    vi.unstubAllGlobals();
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

  it("renders the default explorer state from the production local tournament date", () => {
    render(<App />);

    expect(screen.getByText("World Cup 2026 Atlas")).toBeInTheDocument();
    expect(screen.queryByText("/?date=2026-06-11")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select Thu Jun 11/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
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

  it("keeps the active selection when the same selected control is clicked again", () => {
    render(<App />);

    selectJapan();
    selectJapan();

    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.location.search).toBe("?country=jpn");
    expect(screen.queryByText("Start exploring")).not.toBeInTheDocument();
  });

  it("keeps the default date selected when the active default date is clicked again", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Select Thu Jun 11/ }));

    expect(screen.getByRole("button", { name: /Select Thu Jun 11/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.location.search).toBe("");
    expect(screen.queryByText("Start exploring")).not.toBeInTheDocument();
  });

  it("keeps only the last clicked filter in the browser URL", () => {
    render(<App />);

    selectJapan();
    expect(window.location.search).toBe("?country=jpn");

    fireEvent.click(screen.getByRole("button", { name: /Select Sun Jun 14/ }));

    expect(window.location.search).toBe("?date=2026-06-14");
  });

  it("restores the previous explicit selection from browser history", async () => {
    render(<App />);

    selectJapan();
    fireEvent.click(screen.getByRole("button", { name: /Select Sun Jun 14/ }));
    window.history.back();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    });
    expect(window.location.search).toBe("?country=jpn");
  });

  it("does not show raw URL state or clear actions in the header", () => {
    render(<App />);

    selectJapan();

    expect(window.location.search).toBe("?country=jpn");
    expect(screen.queryByText("/?country=jpn")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("does not render an explorer search form", () => {
    render(<App />);

    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Search team or city" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });

  it("keeps countries selectable from the groups table", () => {
    render(<App />);

    const groupsSection = screen.getByRole("region", { name: "Group and Tournament" });

    expect(within(groupsSection).getByRole("tab", { name: "Group" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(groupsSection).getByRole("tab", { name: "Tournament" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(within(groupsSection).getByRole("button", { name: "Select Group A" })).toHaveTextContent(
      "A",
    );
    expect(within(groupsSection).queryByText("Group A")).not.toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select South Africa" }),
    ).toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select Korea Republic" }),
    ).toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select Czechia" }),
    ).toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select Canada" }),
    ).toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select Bosnia and Herzegovina" }),
    ).toBeInTheDocument();
    expect(within(groupsSection).getByRole("button", { name: "Select Qatar" })).toBeInTheDocument();
    expect(
      within(groupsSection).getByRole("button", { name: "Select Switzerland" }),
    ).toBeInTheDocument();
    expect(within(groupsSection).getByRole("button", { name: "Select Japan" })).toBeInTheDocument();
    expect(within(groupsSection).getByText("JPN")).toBeInTheDocument();
    expect(within(groupsSection).queryByText("JPN · AFC")).not.toBeInTheDocument();
  });

  it("switches the group panel to tournament rounds", () => {
    render(<App />);

    const groupsSection = screen.getByRole("region", { name: "Group and Tournament" });
    fireEvent.click(within(groupsSection).getByRole("tab", { name: "Tournament" }));

    expect(within(groupsSection).getByRole("tab", { name: "Tournament" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(groupsSection).getByRole("heading", { name: "Round of 32" })).toBeInTheDocument();
    expect(within(groupsSection).getByText("Match 73")).toBeInTheDocument();
    expect(
      within(groupsSection).getByText("Runner-up Group A vs Runner-up Group B"),
    ).toBeInTheDocument();
    expect(
      within(groupsSection).queryByRole("button", { name: "Select Japan" }),
    ).not.toBeInTheDocument();
  });

  it("omits redundant panel headings from the visible explorer controls", () => {
    render(<App />);

    expect(screen.queryByText("Explore")).not.toBeInTheDocument();
    expect(screen.queryByText("Dates")).not.toBeInTheDocument();
    expect(screen.queryByText("Groups & Teams")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Date" })).toHaveClass("visually-hidden");
    expect(screen.getByRole("region", { name: "Date" })).toBeInTheDocument();
  });

  it("keeps date chips visually compact while preserving date selection", () => {
    render(<App />);

    const dateButton = screen.getByRole("button", { name: /Select Sun Jun 14/ });
    const restDateButton = screen.getByRole("button", { name: /Select Wed Jul 08.*Rest day/ });
    fireEvent.click(dateButton);

    expect(dateButton).toHaveAttribute("aria-pressed", "true");
    expect(dateButton).toHaveTextContent("14");
    expect(dateButton).not.toHaveTextContent("Sun");
    expect(dateButton).not.toHaveTextContent("Jun");
    expect(dateButton).not.toHaveTextContent(/matches/);
    expect(restDateButton).toHaveTextContent("Rest");
  });

  it("renders match cards as FIFA-style fixture rows", () => {
    render(<App />);

    const matchCard = getFirstMatchCard();
    const matchScope = within(matchCard);

    expect(screen.getByText("Thursday 11 June 2026")).toBeInTheDocument();
    expect(matchScope.getByText("Mexico")).toBeInTheDocument();
    expect(matchScope.getByText("13:00")).toBeInTheDocument();
    expect(matchScope.getByText("South Africa")).toBeInTheDocument();
    expect(matchCard.querySelector(".match-card__meta-line")).toHaveTextContent(
      "First Stage·Group A·Estadio Azteca (Mexico City)",
    );
    expect(matchScope.getByText("🇲🇽 Mexico vs 🇿🇦 South Africa")).toHaveClass("visually-hidden");
    expect(matchScope.queryByText(/Estadio Azteca · Mexico City, Mexico/)).not.toBeInTheDocument();
  });

  it("renders runtime match results from the Worker snapshot when available", async () => {
    mockResultsSnapshotFetch({
      schemaVersion: 1,
      provider: "api-football",
      fetchedAt: "2026-06-11T21:00:00.000Z",
      matches: [
        {
          matchId: matchId("match-001"),
          provider: "api-football",
          providerFixtureId: 1001,
          status: "finished",
          shortStatus: "FT",
          elapsed: 90,
          homeTeamId: countryId("mex"),
          awayTeamId: countryId("rsa"),
          homeScore: 2,
          awayScore: 0,
          kickoffAt: "2026-06-11T19:00:00.000Z",
          updatedAt: "2026-06-11T21:00:00.000Z",
        },
      ],
    });

    render(<App />);

    await waitFor(() => {
      expect(within(getFirstMatchCard()).getByText("FT")).toBeInTheDocument();
    });
    expect(within(getFirstMatchCard()).getByText("2")).toBeInTheDocument();
    expect(within(getFirstMatchCard()).getByText("0")).toBeInTheDocument();
    expect(within(getFirstMatchCard()).queryByText("13:00")).not.toBeInTheDocument();
  });

  it("changes match card times when a header country time zone is selected", () => {
    render(<App />);

    const timeZoneSelect = screen.getByRole("combobox", { name: "Match times" });
    expect(timeZoneSelect).toHaveValue("venue-local");

    fireEvent.change(timeZoneSelect, { target: { value: "jpn" } });

    const matchScope = within(getFirstMatchCard());
    expect(timeZoneSelect).toHaveValue("jpn");
    expect(screen.getByText("Japan · JST")).toBeInTheDocument();
    expect(matchScope.getByText("04:00")).toBeInTheDocument();
    expect(matchScope.queryByText("13:00")).not.toBeInTheDocument();
  });

  it("defaults match card times to the browser local time zone when available", () => {
    mockBrowserTimeZone("Asia/Tokyo");
    render(<App />);

    const timeZoneSelect = screen.getByRole("combobox", { name: "Match times" });
    const matchScope = within(getFirstMatchCard());

    expect(timeZoneSelect).toHaveValue("browser-local");
    expect(screen.getByText("Your local time · JST")).toBeInTheDocument();
    expect(matchScope.getByText("04:00")).toBeInTheDocument();
    expect(matchScope.queryByText("13:00")).not.toBeInTheDocument();
  });

  it("highlights the matching venue marker when a match venue control is hovered or focused", () => {
    render(<App />);

    const venueButton = getFirstMatchVenueButton();

    fireEvent.mouseEnter(venueButton);
    expect(document.querySelectorAll(".venue-marker.is-highlighted")).toHaveLength(1);
    expect(document.querySelector(".venue-marker.is-highlighted")).toHaveAttribute(
      "data-venue-id",
      "mexico-city",
    );

    fireEvent.mouseLeave(venueButton);
    fireEvent.focus(venueButton);
    expect(document.querySelectorAll(".venue-marker.is-highlighted")).toHaveLength(1);
    expect(document.querySelector(".venue-marker.is-highlighted")).toHaveAttribute(
      "data-venue-id",
      "mexico-city",
    );
  });

  it("does not select a venue from the match card background", () => {
    render(<App />);

    fireEvent.click(getFirstMatchCard());

    expect(screen.queryByRole("heading", { name: "Mexico City" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("selects a match venue, country, and group from explicit match card controls", () => {
    render(<App />);

    fireEvent.click(
      within(getFirstMatchCard()).getByRole("button", { name: "Select country Mexico" }),
    );

    expect(screen.getByRole("heading", { name: "Mexico" })).toBeInTheDocument();
    expect(window.location.search).toBe("?country=mex");

    fireEvent.click(
      within(getFirstMatchCard()).getByRole("button", { name: "Select group Group A" }),
    );

    expect(screen.getByRole("heading", { name: "Group A" })).toBeInTheDocument();
    expect(window.location.search).toBe("?group=A");

    fireEvent.click(getFirstMatchVenueButton());

    expect(screen.getByRole("heading", { name: "Mexico City" })).toBeInTheDocument();
    expect(window.location.search).toBe("?venue=mexico-city");
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
    expect(getVenueControl("dallas")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders country route legs in fixture order", () => {
    render(<App />);

    selectJapan();

    expect(screen.getByRole("list", { name: "Route legs by fixture date" })).toBeInTheDocument();
    expect(screen.getByText("Dallas → Monterrey")).toBeInTheDocument();
    expect(screen.getByText("Monterrey → Dallas")).toBeInTheDocument();
  });
});
