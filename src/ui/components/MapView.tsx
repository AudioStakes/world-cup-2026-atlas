import { EXPLORER_MAP_VIEWBOX } from "../../features/explorer/mapViewport";
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
          aria-label="Stylized North America map with match venues"
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

      <path
        class="country-shape canada-shape"
        d="M508 272 C572 188 694 151 818 166 C948 181 1064 220 1160 294 C1252 365 1300 443 1286 509 C1266 605 1146 642 1018 622 C888 601 793 566 682 600 C592 628 499 605 474 520 C449 436 456 341 508 272 Z"
      />
      <path
        class="country-shape usa-shape"
        d="M505 522 C590 485 711 470 832 493 C936 512 1024 552 1124 541 C1206 531 1273 543 1292 592 C1312 645 1244 696 1134 713 C1026 730 929 708 836 688 C745 668 662 713 580 682 C513 657 472 585 505 522 Z"
      />
      <path
        class="country-shape mexico-shape"
        d="M690 712 C756 681 836 699 890 750 C943 800 966 884 924 946 C885 1004 803 1006 744 956 C690 911 650 791 690 712 Z"
      />

      <path
        class="coastline-detail west-coast"
        d="M550 292 C524 357 515 426 514 500 C514 560 534 622 581 682"
      />
      <path
        class="coastline-detail east-coast"
        d="M1160 294 C1218 352 1254 420 1246 484 C1239 544 1205 595 1160 640 C1126 675 1116 697 1134 713"
      />
      <path
        class="coastline-detail gulf-coast"
        d="M835 688 C882 720 943 742 1006 727 C1056 716 1103 699 1134 713"
      />
      <path class="coastline-detail mexico-west" d="M690 712 C710 758 714 836 744 956" />

      <path class="map-border-line" d="M610 555 C705 518 822 522 915 571" />
      <path class="map-border-line" d="M860 798 C881 829 902 875 924 946" />

      <path
        class="map-lake"
        d="M1074 448 C1102 428 1145 432 1161 459 C1138 474 1094 475 1074 448 Z"
      />
      <path
        class="map-lake"
        d="M1121 486 C1144 474 1176 483 1185 507 C1158 514 1133 507 1121 486 Z"
      />

      <text class="country-label canada-label" x="700" y="310">
        CANADA
      </text>
      <text class="country-label usa-label" x="760" y="600">
        UNITED STATES
      </text>
      <text class="country-label mexico-label" x="770" y="900">
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
      title={`${venue.venueName} — ${venue.stadiumName}`}
      aria-label={`Select venue ${venue.venueName}`}
      onClick={() => onAction({ type: "selectVenue", venueId: venue.venueId })}
    >
      <span class="venue-marker__dot" aria-hidden="true" />
      <span class="venue-marker__label">{venue.label}</span>
    </button>
  );
}
