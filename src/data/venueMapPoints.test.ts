import { describe, expect, it } from "vitest";
import { EXPLORER_MAP_VIEWBOX, isInsideExplorerMapViewBox } from "../features/explorer/mapViewport";
import { appData } from "./appData";

describe("venue map points", () => {
  it("keeps every venue marker inside the explorer map viewBox", () => {
    for (const venue of appData.venues) {
      expect(
        isInsideExplorerMapViewBox(venue.mapPoint),
        `${venue.name} should be inside the explorer map viewBox`,
      ).toBe(true);
    }
  });

  it("keeps every venue marker in the visible marker layer percentage range", () => {
    for (const venue of appData.venues) {
      const left =
        ((venue.mapPoint.x - EXPLORER_MAP_VIEWBOX.minX) / EXPLORER_MAP_VIEWBOX.width) * 100;
      const top =
        ((venue.mapPoint.y - EXPLORER_MAP_VIEWBOX.minY) / EXPLORER_MAP_VIEWBOX.height) * 100;

      expect(left, `${venue.name} left percentage`).toBeGreaterThanOrEqual(0);
      expect(left, `${venue.name} left percentage`).toBeLessThanOrEqual(100);
      expect(top, `${venue.name} top percentage`).toBeGreaterThanOrEqual(0);
      expect(top, `${venue.name} top percentage`).toBeLessThanOrEqual(100);
    }
  });
});
