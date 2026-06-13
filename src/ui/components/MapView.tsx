import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { VenueId } from "../../domain/ids";
import {
  EXPLORER_MAP_DISPLAY_VIEWBOX,
  type ExplorerMapViewBox,
} from "../../features/explorer/mapViewport";
import type {
  ExplorerAction,
  ExplorerMapBackgroundFeatureViewModel,
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
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const venueMarkersRef = useRef(map.venueMarkers);
  const schedulePositionUpdateRef = useRef<(() => void) | null>(null);
  const [venueControlPositions, setVenueControlPositions] = useState<
    Readonly<Record<string, VenueControlPosition>>
  >({});

  venueMarkersRef.current = map.venueMarkers;

  useLayoutEffect(() => {
    schedulePositionUpdateRef.current?.();
  }, [map.venueMarkers]);

  useLayoutEffect(() => {
    const mapCanvas = mapCanvasRef.current;
    const mapSvg = mapSvgRef.current;

    if (!mapCanvas || !mapSvg) {
      return;
    }

    let frame = 0;
    const updateVenueControlPositions = () => {
      frame = 0;
      const nextPositions = createVenueControlPositions(
        mapSvg,
        mapCanvas.getBoundingClientRect(),
        venueMarkersRef.current,
      );

      setVenueControlPositions(nextPositions);
    };
    const schedulePositionUpdate = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateVenueControlPositions);
    };

    schedulePositionUpdateRef.current = schedulePositionUpdate;
    schedulePositionUpdate();

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedulePositionUpdate);
    resizeObserver?.observe(mapCanvas);
    resizeObserver?.observe(mapSvg);

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("orientationchange", schedulePositionUpdate);
    window.visualViewport?.addEventListener("resize", schedulePositionUpdate);

    return () => {
      schedulePositionUpdateRef.current = null;

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("orientationchange", schedulePositionUpdate);
      window.visualViewport?.removeEventListener("resize", schedulePositionUpdate);
    };
  }, []);

  return (
    <section class="map-panel">
      <div ref={mapCanvasRef} class="map-canvas">
        <svg
          ref={mapSvgRef}
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
          <MapBackground features={map.backgroundFeatures} />
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
              positions={venueControlPositions}
              position={venueControlPositions[venue.venueId]}
              venue={venue}
              onAction={onAction}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type MapBackgroundProps = {
  readonly features: readonly ExplorerMapBackgroundFeatureViewModel[];
};

function MapBackground({ features }: MapBackgroundProps) {
  return (
    <g class="map-background">
      <rect class="map-frame" x="440" y="120" width="900" height="910" rx="42" />
      {features.map((feature) => (
        <path key={feature.id} class={feature.className} d={feature.pathData} />
      ))}

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
      <circle
        class="venue-marker__anchor"
        data-venue-anchor-id={venue.venueId}
        cx={venue.position.x}
        cy={venue.position.y}
        r="1"
      />
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
  readonly positions: Readonly<Record<string, VenueControlPosition>>;
  readonly position: VenueControlPosition | undefined;
  readonly venue: VenueMarkerViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

function VenueMarkerControl({ positions, position, venue, onAction }: VenueMarkerControlProps) {
  function selectVenue(event: MouseEvent) {
    const nearestVenueId = findNearestVenueId(event, positions) ?? venue.venueId;

    onAction({ type: "selectVenue", venueId: nearestVenueId });
  }

  return (
    <button
      class={classNames("venue-marker-control", `is-${venue.state}`)}
      type="button"
      data-venue-id={venue.venueId}
      title={venue.tooltipLabel}
      aria-label={venue.ariaLabel}
      aria-pressed={venue.state === "selected"}
      style={{
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
      }}
      onClick={selectVenue}
    >
      <span class="venue-marker-control__dot" aria-hidden="true" />
    </button>
  );
}

type VenueControlPosition = {
  readonly left: number;
  readonly top: number;
  readonly venueId: VenueId;
};

function findNearestVenueId(
  event: MouseEvent,
  positions: Readonly<Record<string, VenueControlPosition>>,
) {
  if (event.detail === 0 || event.clientX === 0 || event.clientY === 0) {
    return null;
  }

  const layer = (event.currentTarget as HTMLElement).parentElement;
  const layerRect = layer?.getBoundingClientRect();

  if (!layerRect) {
    return null;
  }

  const clickPosition = {
    left: event.clientX - layerRect.left,
    top: event.clientY - layerRect.top,
  };

  return Object.values(positions).reduce<{
    readonly distance: number;
    readonly venueId: VenueId;
  } | null>((closest, position) => {
    const distance = Math.hypot(
      position.left - clickPosition.left,
      position.top - clickPosition.top,
    );

    if (closest && closest.distance <= distance) {
      return closest;
    }

    return { distance, venueId: position.venueId };
  }, null)?.venueId;
}

function createVenueControlPositions(
  svg: SVGSVGElement,
  containerRect: DOMRect,
  venues: readonly VenueMarkerViewModel[],
): Readonly<Record<string, VenueControlPosition>> {
  if (typeof svg.getScreenCTM !== "function" || typeof svg.createSVGPoint !== "function") {
    return {};
  }

  const screenMatrix = svg.getScreenCTM();

  if (!screenMatrix) {
    return {};
  }

  return Object.fromEntries(
    venues.map((venue) => {
      const point = svg.createSVGPoint();
      point.x = venue.position.x;
      point.y = venue.position.y;

      const screenPoint = point.matrixTransform(screenMatrix);

      return [
        venue.venueId,
        {
          left: screenPoint.x - containerRect.left,
          top: screenPoint.y - containerRect.top,
          venueId: venue.venueId,
        },
      ];
    }),
  );
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
