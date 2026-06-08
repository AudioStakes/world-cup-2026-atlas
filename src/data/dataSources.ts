export type DataSourceReliability = "official" | "trustedSecondary" | "derived";

export type DataSourcePurpose =
  | "competition-format"
  | "groups"
  | "fixtures"
  | "venues"
  | "geo-coordinates"
  | "map-projection"
  | "derived-distance";

export type DataSourceRecord = {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly reliability: DataSourceReliability;
  readonly purposes: readonly DataSourcePurpose[];
  readonly url: string;
  readonly accessedOn: string;
  readonly notes: string;
};

export const dataSourcePolicy = {
  officialReliability: "official",
  trustedSecondaryReliability: "trustedSecondary",
  derivedReliability: "derived",
  productionDataRules: [
    "Use official sources for fixtures, groups, venues, and tournament format whenever available.",
    "Use trusted secondary sources only as a temporary cross-check or while official structured data is unavailable.",
    "Keep derived values, such as distances and projected map coordinates, out of source data whenever possible.",
    "Do not mark dataStatus as official unless the exact value has been verified against an official source.",
    "When a source cannot be represented as structured data yet, document it here before changing app data.",
  ],
} as const;

export const dataSources = [
  {
    id: "fifa-world-cup-26-match-schedule",
    title: "FIFA World Cup 26 match schedule",
    publisher: "FIFA",
    reliability: "official",
    purposes: ["fixtures", "venues", "competition-format"],
    url: "https://www.fifa.com/",
    accessedOn: "2026-06-08",
    notes:
      "Primary source target for match dates, venues, kick-off times, match numbers, and knockout structure. Use the exact official schedule page or PDF URL once it is captured in the data import notes.",
  },
  {
    id: "fifa-world-cup-26-groups",
    title: "FIFA World Cup 26 groups",
    publisher: "FIFA",
    reliability: "official",
    purposes: ["groups", "competition-format"],
    url: "https://www.fifa.com/",
    accessedOn: "2026-06-08",
    notes:
      "Primary source target for group composition and draw positions. Use the exact official group page or downloadable fixture source once it is captured in the data import notes.",
  },
  {
    id: "venue-stadium-official-pages",
    title: "Official venue and stadium references",
    publisher: "FIFA / Host city / Stadium operators",
    reliability: "official",
    purposes: ["venues", "geo-coordinates"],
    url: "https://www.fifa.com/",
    accessedOn: "2026-06-08",
    notes:
      "Use official venue records for stadium names and host city labels. Use stadium or trusted geocoding references for latitude and longitude, and keep those as verifiable inputs.",
  },
  {
    id: "natural-earth-admin-0",
    title: "Natural Earth Admin 0 countries",
    publisher: "Natural Earth",
    reliability: "trustedSecondary",
    purposes: ["map-projection"],
    url: "https://www.naturalearthdata.com/",
    accessedOn: "2026-06-08",
    notes:
      "Candidate source for Canada, United States, and Mexico boundaries when replacing the schematic SVG map with a real projected map.",
  },
] as const satisfies readonly DataSourceRecord[];
