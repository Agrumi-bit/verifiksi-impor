/**
 * Working days (Monday–Friday) from one calendar day to another: the start day is not counted, the
 * end day is — "13 Mar → 17 Mar 2026" is Mon 16 + Tue 17 = 2. Saturdays and Sundays never count;
 * public holidays are not known here and do count. Null when either day is missing or end < start.
 */
export function workingDaysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return null;
  const day = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  let count = 0;
  while (day < last) {
    day.setUTCDate(day.getUTCDate() + 1);
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}
