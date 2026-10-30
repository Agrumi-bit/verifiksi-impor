const DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const DATE_TIME = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Formats a date, or shows the raw text when it isn't a valid date (Intl throws on Invalid Date). */
function safeFormat(format: Intl.DateTimeFormat, raw: string, date: Date): string {
  return Number.isNaN(date.getTime()) ? raw : format.format(date);
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? safeFormat(DATE, iso, new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? safeFormat(DATE_TIME, iso, new Date(iso)).replace(".", ":") : "—";
}

/** A calendar date (YYYY-MM-DD, e.g. LHVIU tanggal terbit) — formatted without a timezone shift. */
export function formatCalendarDate(day: string | null | undefined): string {
  if (!day) return "—";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? safeFormat(DATE, day, new Date(`${day}T00:00:00+07:00`)) : day;
}
