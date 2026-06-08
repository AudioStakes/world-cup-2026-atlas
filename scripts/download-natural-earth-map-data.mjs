import { writeFile } from "node:fs/promises";
import path from "node:path";

const countriesUrl =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const lakesUrl =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson";

const targetCountryCodes = new Set(["CAN", "USA", "MEX"]);
const targetLakeNames = new Set([
  "Lake Superior",
  "Lake Michigan",
  "Lake Huron",
  "Lake Erie",
  "Lake Ontario",
]);

const mapBounds = {
  west: -132,
  east: -64,
  north: 60,
  south: 14,
};

async function main() {
  const [countriesGeoJson, lakesGeoJson] = await Promise.all([
    fetchGeoJson(countriesUrl),
    fetchGeoJson(lakesUrl),
  ]);

  const countryFeatures = countriesGeoJson.features
    .filter((feature) => targetCountryCodes.has(getCountryCode(feature)))
    .map((feature) => createMapFeature(feature, "land"))
    .filter(Boolean);

  const lakeFeatures = lakesGeoJson.features
    .filter((feature) => targetLakeNames.has(feature.properties?.name))
    .map((feature) => createMapFeature(feature, "water"))
    .filter(Boolean);

  const output = createTypeScriptOutput([...countryFeatures, ...lakeFeatures]);

  await writeFile(path.join("src", "data", "northAmericaMapData.ts"), output);
  console.log(
    `Downloaded Natural Earth map data: ${countryFeatures.length} countries, ${lakeFeatures.length} lakes`,
  );
}

async function fetchGeoJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function getCountryCode(feature) {
  return feature.properties?.ADM0_A3 ?? feature.properties?.ISO_A3 ?? feature.properties?.adm0_a3;
}

function createMapFeature(feature, kind) {
  const geometry = filterGeometryToMapBounds(feature.geometry);

  if (!geometry) {
    return null;
  }

  const idSource =
    kind === "land" ? getCountryCode(feature).toLowerCase() : kebabCase(feature.properties?.name);
  const name = kind === "land" ? feature.properties?.ADMIN : feature.properties?.name;

  return {
    id: `natural-earth-${idSource}`,
    name,
    kind,
    source: "natural-earth-vector",
    geometry,
  };
}

function filterGeometryToMapBounds(geometry) {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    const rings = filterRingsToMapBounds(geometry.coordinates);
    return rings.length > 0 ? { type: "Polygon", coordinates: rings } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates
      .map((polygon) => filterRingsToMapBounds(polygon))
      .filter((polygon) => polygon.length > 0);

    return polygons.length > 0 ? { type: "MultiPolygon", coordinates: polygons } : null;
  }

  return null;
}

function filterRingsToMapBounds(rings) {
  return rings
    .filter((ring) => ring.length >= 4)
    .filter((ring) => ringIntersectsMapBounds(ring))
    .map((ring) => ring.map(roundCoordinatePair));
}

function ringIntersectsMapBounds(ring) {
  const longitudes = ring.map(([longitude]) => longitude);
  const latitudes = ring.map(([, latitude]) => latitude);
  const ringBounds = {
    west: Math.min(...longitudes),
    east: Math.max(...longitudes),
    south: Math.min(...latitudes),
    north: Math.max(...latitudes),
  };

  return (
    ringBounds.east >= mapBounds.west &&
    ringBounds.west <= mapBounds.east &&
    ringBounds.north >= mapBounds.south &&
    ringBounds.south <= mapBounds.north
  );
}

function roundCoordinatePair([longitude, latitude]) {
  return [roundCoordinate(longitude), roundCoordinate(latitude)];
}

function roundCoordinate(value) {
  return Math.round(value * 1000000) / 1000000;
}

function kebabCase(value) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createTypeScriptOutput(features) {
  return `export type NaturalEarthCoordinate = readonly [number, number];

export type NaturalEarthPolygonCoordinates = readonly (readonly NaturalEarthCoordinate[])[];

export type NaturalEarthMultiPolygonCoordinates = readonly NaturalEarthPolygonCoordinates[];

export type NaturalEarthGeometry =
  | {
      readonly type: "Polygon";
      readonly coordinates: NaturalEarthPolygonCoordinates;
    }
  | {
      readonly type: "MultiPolygon";
      readonly coordinates: NaturalEarthMultiPolygonCoordinates;
    };

export type NaturalEarthMapFeature = {
  readonly id: string;
  readonly name: string;
  readonly kind: "land" | "water";
  readonly source: "natural-earth-vector";
  readonly geometry: NaturalEarthGeometry;
};

export const northAmericaMapBounds = ${JSON.stringify(mapBounds, null, 2)} as const;

export const northAmericaMapSource = {
  name: "Natural Earth",
  countryUrl: "${countriesUrl}",
  lakeUrl: "${lakesUrl}",
  license: "public-domain",
  generatedBy: "scripts/download-natural-earth-map-data.mjs",
} as const;

export const northAmericaMapFeatures = ${JSON.stringify(features, null, 2)} as const satisfies readonly NaturalEarthMapFeature[];
`;
}

await main();
