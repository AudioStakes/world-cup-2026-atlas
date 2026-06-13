import type { Country } from "../../domain/types";
import {
  createHeaderTimeZoneOptions,
  resolveDisplayTimeZonePreference,
  venueLocalDisplayTimeZoneId,
} from "./displayTimeZone";
import type { ExplorerHeaderViewModel } from "./types";

export function createHeaderViewModel(
  countries: readonly Country[],
  displayTimeZoneId = venueLocalDisplayTimeZoneId,
): ExplorerHeaderViewModel {
  const displayTimeZone = resolveDisplayTimeZonePreference(countries, displayTimeZoneId);

  return {
    title: "World Cup 2026 Atlas",
    subtitle: "Explore teams, venues, dates, and routes across North America.",
    timeZoneSelector: {
      label: "Match times",
      selectedValue: displayTimeZone.id,
      selectedSummary: displayTimeZone.summaryLabel,
      options: createHeaderTimeZoneOptions(countries),
    },
  };
}
