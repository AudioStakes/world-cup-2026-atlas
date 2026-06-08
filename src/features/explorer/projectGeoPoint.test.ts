import { describe, expect, it } from "vitest";
import {
  type NaturalEarthMapFeature,
  northAmericaMapBounds,
  northAmericaMapFeatures,
} from "../../data/northAmericaMapData";
import { createSvgPathsFromGeoGeometry, projectGeoPointToExplorerMap } from "./projectGeoPoint";

function getRequiredMapFeature(featureId: string): NaturalEarthMapFeature {
  const feature = northAmericaMapFeatures.find((candidate) => candidate.id === featureId);

  if (!feature) {
    throw new Error(`Missing map feature: ${featureId}`);
  }

  return feature;
}

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

  it("creates SVG paths from downloaded Natural Earth geometry", () => {
    const usa = getRequiredMapFeature("natural-earth-usa");

    expect(
      createSvgPathsFromGeoGeometry(usa.geometry, northAmericaMapBounds).length,
    ).toBeGreaterThan(0);
  });
});
