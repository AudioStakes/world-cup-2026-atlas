import { northAmericaMapBounds, northAmericaMapFeatures } from "../../data/northAmericaMapData";
import {
  EXPLORER_MAP_DISPLAY_VIEWBOX,
  type ExplorerMapViewBox,
} from "../../features/explorer/mapViewport";
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
  const viewBox = EXPLORER_MAP_DISPLAY_VIEWBOX;
  const venueLabelLayouts = createVenueLabelLayouts(map.venueMarkers, viewBox);

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
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path class="map-route-arrow" d="M0 0 L6 3 L0 6 Z" />
            </marker>
            <marker
              id="route-arrow-knockout"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path class="map-route-arrow is-knockout" d="M0 0 L6 3 L0 6 Z" />
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
          <g class="venue-marker-layer" aria-label="Venue markers">
            {map.venueMarkers.map((venue, index) => (
              <VenueMarker
                key={venue.venueId}
                labelLayout={venueLabelLayouts[index]}
                venue={venue}
              />
            ))}
          </g>
        </svg>
        <div class="venue-marker-control-layer">
          {map.venueMarkers.map((venue) => (
            <VenueMarkerControl
              key={venue.venueId}
              venue={venue}
              viewBox={viewBox}
              onAction={onAction}
            />
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
  readonly labelLayout: VenueLabelLayout | undefined;
  readonly venue: VenueMarkerViewModel;
};

function VenueMarker({ labelLayout, venue }: VenueMarkerProps) {
  return (
    <g class={classNames("venue-marker", `is-${venue.state}`)} data-venue-id={venue.venueId}>
      <g
        class="venue-marker__map-label"
        transform={`translate(${labelLayout?.x ?? venue.position.x} ${
          labelLayout?.y ?? venue.position.y
        })`}
      >
        <rect class="venue-marker__label-bg" width={labelLayout?.width ?? 76} height="24" rx="10" />
        <text
          class="venue-marker__label-text"
          x={(labelLayout?.width ?? 76) / 2}
          text-anchor="middle"
        >
          <tspan x={(labelLayout?.width ?? 76) / 2} y="16">
            {venue.label}
          </tspan>
        </text>
      </g>
    </g>
  );
}

type VenueMarkerControlProps = {
  readonly venue: VenueMarkerViewModel;
  readonly viewBox: ExplorerMapViewBox;
  readonly onAction: (action: ExplorerAction) => void;
};

function VenueMarkerControl({ venue, viewBox, onAction }: VenueMarkerControlProps) {
  function selectVenue() {
    onAction({ type: "selectVenue", venueId: venue.venueId });
  }

  return (
    <button
      class={classNames("venue-marker-control", `is-${venue.state}`)}
      type="button"
      data-venue-id={venue.venueId}
      title={venue.tooltipLabel}
      aria-label={venue.ariaLabel}
      style={{
        left: `${toMapPercent(venue.position.x, viewBox.minX, viewBox.width)}%`,
        top: `${toMapPercent(venue.position.y, viewBox.minY, viewBox.height)}%`,
      }}
      onClick={selectVenue}
    >
      <span class="venue-marker-control__dot" aria-hidden="true" />
    </button>
  );
}

function toMapPercent(value: number, min: number, size: number): number {
  return ((value - min) / size) * 100;
}

type VenueLabelLayout = {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
};

const venueLabelHeight = 24;
const venueLabelGap = 5;
const venueLabelInset = 8;

function createVenueLabelLayouts(
  venues: readonly VenueMarkerViewModel[],
  viewBox: ExplorerMapViewBox,
): readonly VenueLabelLayout[] {
  const layouts = venues.map((venue, index) => ({
    index,
    layout: createInitialVenueLabelLayout(venue, viewBox),
  }));
  const orderedLayouts = layouts
    .slice()
    .sort(
      (left, right) =>
        left.layout.y - right.layout.y ||
        left.layout.x - right.layout.x ||
        left.index - right.index,
    );
  const placedLayouts: VenueLabelLayout[] = [];

  for (const item of orderedLayouts) {
    let layout = item.layout;

    for (const placedLayout of placedLayouts) {
      if (doVenueLabelsOverlap(layout, placedLayout)) {
        layout = {
          ...layout,
          y: placedLayout.y + placedLayout.height + venueLabelGap,
        };
      }
    }

    placedLayouts.push(layout);
    item.layout = layout;
  }

  return layouts.map(({ layout }) => layout);
}

function createInitialVenueLabelLayout(
  venue: VenueMarkerViewModel,
  viewBox: ExplorerMapViewBox,
): VenueLabelLayout {
  const labelWidth = Math.min(136, Math.max(76, venue.label.length * 8 + 24));
  const preferredY = venue.position.y - venueLabelHeight - 10;
  const fallbackY = venue.position.y + 18;

  return {
    height: venueLabelHeight,
    width: labelWidth,
    x: clampMapLabelX(venue.position.x - labelWidth / 2, labelWidth, viewBox),
    y:
      preferredY > viewBox.minY + venueLabelInset
        ? preferredY
        : Math.min(fallbackY, viewBox.minY + viewBox.height - venueLabelHeight - venueLabelInset),
  };
}

function doVenueLabelsOverlap(left: VenueLabelLayout, right: VenueLabelLayout): boolean {
  return (
    left.x < right.x + right.width + venueLabelGap &&
    left.x + left.width + venueLabelGap > right.x &&
    left.y < right.y + right.height + venueLabelGap &&
    left.y + left.height + venueLabelGap > right.y
  );
}

function clampMapLabelX(x: number, labelWidth: number, viewBox: ExplorerMapViewBox): number {
  const minX = viewBox.minX + venueLabelInset;
  const maxX = viewBox.minX + viewBox.width - labelWidth - venueLabelInset;

  return Math.min(Math.max(x, minX), maxX);
}
