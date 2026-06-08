import { describe, expect, it } from "vitest";
import { appData } from "../../data/appData";
import { venueId } from "../../domain/ids";
import { createIndexes } from "../../indexes/createIndexes";
import { createMapViewModel } from "./createMapViewModel";
import { emptyExplorerViewState } from "./types";

const indexes = createIndexes(appData);

function createMap() {
  return createMapViewModel(appData, indexes, emptyExplorerViewState, appData.matches);
}

describe("createMapViewModel venue marker metadata", () => {
  it("adds production venue metadata to map markers", () => {
    const map = createMap();
    const dallas = map.venueMarkers.find((venue) => venue.venueId === venueId("dallas"));

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
    const map = createMap();
    const newYork = map.venueMarkers.find(
      (venue) => venue.venueId === venueId("new-york-new-jersey"),
    );

    expect(newYork?.label).toBe("New York");
    expect(newYork?.tooltipLabel).toBe(
      "New York / New Jersey — MetLife Stadium, East Rutherford, USA · ET",
    );
  });
});
