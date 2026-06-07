import type { CountryId, GroupCode, MatchId, SlotId, VenueId } from "../domain/ids";
import type { AppData, Country, Group, Match, SlotEntry, Venue } from "../domain/types";

export type Indexes = {
  readonly countriesById: ReadonlyMap<CountryId, Country>;
  readonly groupsByCode: ReadonlyMap<GroupCode, Group>;
  readonly slotEntriesBySlotId: ReadonlyMap<SlotId, SlotEntry>;
  readonly venuesById: ReadonlyMap<VenueId, Venue>;
  readonly matchesById: ReadonlyMap<MatchId, Match>;
  readonly matchesByCountryId: ReadonlyMap<CountryId, readonly Match[]>;
  readonly matchesByGroupCode: ReadonlyMap<GroupCode, readonly Match[]>;
  readonly matchesByVenueId: ReadonlyMap<VenueId, readonly Match[]>;
};

export function createIndexes(data: AppData): Indexes {
  const countriesById = createUniqueMap(data.countries, (country) => country.id, "country id");
  const groupsByCode = createUniqueMap(data.groups, (group) => group.code, "group code");
  const slotEntriesBySlotId = createUniqueMap(data.slotEntries, (slotEntry) => slotEntry.slotId, "slot id");
  const venuesById = createUniqueMap(data.venues, (venue) => venue.id, "venue id");
  const matchesById = createUniqueMap(data.matches, (match) => match.id, "match id");

  const matchesByCountryId = new Map<CountryId, Match[]>();
  const matchesByGroupCode = new Map<GroupCode, Match[]>();
  const matchesByVenueId = new Map<VenueId, Match[]>();

  for (const match of data.matches) {
    appendToMap(matchesByVenueId, match.venueId, match);

    if (match.groupCode) {
      appendToMap(matchesByGroupCode, match.groupCode, match);
    }

    if (match.homeCountryId) {
      appendToMap(matchesByCountryId, match.homeCountryId, match);
    }

    if (match.awayCountryId) {
      appendToMap(matchesByCountryId, match.awayCountryId, match);
    }
  }

  return {
    countriesById,
    groupsByCode,
    slotEntriesBySlotId,
    venuesById,
    matchesById,
    matchesByCountryId,
    matchesByGroupCode,
    matchesByVenueId,
  };
}

function createUniqueMap<TItem, TKey>(
  items: readonly TItem[],
  getKey: (item: TItem) => TKey,
  label: string,
): ReadonlyMap<TKey, TItem> {
  const map = new Map<TKey, TItem>();

  for (const item of items) {
    const key = getKey(item);
    if (map.has(key)) {
      throw new Error(`Duplicate ${label}: ${String(key)}`);
    }
    map.set(key, item);
  }

  return map;
}

function appendToMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }

  map.set(key, [value]);
}
