import { assignmentDateFromInput, assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";

/**
 * "Tanggal Pengajuan" — the date an application was submitted, CHOSEN by the user on the wizard's last
 * step (Admin and Company Workspace) rather than taken from the moment the row was created. It is a
 * calendar date: stored in the payload as "YYYY-MM-DD" and in `Application.submissionDate` as UTC
 * midnight of that day, and always displayed in Asia/Jakarta (see lib/assignment-date.ts).
 * `createdAt` stays as the system audit trail and the fallback for applications that predate the field.
 * Pure — shared by the wizard, the submit/edit APIs and every list/detail.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(key: string): boolean {
  if (!DATE_KEY.test(key)) return false;
  const parsed = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === key;
}

/** Message to show under the field, or null when the date is acceptable. Required, a real date, and not after today (Jakarta). */
export function validateSubmissionDate(value: string | null | undefined, now: Date = new Date()): string | null {
  const key = value?.trim() ?? "";
  if (!key) return "Tanggal pengajuan wajib diisi.";
  if (!isRealDate(key)) return "Tanggal pengajuan tidak valid.";
  if (key > assignmentDateKey(now)) return "Tanggal pengajuan tidak boleh setelah hari ini.";
  return null;
}

/** The value for `Application.submissionDate` ("YYYY-MM-DD" → UTC midnight); null when empty/invalid. */
export function submissionDateToDb(value: string | null | undefined): Date | null {
  const key = value?.trim() ?? "";
  return isRealDate(key) ? assignmentDateFromInput(key) : null;
}

type DateLike = Date | string | null | undefined;

export type SubmissionDateSource = { submissionDate?: DateLike; createdAt: Date | string };

export type EffectiveSubmissionDate = {
  /** ISO timestamp of the date to show / sort by. */
  value: string;
  /** True when the application has no submissionDate yet and the system's createdAt stands in. */
  isFallback: boolean;
};

/** The date every "Diajukan" display and sort uses: submissionDate, else createdAt (flagged). */
export function effectiveSubmissionDate(source: SubmissionDateSource): EffectiveSubmissionDate {
  const chosen = source.submissionDate;
  if (chosen) return { value: new Date(chosen).toISOString(), isFallback: false };
  return { value: new Date(source.createdAt).toISOString(), isFallback: true };
}

/** Sorts newest/oldest first by the effective submission date (ties keep createdAt order). */
export function compareBySubmissionDate<T extends SubmissionDateSource>(a: T, b: T): number {
  const diff = Date.parse(effectiveSubmissionDate(a).value) - Date.parse(effectiveSubmissionDate(b).value);
  return diff || Date.parse(new Date(a.createdAt).toISOString()) - Date.parse(new Date(b.createdAt).toISOString());
}

export const SYSTEM_DATE_NOTE = "(tanggal input sistem)";

/** "6 Okt 2026" for the chosen date; for the fallback, the createdAt date plus the small system note. */
export function formatSubmissionDate(source: SubmissionDateSource, withNote: boolean): string {
  const { value, isFallback } = effectiveSubmissionDate(source);
  const text = formatAssignmentDate(value, "medium");
  return isFallback && withNote ? `${text} ${SYSTEM_DATE_NOTE}` : text;
}
