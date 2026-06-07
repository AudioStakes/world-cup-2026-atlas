import type {
  ExplorerAction,
  ExplorerMapViewModel,
  VenueMarkerViewModel,
} from "../../features/explorer/types";
import { classNames } from "./classNames";

const VIEWBOX = {
  minX: 450,
  minY: 55,
  width: 920,
  height: 950,
} as const;

type MapViewProps = {
  readonly map: ExplorerMapViewModel;
  readonly onAction: (action: ExplorerAction) => void;
};

export function MapView({ map, onAction }: MapViewProps) {
  return (
    <section class="map-panel" aria-label="North America venue map">
      <div class="map-canvas">
        <svg
          class="map-svg"
          viewBox={`${VIEWBOX.minX} ${VIEWBOX.minY} ${VIEWBOX.width} ${VIEWBOX.height}`}
          role="img"
          aria-label="Stylized North America map with match venues"
        >
          <title>World Cup 2026 host venues across North America</title>
          <MapBackground />
          {map.routes.map((route) => (
            <g key={`${route.fromVenueId}-${route.toVenueId}`} class="map-route-group">
              <line
                class={classNames("map-route-line", route.kind === "knockout" && "is-knockout")}
                x1={route.from.x}
                y1={route.from.y}
                x2={route.to.x}
                y2={route.to.y}
              />
              {route.showDistanceLabel ? (
                <text
                  class="map-route-label"
                  x={(route.from.x + route.to.x) / 2}
                  y={(route.from.y + route.to.y) / 2 - 8}
                >
                  {route.distanceLabel}
                </text>
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
      <rect x="450" y="55" width="920" height="950" rx="44" />
      <path d="M528 265 C610 152 766 112 934 142 C1110 174 1238 302 1268 454 C1302 626 1208 766 1048 842 C882 922 664 890 562 744 C468 610 434 400 528 265 Z" />
      <path d="M721 783 C792 730 903 743 954 817 C1010 898 984 1004 904 1032 C820 1060 719 994 696 910 C684 866 691 815 721 783 Z" />
      <path d="M501 339 C604 309 750 321 861 389" />
      <path d="M830 426 C959 409 1120 439 1264 533" />
      <text x="650" y="206">
        CANADA
      </text>
      <text x="777" y="512">
        UNITED STATES
      </text>
      <text x="768" y="874">
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
  const left = ((venue.position.x - VIEWBOX.minX) / VIEWBOX.width) * 100;
  const top = ((venue.position.y - VIEWBOX.minY) / VIEWBOX.height) * 100;

  return (
    <button
      class={classNames("venue-marker", `is-${venue.state}`)}
      type="button"
      style={{ left: `${left}%`, top: `${top}%` }}
      title={`${venue.venueName} — ${venue.stadiumName}`}
      aria-label={`Select venue ${venue.venueName}`}
      onClick={() => onAction({ type: "selectVenue", venueId: venue.venueId })}
    >
      <span class="venue-marker__dot" aria-hidden="true" />
      <span class="venue-marker__label">{venue.label}</span>
    </button>
  );
}
