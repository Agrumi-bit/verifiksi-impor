/**
 * "Tanggal Penugasan" — the date Customer Relationship enters for an assignment
 * (`Assignment.scheduledDate`), never the moment the row was created (`createdAt`, shown only as
 * "Dicatat di sistem"). CR may record a past date (backdated assignment); that's valid.
 *
 * The date is a calendar date in Asia/Jakarta. It's stored as a DateTime (UTC midnight of the
 * picked day for rows created by the schedule form), so it must always be formatted in
 * Asia/Jakarta — formatting in the viewer's own zone, or slicing the ISO string, can shift it to
 * the previous day (26/2 shown as 25/2). Every display goes through these helpers.
 * Pure — safe for client and server.
 */

export const ASSIGNMENT_TIME_ZONE = "Asia/Jakarta";

type DateInput = string | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  // A bare "YYYY-MM-DD" is a calendar date already — anchor it at Jakarta midnight.
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "YYYY-MM-DD" of the date in Asia/Jakarta — for <input type="date">, calendars and grouping. */
export function assignmentDateKey(value: DateInput): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: ASSIGNMENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const STYLES: Record<"numeric" | "medium" | "full" | "long", Intl.DateTimeFormatOptions> = {
  numeric: { day: "numeric", month: "numeric", year: "numeric" }, // 26/2/2026
  medium: { day: "numeric", month: "short", year: "numeric" }, // 26 Feb 2026
  full: { day: "numeric", month: "long", year: "numeric" }, // 26 Februari 2026
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" }, // Kamis, 26 Februari 2026
};

/** Formats a Tanggal Penugasan (or any calendar date) in id-ID, Asia/Jakarta. "—" when empty. */
export function formatAssignmentDate(value: DateInput, style: keyof typeof STYLES = "medium"): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("id-ID", { ...STYLES[style], timeZone: ASSIGNMENT_TIME_ZONE });
}

/** "Dicatat di sistem" timestamp (createdAt) — date + time, id-ID, Asia/Jakarta. */
export function formatRecordedAt(value: DateInput): string {
  const date = toDate(value);
  if (!date) return "—";
  return `${date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: ASSIGNMENT_TIME_ZONE })}, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: ASSIGNMENT_TIME_ZONE })} WIB`;
}

/** The value stored for a picked "YYYY-MM-DD" (UTC midnight of that day — same as existing rows). */
export function assignmentDateFromInput(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Whole days the date lies before today (Asia/Jakarta); negative for future dates. */
export function daysBeforeToday(dateKey: string, now: Date = new Date()): number {
  const today = assignmentDateKey(now);
  if (!dateKey || !today) return 0;
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dateKey}T00:00:00Z`)) / 86_400_000);
}

/** CR may backdate an assignment; more than this many days back shows an info note (not an error). */
export const BACKDATE_NOTICE_DAYS = 30;
