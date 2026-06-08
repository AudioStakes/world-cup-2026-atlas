import { northAmericaMapBounds, northAmericaMapFeatures } from "../../data/northAmericaMapData";
import { EXPLORER_MAP_VIEWBOX } from "../../features/explorer/mapViewport";
import { createSvgPathsFromGeoGeometry } from "../../features/explorer/projectGeoPoint";
import type {
  ExplorerAction,
  ExplorerMapViewModel,
  VenueMarkerViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";

type MapViewProps = {
  readonly map: ExplorerMapViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function MapView({ map, onAction }: MapViewProps) {
  const viewBox = EXPLORER_MAP_VIEWBOX;

  return (
    <section class="map-panel" aria-label="North America venue map">
      <div class="map-canvas">
        <svg
          class="map-svg"
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          role="img"
          aria-label="Natural Earth map of North America with World Cup 2026 match venues"
        >
          <title>World Cup 2026 host venues across North America</title>
          <defs>
            <marker
              id="route-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path class="map-route-arrow" d="M0 0 L10 5 L0 10 Z" />
            </marker>
            <marker
              id="route-arrow-knockout"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path class="map-route-arrow is-knockout" d="M0 0 L10 5 L0 10 Z" />
            </marker>
          </defs>
          <MapBackground />
          {map.routes.map((route) => (
            <g key={`${route.fromVenueId}-${route.toVenueId}`} class="map-route-group">
              <line
                class={classNames("map-route-line", route.kind === "knockout" && "is-knockout")}
                x1={route.from.x}
                y1={route.from.y}
                x2={route.to.x}
                y2={route.to.y}
                marker-end={
                  route.kind === "knockout" ? "url(#route-arrow-knockout)" : "url(#route-arrow)"
                }
              />
              {route.showDistanceLabel ? (
                <g class="map-route-label-group">
                  <rect
                    class="map-route-label-bg"
                    x={(route.from.x + route.to.x) / 2 - 42}
                    y={(route.from.y + route.to.y) / 2 - 29}
                    width="84"
                    height="24"
                    rx="12"
                  />
                  <text
                    class="map-route-label"
                    x={(route.from.x + route.to.x) / 2}
                    y={(route.from.y + route.to.y) / 2 - 12}
                    text-anchor="middle"
                  >
                    {route.distanceLabel}
                  </text>
                </g>
              ) : null}
            </g>
          ))}
        </svg>
        <div class="venue-marker-layer">
          {map.venueMarkers.map((venue) => (
            <VenueMarker key={venue.venueId} venue={venue} onAction={onAction} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MapBackground() {
  return (
    <g class="map-background">
      <rect class="map-frame" x="440" y="120" width="900" height="910" rx="42" />
      {northAmericaMapFeatures.flatMap((feature) =>
        createSvgPathsFromGeoGeometry(feature.geometry, northAmericaMapBounds).map(
          (pathData, pathIndex) => (
            <path
              key={`${feature.id}-${pathIndex}`}
              class={classNames(
                feature.kind === "land" && "country-shape",
                feature.id === "natural-earth-can" && "canada-shape",
                feature.id === "natural-earth-usa" && "usa-shape",
                feature.id === "natural-earth-mex" && "mexico-shape",
                feature.kind === "water" && "map-lake",
              )}
              d={pathData}
            />
          ),
        ),
      )}

      <text class="country-label canada-label" x="705" y="335">
        CANADA
      </text>
      <text class="country-label usa-label" x="760" y="630">
        UNITED STATES
      </text>
      <text class="country-label mexico-label" x="795" y="910">
        MEXICO
      </text>
    </g>
  );
}

type VenueMarkerProps = {
  readonly venue: VenueMarkerViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

function VenueMarker({ venue, onAction }: VenueMarkerProps) {
  const viewBox = EXPLORER_MAP_VIEWBOX;
  const left = ((venue.position.x - viewBox.minX) / viewBox.width) * 100;
  const top = ((venue.position.y - viewBox.minY) / viewBox.height) * 100;

  return (
    <button
      class={classNames("venue-marker", `is-${venue.state}`)}
      type="button"
      style={{ left: `${left}%`, top: `${top}%` }}
      data-venue-id={venue.venueId}
      title={venue.tooltipLabel}
      aria-label={venue.ariaLabel}
      onClick={() => onAction({ type: "selectVenue", venueId: venue.venueId })}
    >
      <span class="venue-marker__dot" aria-hidden="true" />
      <span class="venue-marker__label">{venue.label}</span>
    </button>
  );
}
