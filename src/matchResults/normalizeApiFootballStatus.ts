import type { MatchStatus } from "../domain/types";

export function normalizeApiFootballStatus(short: string): MatchStatus {
  switch (short) {
    case "TBD":
    case "NS":
      return "scheduled";

    case "1H":
    case "HT":
    case "2H":
    case "ET":
    case "BT":
    case "P":
    case "LIVE":
      return "live";

    case "FT":
    case "AET":
    case "PEN":
      return "finished";

    case "PST":
      return "postponed";

    case "CANC":
      return "cancelled";

    case "SUSP":
    case "INT":
      return "suspended";

    case "ABD":
    case "AWD":
    case "WO":
      return "abandoned";

    default:
      return "unknown";
  }
}
