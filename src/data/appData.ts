import type { AppData } from "../domain/types";
import { countries } from "./countries";
import { groups } from "./groups";
import { matches } from "./matches";
import { slotEntries } from "./slotEntries";
import { venues } from "./venues";

export const appData = {
  countries,
  groups,
  slotEntries,
  venues,
  matches,
} as const satisfies AppData;
