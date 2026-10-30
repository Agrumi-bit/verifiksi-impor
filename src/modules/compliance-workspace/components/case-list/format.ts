const DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const DATE_TIME = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDate(iso: string | null | undefined): string {
  return iso ? DATE.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? DATE_TIME.format(new Date(iso)).replace(".", ":") : "—";
}

/** LHVIU tanggal terbit is a calendar date (YYYY-MM-DD) — formatted without a timezone shift. */
export function formatCalendarDate(day: string | null | undefined): string {
  return day ? DATE.format(new Date(`${day}T00:00:00+07:00`)) : "—";
}
