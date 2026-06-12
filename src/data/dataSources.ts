export type DataSourceReliability = "official" | "trustedSecondary" | "derived";

export type DataSourcePurpose =
  | "competition-format"
  | "groups"
  | "fixtures"
  | "venues"
  | "geo-coordinates"
  | "map-projection"
  | "derived-distance"
  | "rankings"
  | "team-history";

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
    id: "fourfourtwo-world-cup-2026-fixtures-group-stage",
    title: "World Cup 2026 fixtures in full: The complete schedule",
    publisher: "FourFourTwo",
    reliability: "trustedSecondary",
    purposes: ["fixtures", "groups", "venues"],
    url: "https://www.fourfourtwo.com/competition/world-cup-2026-fixtures-and-results",
    accessedOn: "2026-06-08",
    notes:
      "Used as the current structured import reference for all 72 group-stage fixtures while the official FIFA structured schedule URL is captured.",
  },
  {
    id: "wikipedia-2026-world-cup-knockout-stage",
    title: "2026 FIFA World Cup knockout stage",
    publisher: "Wikipedia",
    reliability: "trustedSecondary",
    purposes: ["fixtures", "competition-format", "venues"],
    url: "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage",
    accessedOn: "2026-06-08",
    notes:
      "Used as the current structured import reference for Match 73-104 while direct FIFA match report URLs are captured.",
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
  {
    id: "fifa-coca-cola-ranking-2026-06-11",
    title: "FIFA/Coca-Cola Men's World Ranking",
    publisher: "FIFA",
    reliability: "official",
    purposes: ["rankings"],
    url: "https://inside.fifa.com/fifa-world-ranking/men",
    accessedOn: "2026-06-12",
    notes:
      "Official ranking page used to verify that the latest men's ranking was updated on 2026-06-11.",
  },
  {
    id: "sofascore-fifa-rankings-2026-06-11",
    title: "FIFA Football rankings 2026",
    publisher: "Sofascore",
    reliability: "trustedSecondary",
    purposes: ["rankings"],
    url: "https://www.sofascore.com/football/rankings/fifa",
    accessedOn: "2026-06-12",
    notes:
      "Used for the structured country-by-country ranking values after confirming the update date against FIFA.",
  },
  {
    id: "fifa-world-cup-2022-results",
    title: "FIFA World Cup Qatar 2022 results",
    publisher: "FIFA",
    reliability: "official",
    purposes: ["team-history"],
    url: "https://www.fifa.com/",
    accessedOn: "2026-06-12",
    notes:
      "Used for previous World Cup result labels such as champions, group stage, and did not qualify.",
  },
] as const satisfies readonly DataSourceRecord[];
