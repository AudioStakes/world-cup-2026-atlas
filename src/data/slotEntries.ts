import { countryId, groupCode, slotId } from "../domain/ids";
import type { GroupSlotIndex, SlotEntry } from "../domain/types";

const groupAssignments = [
  ["A", ["mex", "rsa", "kor", "cze"]],
  ["B", ["can", "qat", "ita", "sui"]],
  ["C", ["bra", "mar", "hon", "sco"]],
  ["D", ["usa", "par", "aus", "tur"]],
  ["E", ["ger", "civ", "ecu", "crc"]],
  ["F", ["ned", "jpn", "swe", "tun"]],
  ["G", ["bel", "egy", "irn", "nzl"]],
  ["H", ["esp", "cpv", "ksa", "uru"]],
  ["I", ["fra", "sen", "alg", "aut"]],
  ["J", ["arg", "jor", "cro", "gha"]],
  ["K", ["por", "uzb", "jam", "col"]],
  ["L", ["eng", "pan", "pol", "chn"]],
] as const;

export const slotEntries = groupAssignments.flatMap(([group, countries]) =>
  countries.map((country, index) =>
    createSlotEntry({
      group,
      country,
      slotIndex: (index + 1) as GroupSlotIndex,
    }),
  ),
) satisfies readonly SlotEntry[];

type CreateSlotEntryParams = {
  readonly group: string;
  readonly country: string;
  readonly slotIndex: GroupSlotIndex;
};

function createSlotEntry({ group, country, slotIndex }: CreateSlotEntryParams): SlotEntry {
  return {
    slotId: slotId(`${group}${slotIndex}`),
    groupCode: groupCode(group),
    slotIndex,
    countryId: countryId(country),
    dataStatus: "provisional",
  };
}
