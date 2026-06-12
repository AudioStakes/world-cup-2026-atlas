import { type LocalDateString, localDate } from "../../domain/ids";

export const FIRST_TOURNAMENT_DATE = localDate("2026-06-11");
export const LAST_TOURNAMENT_DATE = localDate("2026-07-19");

export function createTournamentDates(): readonly LocalDateString[] {
  const dates: LocalDateString[] = [];
  const cursor = new Date(`${FIRST_TOURNAMENT_DATE}T00:00:00Z`);
  const end = new Date(`${LAST_TOURNAMENT_DATE}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(localDate(cursor.toISOString().slice(0, 10)));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function getDefaultTournamentDate(today = getLocalToday()): LocalDateString {
  if (today >= FIRST_TOURNAMENT_DATE && today <= LAST_TOURNAMENT_DATE) {
    return today;
  }

  return FIRST_TOURNAMENT_DATE;
}

function getLocalToday(): LocalDateString {
  const now = new Date(Date.now());
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return localDate(`${year}-${month}-${day}`);
}
