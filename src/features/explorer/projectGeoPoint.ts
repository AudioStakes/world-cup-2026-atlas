import type { GeoPoint, MapPoint } from "../../domain/types";
import { EXPLORER_MAP_VIEWBOX } from "./mapViewport";

export type GeoBounds = {
  readonly west: number;
  readonly east: number;
  readonly north: number;
  readonly south: number;
};

const defaultPadding = {
  x: 58,
  y: 58,
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

export function createSvgPathFromGeoPoints(points: readonly GeoPoint[], bounds: GeoBounds): string {
  return points
    .map((point, index) => {
      const projectedPoint = projectGeoPointToExplorerMap(point, bounds);
      return `${index === 0 ? "M" : "L"}${projectedPoint.x} ${projectedPoint.y}`;
    })
    .join(" ");
}

function roundMapCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
