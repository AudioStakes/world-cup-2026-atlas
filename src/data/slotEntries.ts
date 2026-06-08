import { countryId, groupCode, slotId } from "../domain/ids";
import type { GroupSlotIndex, SlotEntry } from "../domain/types";

const groupCompositionSourceNote = "fifa-world-cup-26-groups";

const groupAssignments = [
  ["A", ["mex", "rsa", "kor", "cze"]],
  ["B", ["can", "bos", "qat", "sui"]],
  ["C", ["bra", "mar", "hti", "sco"]],
  ["D", ["usa", "par", "aus", "tur"]],
  ["E", ["ger", "cuw", "civ", "ecu"]],
  ["F", ["ned", "jpn", "swe", "tun"]],
  ["G", ["bel", "egy", "irn", "nzl"]],
  ["H", ["esp", "cpv", "ksa", "uru"]],
  ["I", ["fra", "sen", "irq", "nor"]],
  ["J", ["arg", "alg", "aut", "jor"]],
  ["K", ["por", "cod", "uzb", "col"]],
  ["L", ["eng", "cro", "gha", "pan"]],
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
    sourceNote: groupCompositionSourceNote,
  };
}
