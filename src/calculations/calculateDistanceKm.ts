import type { GeoPoint } from "../domain/types";

const EARTH_RADIUS_KM = 6371;

export function calculateDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const fromLatitudeRad = toRadians(from.latitude);
  const toLatitudeRad = toRadians(to.latitude);
  const deltaLatitudeRad = toRadians(to.latitude - from.latitude);
  const deltaLongitudeRad = toRadians(to.longitude - from.longitude);

  const haversine =
    Math.sin(deltaLatitudeRad / 2) ** 2 +
    Math.cos(fromLatitudeRad) * Math.cos(toLatitudeRad) * Math.sin(deltaLongitudeRad / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(EARTH_RADIUS_KM * centralAngle);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
