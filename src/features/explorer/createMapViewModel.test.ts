import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { northAmericaMapBounds } from "../../data/northAmericaMapData";
import { countryId, venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createMapViewModel } from "./createMapViewModel";
import { projectGeoPointToExplorerMap } from "./projectGeoPoint";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createMap() {
  return createMapViewModel(appData, indexes, emptyExplorerViewState, appData.matches);
}

function getRequiredVenueMarker(venueKey: string) {
  const map = createMap();
  const marker = map.venueMarkers.find((venue) => venue.venueId === venueId(venueKey));

  if (!marker) {
    throw new Error(`Missing venue marker: ${venueKey}`);
  }

  return marker;
}

function getRequiredVenue(venueKey: string) {
  const venue = appData.venues.find((candidate) => candidate.id === venueId(venueKey));

  if (!venue) {
    throw new Error(`Missing venue: ${venueKey}`);
  }

  return venue;
}

describe("createMapViewModel venue marker metadata", () => {
  it("adds production venue metadata to map markers", () => {
    const dallas = getRequiredVenueMarker("dallas");

    expect(dallas).toMatchObject({
      venueName: "Dallas",
      stadiumName: "AT&T Stadium",
      cityLabel: "Arlington, USA",
      timeZoneLabel: "CT",
      tooltipLabel: "Dallas — AT&T Stadium, Arlington, USA · CT",
      ariaLabel: "Select venue Dallas, AT&T Stadium, Arlington, USA, CT",
    });
  });

  it("keeps compact map labels separate from production metadata", () => {
    const newYork = getRequiredVenueMarker("new-york-new-jersey");

    expect(newYork.label).toBe("New York");
    expect(newYork.tooltipLabel).toBe(
      "New York / New Jersey — MetLife Stadium, East Rutherford, USA · ET",
    );
  });

  it("projects venue marker positions from real venue geoPoints", () => {
    const dallasVenue = getRequiredVenue("dallas");
    const dallasMarker = getRequiredVenueMarker("dallas");

    expect(dallasMarker.position).toEqual(
      projectGeoPointToExplorerMap(dallasVenue.geoPoint, northAmericaMapBounds),
    );
    expect(dallasMarker.position).not.toEqual(dallasVenue.mapPoint);
  });

  it("keeps marker horizontal order aligned with real longitudes", () => {
    const seattle = getRequiredVenueMarker("seattle");
    const dallas = getRequiredVenueMarker("dallas");
    const newYork = getRequiredVenueMarker("new-york-new-jersey");

    expect(seattle.position.x).toBeLessThan(dallas.position.x);
    expect(dallas.position.x).toBeLessThan(newYork.position.x);
  });

  it("keeps marker vertical order aligned with real latitudes", () => {
    const vancouver = getRequiredVenueMarker("vancouver");
    const dallas = getRequiredVenueMarker("dallas");
    const mexicoCity = getRequiredVenueMarker("mexico-city");

    expect(vancouver.position.y).toBeLessThan(dallas.position.y);
    expect(dallas.position.y).toBeLessThan(mexicoCity.position.y);
  });

  it("projects country route endpoints from venue geoPoints", () => {
    const map = createMapViewModel(
      appData,
      indexes,
      { ...emptyExplorerViewState, selectedCountryId: countryId("mex") },
      appData.matches,
    );
    const firstRoute = map.routes[0];

    expect(firstRoute).toBeDefined();

    const fromVenue = appData.venues.find((venue) => venue.id === firstRoute?.fromVenueId);
    const toVenue = appData.venues.find((venue) => venue.id === firstRoute?.toVenueId);

    if (!fromVenue || !toVenue || !firstRoute) {
      throw new Error("Expected a complete projected route");
    }

    expect(firstRoute.from).toEqual(
      projectGeoPointToExplorerMap(fromVenue.geoPoint, northAmericaMapBounds),
    );
    expect(firstRoute.to).toEqual(
      projectGeoPointToExplorerMap(toVenue.geoPoint, northAmericaMapBounds),
    );
  });
});
