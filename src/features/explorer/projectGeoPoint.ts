import type { GeoPoint, MapPoint } from "../../domain/types";
import { EXPLORER_MAP_VIEWBOX } from "./mapViewport";

export type GeoBounds = {
  readonly west: number;
  readonly east: number;
  readonly north: number;
  readonly south: number;
};

type GeoJsonGeometry =
  | {
      readonly type: "Polygon";
      readonly coordinates: readonly (readonly (readonly [number, number])[])[];
    }
  | {
      readonly type: "MultiPolygon";
      readonly coordinates: readonly (readonly (readonly (readonly [number, number])[])[])[];
    };

const defaultPadding = {
  x: 48,
  y: 48,
} as const;

export function projectGeoPointToExplorerMap(
  point: GeoPoint,
  bounds: GeoBounds,
  padding: { readonly x: number; readonly y: number } = defaultPadding,
): MapPoint {
  const drawableWidth = EXPLORER_MAP_VIEWBOX.width - padding.x * 2;
  const drawableHeight = EXPLORER_MAP_VIEWBOX.height - padding.y * 2;
  const longitudeRatio = (point.longitude - bounds.west) / (bounds.east - bounds.west);
  const latitudeRatio = (bounds.north - point.latitude) / (bounds.north - bounds.south);

  return {
    x: roundMapCoordinate(EXPLORER_MAP_VIEWBOX.minX + padding.x + longitudeRatio * drawableWidth),
    y: roundMapCoordinate(EXPLORER_MAP_VIEWBOX.minY + padding.y + latitudeRatio * drawableHeight),
  };
}

export function createSvgPathsFromGeoGeometry(
  geometry: GeoJsonGeometry,
  bounds: GeoBounds,
): readonly string[] {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();

  return rings.map((ring) => createSvgPathFromGeoRing(ring, bounds));
}

function createSvgPathFromGeoRing(
  ring: readonly (readonly [number, number])[],
  bounds: GeoBounds,
): string {
  return `${ring
    .map(([longitude, latitude], index) => {
      const projectedPoint = projectGeoPointToExplorerMap({ latitude, longitude }, bounds);
      return `${index === 0 ? "M" : "L"}${projectedPoint.x} ${projectedPoint.y}`;
    })
    .join(" ")} Z`;
}

function roundMapCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
