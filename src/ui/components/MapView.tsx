import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
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
import { trapFocusWithin } from "./focusTrap";

type MapViewProps = {
  readonly map: ExplorerMapViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function MapView({ map, onAction }: MapViewProps) {
  const viewBox = EXPLORER_MAP_DISPLAY_VIEWBOX;
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapViewport, setMapViewport] = useState<MapViewportState>(defaultMapViewportState);
  const isExpandedRef = useRef(isExpanded);
  const mapViewportRef = useRef(mapViewport);
  const venueLabelLayouts = createVenueLabelLayouts(map.venueMarkers, viewBox);
  const mapPanelRef = useRef<HTMLElement | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRectRef = useRef<DOMRectReadOnly | null>(null);
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const openMapButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeMapButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<MapDragState | null>(null);
  const pinchStateRef = useRef<MapPinchState | null>(null);
  const shouldReturnFocusRef = useRef(false);
  const venueMarkersRef = useRef(map.venueMarkers);
  const schedulePositionUpdateRef = useRef<(() => void) | null>(null);
  const [venueControlPositions, setVenueControlPositions] = useState<
    Readonly<Record<string, VenueControlPosition>>
  >({});
  const currentViewBox = createCurrentMapViewBox(viewBox, mapViewport);
  const activeVenues = map.venueMarkers.filter(
    (venue) => venue.state === "selected" || venue.state === "highlighted",
  );
  const selectedVenue =
    map.venueMarkers.find((venue) => venue.state === "selected") ?? activeVenues[0] ?? null;
  const activeVenueCountLabel =
    activeVenues.length > 0
      ? `${activeVenues.length} ${activeVenues.length === 1 ? "venue" : "venues"}`
      : "All venues";
  const mapPanelAccessibilityProps = isExpanded
    ? ({ "aria-labelledby": "map-expanded-title", "aria-modal": "true", role: "dialog" } as const)
    : ({ "aria-label": "Map preview", role: "region" } as const);

  isExpandedRef.current = isExpanded;
  mapViewportRef.current = mapViewport;
  venueMarkersRef.current = map.venueMarkers;

  useLayoutEffect(() => {
    schedulePositionUpdateRef.current?.();
  }, [map.venueMarkers, mapViewport]);

  useLayoutEffect(() => {
    if (isExpanded) {
      refreshMapCanvasRect();
      closeMapButtonRef.current?.focus();
      return;
    }

    if (shouldReturnFocusRef.current) {
      shouldReturnFocusRef.current = false;
      openMapButtonRef.current?.focus();
    }
  }, [isExpanded]);

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

  const openExpandedMap = () => {
    setIsExpanded(true);
  };

  const closeExpandedMap = () => {
    dragStateRef.current = null;
    pinchStateRef.current = null;
    shouldReturnFocusRef.current = true;
    setMapViewport(defaultMapViewportState);
    setIsExpanded(false);
  };

  const refreshMapCanvasRect = () => {
    const mapCanvas = mapCanvasRef.current;

    mapCanvasRectRef.current = mapCanvas?.getBoundingClientRect() ?? null;

    return mapCanvasRectRef.current;
  };

  const handleMapWheel = (event: WheelEvent) => {
    if (!isExpandedRef.current) {
      return;
    }

    event.preventDefault();
    const nextScale = mapViewportRef.current.scale * (event.deltaY < 0 ? 1.14 : 0.88);
    setMapViewport((previousViewport) => zoomMapViewport(viewBox, previousViewport, nextScale));
  };

  const handleMapMouseDown = (event: MouseEvent) => {
    if (
      !isExpandedRef.current ||
      event.button !== 0 ||
      dragStateRef.current ||
      isVenueMarkerInteraction(event.target)
    ) {
      return;
    }

    dragStateRef.current = {
      pointerId: mouseDragPointerId,
      x: event.clientX,
      y: event.clientY,
    };
    refreshMapCanvasRect();
  };

  const handleMapMouseMove = (event: MouseEvent) => {
    if (dragStateRef.current?.pointerId !== mouseDragPointerId) {
      return;
    }

    panMapFromClientDelta(event);
  };

  const handleMapMouseUp = () => {
    if (dragStateRef.current?.pointerId === mouseDragPointerId) {
      dragStateRef.current = null;
    }
  };

  const handleMapTouchStart = (event: TouchEvent) => {
    if (!isExpandedRef.current) {
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches.item(0);

      if (!touch || isVenueMarkerInteraction(event.target)) {
        return;
      }

      dragStateRef.current = {
        pointerId: touchDragPointerId,
        x: touch.clientX,
        y: touch.clientY,
      };
      refreshMapCanvasRect();
      return;
    }

    if (event.touches.length !== 2) {
      return;
    }

    dragStateRef.current = null;
    refreshMapCanvasRect();
    pinchStateRef.current = {
      distance: getTouchDistance(event.touches),
      scale: mapViewportRef.current.scale,
    };
  };

  const handleMapTouchMove = (event: TouchEvent) => {
    const pinchState = pinchStateRef.current;

    if (
      isExpandedRef.current &&
      event.touches.length === 1 &&
      dragStateRef.current?.pointerId === touchDragPointerId
    ) {
      const touch = event.touches.item(0);

      if (!touch) {
        return;
      }

      event.preventDefault();
      panMapFromClientDelta(touch);
      return;
    }

    if (!isExpandedRef.current || !pinchState || event.touches.length !== 2) {
      return;
    }

    event.preventDefault();
    const nextScale = pinchState.scale * (getTouchDistance(event.touches) / pinchState.distance);
    setMapViewport((previousViewport) => zoomMapViewport(viewBox, previousViewport, nextScale));
  };

  const handleMapTouchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0 && dragStateRef.current?.pointerId === touchDragPointerId) {
      dragStateRef.current = null;
    }

    if (event.touches.length < 2) {
      pinchStateRef.current = null;
    }
  };

  const panMapFromClientDelta = (point: Pick<MouseEvent | Touch, "clientX" | "clientY">) => {
    const dragState = dragStateRef.current;
    const canvasRect = mapCanvasRectRef.current ?? refreshMapCanvasRect();

    if (!dragState || !canvasRect) {
      return;
    }

    const deltaX = point.clientX - dragState.x;
    const deltaY = point.clientY - dragState.y;

    dragStateRef.current = {
      ...dragState,
      x: point.clientX,
      y: point.clientY,
    };
    setMapViewport((previousViewport) =>
      panMapViewport(viewBox, previousViewport, deltaX, deltaY, canvasRect),
    );
  };

  useLayoutEffect(() => {
    const mapCanvas = mapCanvasRef.current;

    if (!mapCanvas) {
      return;
    }

    mapCanvas.addEventListener("mousedown", handleMapMouseDown);
    mapCanvas.addEventListener("touchend", handleMapTouchEnd);
    mapCanvas.addEventListener("touchmove", handleMapTouchMove, { passive: false });
    mapCanvas.addEventListener("touchstart", handleMapTouchStart, { passive: false });
    mapCanvas.addEventListener("wheel", handleMapWheel, { passive: false });
    window.addEventListener("mouseup", handleMapMouseUp);
    window.addEventListener("mousemove", handleMapMouseMove);

    return () => {
      mapCanvas.removeEventListener("mousedown", handleMapMouseDown);
      mapCanvas.removeEventListener("touchend", handleMapTouchEnd);
      mapCanvas.removeEventListener("touchmove", handleMapTouchMove);
      mapCanvas.removeEventListener("touchstart", handleMapTouchStart);
      mapCanvas.removeEventListener("wheel", handleMapWheel);
      window.removeEventListener("mouseup", handleMapMouseUp);
      window.removeEventListener("mousemove", handleMapMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleExpandedMapKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeExpandedMap();
        return;
      }

      const mapPanel = mapPanelRef.current;

      if (mapPanel) {
        trapFocusWithin(event, mapPanel);
      }
    };

    window.addEventListener("keydown", handleExpandedMapKeyDown);

    return () => {
      window.removeEventListener("keydown", handleExpandedMapKeyDown);
    };
  }, [isExpanded]);

  return (
    <section
      ref={mapPanelRef}
      id="map-panel"
      class={classNames("map-panel", isExpanded && "is-map-expanded")}
      {...mapPanelAccessibilityProps}
    >
      <div class="map-preview-summary">
        <div>
          <span>Map</span>
          <strong>{activeVenueCountLabel}</strong>
          <small>Venue markers, labels, and routes</small>
        </div>
        <button
          ref={openMapButtonRef}
          type="button"
          aria-controls="map-panel"
          aria-expanded={isExpanded}
          onClick={openExpandedMap}
        >
          Open map
        </button>
      </div>
      <div class="map-expanded-header">
        <div>
          <span id="map-expanded-title">Interactive map</span>
          <strong>{activeVenueCountLabel}</strong>
        </div>
        <button ref={closeMapButtonRef} type="button" onClick={closeExpandedMap}>
          Close
        </button>
      </div>
      <div ref={mapCanvasRef} class="map-canvas">
        <svg
          ref={mapSvgRef}
          class="map-svg"
          viewBox={`${currentViewBox.minX} ${currentViewBox.minY} ${currentViewBox.width} ${currentViewBox.height}`}
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
      <MapLegend />
      <MapVenueDetail venue={selectedVenue} venueCount={activeVenues.length} />
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

function MapLegend() {
  return (
    <ul class="map-legend" aria-label="Map marker legend">
      <li>
        <span class="map-legend__marker is-selected" aria-hidden="true" />
        Selected venue
      </li>
      <li>
        <span class="map-legend__marker is-highlighted" aria-hidden="true" />
        Venue with match
      </li>
      <li>
        <span class="map-legend__marker is-normal" aria-hidden="true" />
        Other venue
      </li>
    </ul>
  );
}

type MapVenueDetailProps = {
  readonly venue: VenueMarkerViewModel | null;
  readonly venueCount: number;
};

function MapVenueDetail({ venue, venueCount }: MapVenueDetailProps) {
  if (!venue) {
    return (
      <div class="map-venue-detail">
        <span>Venues</span>
        <strong>All host venues</strong>
        <small>Open the map, then pan, pinch zoom, or tap a marker.</small>
      </div>
    );
  }

  return (
    <div class="map-venue-detail">
      <span>{venue.state === "selected" ? "Selected venue" : "Venue with match"}</span>
      <strong>{venue.venueName}</strong>
      <small>
        {venue.stadiumName} · {venue.cityLabel} · {formatVenueMatchCount(venue.matchCount)}
        {venueCount > 1 ? ` · ${venueCount} venues in selection` : ""}
      </small>
    </div>
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
    event.stopPropagation();
    const nearestVenueId = findNearestVenueId(event, positions) ?? venue.venueId;

    onAction({ type: "selectVenue", venueId: nearestVenueId });
  }

  return (
    <button
      class={classNames("venue-marker-control", `is-${venue.state}`)}
      type="button"
      data-venue-id={venue.venueId}
      title={venue.tooltipLabel}
      aria-label={createVenueMarkerAriaLabel(venue)}
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

function createVenueMarkerAriaLabel(venue: VenueMarkerViewModel): string {
  return `${venue.ariaLabel}. ${createVenueMarkerStateLabel(venue)}. ${formatVenueMatchCount(
    venue.matchCount,
  )}.`;
}

function createVenueMarkerStateLabel(venue: VenueMarkerViewModel): string {
  switch (venue.state) {
    case "selected":
      return "Selected venue";
    case "highlighted":
      return "Venue with match";
    case "dimmed":
    case "normal":
      return "Other venue";
  }
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

type MapViewportState = {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
};

type MapDragState = {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
};

type MapPinchState = {
  readonly distance: number;
  readonly scale: number;
};

const defaultMapViewportState: MapViewportState = {
  scale: 1,
  x: 0,
  y: 0,
};

const minMapScale = 1;
const maxMapScale = 3.2;
const mouseDragPointerId = -1;
const touchDragPointerId = -2;

function createCurrentMapViewBox(
  viewBox: ExplorerMapViewBox,
  viewport: MapViewportState,
): ExplorerMapViewBox {
  const clampedViewport = clampMapViewport(viewBox, viewport);

  return {
    minX: viewBox.minX + clampedViewport.x,
    minY: viewBox.minY + clampedViewport.y,
    width: viewBox.width / clampedViewport.scale,
    height: viewBox.height / clampedViewport.scale,
  };
}

function zoomMapViewport(
  viewBox: ExplorerMapViewBox,
  viewport: MapViewportState,
  nextScale: number,
): MapViewportState {
  const scale = clamp(nextScale, minMapScale, maxMapScale);
  const currentWidth = viewBox.width / viewport.scale;
  const currentHeight = viewBox.height / viewport.scale;
  const centerX = viewport.x + currentWidth / 2;
  const centerY = viewport.y + currentHeight / 2;
  const nextWidth = viewBox.width / scale;
  const nextHeight = viewBox.height / scale;

  return clampMapViewport(viewBox, {
    scale,
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
  });
}

function panMapViewport(
  viewBox: ExplorerMapViewBox,
  viewport: MapViewportState,
  deltaX: number,
  deltaY: number,
  canvasRect: DOMRect,
): MapViewportState {
  if (canvasRect.width === 0 || canvasRect.height === 0) {
    return viewport;
  }

  const currentWidth = viewBox.width / viewport.scale;
  const currentHeight = viewBox.height / viewport.scale;

  return clampMapViewport(viewBox, {
    ...viewport,
    x: viewport.x - (deltaX / canvasRect.width) * currentWidth,
    y: viewport.y - (deltaY / canvasRect.height) * currentHeight,
  });
}

function clampMapViewport(
  viewBox: ExplorerMapViewBox,
  viewport: MapViewportState,
): MapViewportState {
  const scale = clamp(viewport.scale, minMapScale, maxMapScale);
  const maxX = viewBox.width - viewBox.width / scale;
  const maxY = viewBox.height - viewBox.height / scale;

  return {
    scale,
    x: clamp(viewport.x, 0, Math.max(0, maxX)),
    y: clamp(viewport.y, 0, Math.max(0, maxY)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touches: TouchList): number {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return 1;
  }

  return Math.hypot(
    firstTouch.clientX - secondTouch.clientX,
    firstTouch.clientY - secondTouch.clientY,
  );
}

function isVenueMarkerInteraction(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".venue-marker-control"));
}

function formatVenueMatchCount(matchCount: number): string {
  return `${matchCount} ${matchCount === 1 ? "match" : "matches"}`;
}
