import { describe, expect, it } from "vitest";
import { northAmericaMapBounds, northAmericaMapPolygons } from "../../data/northAmericaMapData";
import { projectGeoPointToExplorerMap } from "./projectGeoPoint";

describe("projectGeoPointToExplorerMap", () => {
  it("projects western longitudes left of eastern longitudes", () => {
    const seattle = projectGeoPointToExplorerMap(
      { latitude: 47.5952, longitude: -122.3316 },
      northAmericaMapBounds,
    );
    const newYork = projectGeoPointToExplorerMap(
      { latitude: 40.8135, longitude: -74.0745 },
      northAmericaMapBounds,
    );

    expect(seattle.x).toBeLessThan(newYork.x);
  });

  it("projects northern latitudes above southern latitudes", () => {
    const vancouver = projectGeoPointToExplorerMap(
      { latitude: 49.2768, longitude: -123.1119 },
      northAmericaMapBounds,
    );
    const mexicoCity = projectGeoPointToExplorerMap(
      { latitude: 19.3029, longitude: -99.1505 },
      northAmericaMapBounds,
    );

    expect(vancouver.y).toBeLessThan(mexicoCity.y);
  });

  it("keeps map data as real geographic coordinates before projection", () => {
    const usa = northAmericaMapPolygons.find((polygon) => polygon.id === "united-states-mainland");

    expect(usa?.points[0]).toEqual({ latitude: 48.9, longitude: -124.7 });
  });
});
