import type { CountryId, LocalDateString } from "../../domain/ids";
import type { Country } from "../../domain/types";
import type { Indexes } from "../../indexes/createIndexes";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDateLabel(date: LocalDateString): string {
  const [, monthPart, dayPart] = date.split("-");
  const monthLabel = monthPart === "06" ? "Jun" : monthPart === "07" ? "Jul" : monthPart;
  return `${monthLabel} ${dayPart}`;
}

export function formatWeekdayDateLabel(date: LocalDateString): string {
  return `${weekdayLabels[getWeekdayIndex(date)]} ${formatDateLabel(date)}`;
}

export function formatDistanceLabel(distanceKm: number): string {
  return `${new Intl.NumberFormat("en-US").format(distanceKm)} km`;
}

export function getCountryLabel(indexes: Indexes, countryId: CountryId): string {
  const country = getRequiredCountry(indexes, countryId);
  return `${country.flagEmoji} ${country.shortName}`;
}

export function getRequiredCountry(indexes: Indexes, countryId: CountryId): Country {
  const country = indexes.countriesById.get(countryId);
  if (!country) {
    throw new Error(`Unknown country id: ${countryId}`);
  }
  return country;
}

function getWeekdayIndex(date: LocalDateString): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
