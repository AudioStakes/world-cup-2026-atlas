import { describe, expect, it } from "vitest";
import { northAmericaMapFeatures, northAmericaMapSource } from "./northAmericaMapData";

describe("Natural Earth North America map data", () => {
  it("uses downloaded Natural Earth map data as the map source", () => {
    expect(northAmericaMapSource.name).toBe("Natural Earth");
    expect(northAmericaMapSource.countryUrl).toContain("ne_110m_admin_0_countries.geojson");
    expect(northAmericaMapSource.lakeUrl).toContain("ne_110m_lakes.geojson");
  });

  it("includes the three World Cup 2026 host countries", () => {
    expect(northAmericaMapFeatures.map((feature) => feature.id)).toEqual(
      expect.arrayContaining(["natural-earth-can", "natural-earth-usa", "natural-earth-mex"]),
    );
  });

  it("includes Great Lakes water features from Natural Earth", () => {
    expect(northAmericaMapFeatures.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        "Lake Superior",
        "Lake Michigan",
        "Lake Huron",
        "Lake Erie",
        "Lake Ontario",
      ]),
    );
  });

  it("does not keep the old hand-authored abstract map feature ids", () => {
    expect(northAmericaMapFeatures.map((feature) => feature.id)).not.toEqual(
      expect.arrayContaining(["canada-mainland", "united-states-mainland", "mexico-mainland"]),
    );
  });
});
