import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { venueId } from "../../domain/ids";
import type { ExplorerMapViewModel } from "../../features/explorer/types";
import { MapView } from "./MapView";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

const mapViewModel: ExplorerMapViewModel = {
  backgroundFeatures: [],
  routes: [
    {
      kind: "groupStage",
      fromVenueId: venueId("dallas"),
      toVenueId: venueId("houston"),
      from: { x: 760, y: 720 },
      to: { x: 810, y: 760 },
      distanceKm: 360,
      distanceLabel: "360 km",
      showDistanceLabel: true,
    },
  ],
  venueMarkers: [
    {
      venueId: venueId("dallas"),
      venueName: "Dallas",
      stadiumName: "AT&T Stadium",
      cityLabel: "Arlington, USA",
      timeZoneLabel: "CT",
      matchCount: 2,
      label: "Dallas",
      tooltipLabel: "Dallas — AT&T Stadium, Arlington, USA · CT",
      ariaLabel: "Select venue Dallas, AT&T Stadium, Arlington, USA, CT",
      position: { x: 760, y: 720 },
      state: "highlighted",
    },
    {
      venueId: venueId("houston"),
      venueName: "Houston",
      stadiumName: "NRG Stadium",
      cityLabel: "Houston, USA",
      timeZoneLabel: "CT",
      matchCount: 0,
      label: "Houston",
      tooltipLabel: "Houston — NRG Stadium, Houston, USA · CT",
      ariaLabel: "Select venue Houston, NRG Stadium, Houston, USA, CT",
      position: { x: 810, y: 760 },
      state: "normal",
    },
  ],
};

function getExpandedMapSvg() {
  const svg = document.querySelector(".map-panel.is-map-expanded .map-svg");

  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("Expected expanded map SVG to render");
  }

  return svg;
}

function getExpandedMapCanvas() {
  const canvas = document.querySelector(".map-panel.is-map-expanded .map-canvas");

  if (!(canvas instanceof HTMLElement)) {
    throw new Error("Expected expanded map canvas to render");
  }

  return canvas;
}

function dispatchTouchEvent(
  target: HTMLElement,
  type: "touchend" | "touchmove" | "touchstart",
  touches: readonly Pick<Touch, "clientX" | "clientY">[],
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touchList = {
    length: touches.length,
    item(index: number) {
      return touches[index] ?? null;
    },
  };

  Object.defineProperties(event, {
    changedTouches: { value: touchList },
    targetTouches: { value: type === "touchend" ? { ...touchList, length: 0 } : touchList },
    touches: { value: type === "touchend" ? { ...touchList, length: 0 } : touchList },
  });
  target.dispatchEvent(event);
}

describe("MapView", () => {
  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function getMapRect() {
      if (this.classList.contains("map-canvas")) {
        return new DOMRect(0, 0, 400, 300);
      }

      return originalGetBoundingClientRect.call(this);
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    vi.restoreAllMocks();
  });

  it("opens the mobile map as a focus-managed dialog and closes with Escape", async () => {
    render(<MapView map={mapViewModel} onAction={() => {}} />);

    const openButton = screen.getByRole("button", { name: "Open map" });

    fireEvent.click(openButton);

    expect(screen.getByRole("dialog", { name: "Interactive map" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByRole("region", { name: "Map preview" })).toBeInTheDocument();
    await waitFor(() => {
      expect(openButton).toHaveFocus();
    });
  });

  it("announces marker state meaning and selects the clicked venue", () => {
    const onAction = vi.fn();

    render(<MapView map={mapViewModel} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Open map" }));
    fireEvent.click(screen.getByRole("button", { name: /Venue with match/ }));

    expect(screen.getByRole("button", { name: /Other venue/ })).toBeInTheDocument();
    expect(onAction).toHaveBeenCalledWith({ type: "selectVenue", venueId: venueId("dallas") });
  });

  it("zooms and pans the expanded map with wheel and mouse gestures", async () => {
    render(<MapView map={mapViewModel} onAction={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Open map" }));

    const svg = getExpandedMapSvg();
    const canvas = getExpandedMapCanvas();
    const initialViewBox = svg.getAttribute("viewBox");

    fireEvent.wheel(canvas, { deltaY: -400 });

    await waitFor(() => {
      expect(svg.getAttribute("viewBox")).not.toBe(initialViewBox);
    });

    const zoomedViewBox = svg.getAttribute("viewBox");

    fireEvent.mouseDown(canvas, { button: 0, clientX: 220, clientY: 180 });
    fireEvent.mouseMove(window, { clientX: 160, clientY: 140 });
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(svg.getAttribute("viewBox")).not.toBe(zoomedViewBox);
    });
  });

  it("zooms and pans the expanded map with touch gestures", async () => {
    render(<MapView map={mapViewModel} onAction={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Open map" }));

    const svg = getExpandedMapSvg();
    const canvas = getExpandedMapCanvas();
    const initialViewBox = svg.getAttribute("viewBox");

    dispatchTouchEvent(canvas, "touchstart", [
      { clientX: 180, clientY: 180 },
      { clientX: 220, clientY: 220 },
    ]);
    dispatchTouchEvent(canvas, "touchmove", [
      { clientX: 120, clientY: 120 },
      { clientX: 280, clientY: 280 },
    ]);
    dispatchTouchEvent(canvas, "touchend", []);

    await waitFor(() => {
      expect(svg.getAttribute("viewBox")).not.toBe(initialViewBox);
    });

    const zoomedViewBox = svg.getAttribute("viewBox");

    dispatchTouchEvent(canvas, "touchstart", [{ clientX: 220, clientY: 200 }]);
    dispatchTouchEvent(canvas, "touchmove", [{ clientX: 150, clientY: 170 }]);
    dispatchTouchEvent(canvas, "touchend", []);

    await waitFor(() => {
      expect(svg.getAttribute("viewBox")).not.toBe(zoomedViewBox);
    });
  });
});
