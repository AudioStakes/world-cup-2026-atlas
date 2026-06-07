import { groupCode, slotId } from "../domain/ids";
import type { Group } from "../domain/types";

export const groups = [
  {
    code: groupCode("A"),
    name: "Group A",
    slots: [slotId("A1"), slotId("A2"), slotId("A3"), slotId("A4")],
  },
  {
    code: groupCode("B"),
    name: "Group B",
    slots: [slotId("B1"), slotId("B2"), slotId("B3"), slotId("B4")],
  },
  {
    code: groupCode("C"),
    name: "Group C",
    slots: [slotId("C1"), slotId("C2"), slotId("C3"), slotId("C4")],
  },
  {
    code: groupCode("D"),
    name: "Group D",
    slots: [slotId("D1"), slotId("D2"), slotId("D3"), slotId("D4")],
  },
  {
    code: groupCode("E"),
    name: "Group E",
    slots: [slotId("E1"), slotId("E2"), slotId("E3"), slotId("E4")],
  },
  {
    code: groupCode("F"),
    name: "Group F",
    slots: [slotId("F1"), slotId("F2"), slotId("F3"), slotId("F4")],
  },
  {
    code: groupCode("G"),
    name: "Group G",
    slots: [slotId("G1"), slotId("G2"), slotId("G3"), slotId("G4")],
  },
  {
    code: groupCode("H"),
    name: "Group H",
    slots: [slotId("H1"), slotId("H2"), slotId("H3"), slotId("H4")],
  },
  {
    code: groupCode("I"),
    name: "Group I",
    slots: [slotId("I1"), slotId("I2"), slotId("I3"), slotId("I4")],
  },
  {
    code: groupCode("J"),
    name: "Group J",
    slots: [slotId("J1"), slotId("J2"), slotId("J3"), slotId("J4")],
  },
  {
    code: groupCode("K"),
    name: "Group K",
    slots: [slotId("K1"), slotId("K2"), slotId("K3"), slotId("K4")],
  },
  {
    code: groupCode("L"),
    name: "Group L",
    slots: [slotId("L1"), slotId("L2"), slotId("L3"), slotId("L4")],
  },
] as const satisfies readonly Group[];
