import { assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";

/**
 * "Tanggal Penyusunan Laporan" — the date printed as "DISUSUN OLEH" on a survey report, chosen by the
 * surveyor before "Submit Verifikasi" instead of being the moment the button was clicked
 * (`submittedAt` stays as the audit trail). Two ways to set it:
 *   VISIT_DATE  same as the actual visit date (the default once that date is filled in)
 *   CUSTOM      any other date — not before the visit and not after today.
 * Pure: shared by the wizard UI, the submit API and the report previews.
 */

export const REPORT_PREPARED_DATE_MODES = ["VISIT_DATE", "CUSTOM"] as const;
export type ReportPreparedDateMode = (typeof REPORT_PREPARED_DATE_MODES)[number];

export type ReportPreparedDateInput = {
  mode: ReportPreparedDateMode | null | undefined;
  /** The chosen date for CUSTOM mode, "YYYY-MM-DD". Ignored for VISIT_DATE. */
  date: string | null | undefined;
  /** "Tanggal Kunjungan Aktual", "YYYY-MM-DD". */
  actualVisitDate: string | null | undefined;
};

export type ReportPreparedDateResult = { ok: true; date: string; mode: ReportPreparedDateMode } | { ok: false; error: string };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(key: string): boolean {
  if (!DATE_KEY.test(key)) return false;
  const parsed = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === key;
}

/** The mode the form should start with: VISIT_DATE once the visit date exists, else CUSTOM. */
export function defaultReportPreparedDateMode(actualVisitDate: string | null | undefined): ReportPreparedDateMode {
  return actualVisitDate ? "VISIT_DATE" : "CUSTOM";
}

/** The date a given choice amounts to (no validation) — what the UI shows read-only for VISIT_DATE. */
export function effectiveReportPreparedDate(input: ReportPreparedDateInput): string {
  const mode = input.mode ?? defaultReportPreparedDateMode(input.actualVisitDate);
  return (mode === "VISIT_DATE" ? input.actualVisitDate : input.date)?.trim() ?? "";
}

/**
 * Validates the choice and returns the date to store. Never before the actual visit date, never after
 * today (Asia/Jakarta), always a real calendar date. The messages are shown under the field.
 */
export function validateReportPreparedDate(input: ReportPreparedDateInput, now: Date = new Date()): ReportPreparedDateResult {
  const mode: ReportPreparedDateMode = input.mode ?? defaultReportPreparedDateMode(input.actualVisitDate);
  const visitDate = input.actualVisitDate?.trim() ?? "";
  const date = effectiveReportPreparedDate({ ...input, mode });

  if (mode === "VISIT_DATE" && !visitDate) {
    return { ok: false, error: "Isi Tanggal Kunjungan Aktual di Section 0, atau pilih tanggal lain." };
  }
  if (!date) return { ok: false, error: "Tanggal penyusunan laporan wajib diisi." };
  if (!isRealDate(date)) return { ok: false, error: "Tanggal penyusunan laporan tidak valid." };
  if (date > assignmentDateKey(now)) return { ok: false, error: "Tanggal penyusunan laporan tidak boleh setelah hari ini." };
  if (visitDate && isRealDate(visitDate) && date < visitDate) {
    return { ok: false, error: `Tanggal penyusunan laporan tidak boleh sebelum Tanggal Kunjungan Aktual (${formatAssignmentDate(visitDate, "numeric")}).` };
  }
  return { ok: true, date, mode };
}

/**
 * The date a report prints for "DISUSUN OLEH" / "Draf disusun oleh surveyor": the chosen date (always
 * the CURRENT visit date for a VISIT_DATE choice), else — for reports submitted before this field
 * existed — the actual visit date, then the submit time.
 */
export function resolveReportPreparedDate<S extends string | Date | null | undefined>(
  form: { reportPreparedDate?: string | null; reportPreparedDateMode?: ReportPreparedDateMode | null; actualVisitDate?: string | null } | null | undefined,
  submittedAt?: S,
): string | NonNullable<S> | null {
  if (form?.reportPreparedDateMode === "VISIT_DATE" && form.actualVisitDate) return form.actualVisitDate;
  return form?.reportPreparedDate || form?.actualVisitDate || submittedAt || null;
}

type SurveyFormDates = {
  actualVisitDate?: string | null;
  reportPreparedDate?: string | null;
  reportPreparedDateMode?: ReportPreparedDateMode | null;
};

/**
 * "Survey Date" and "Completed At" for a location visit as reviewers see them: the surveyor's own
 * Tanggal Kunjungan Aktual and Tanggal Penyusunan Laporan — not `submittedAt`, which is only when
 * the Submit button was clicked. Reports filed before those fields existed fall back to submittedAt.
 */
export function surveyVisitDates<S extends string | Date | null | undefined>(visit: {
  submittedAt?: S;
  officeVerification?: SurveyFormDates | null;
  warehouseVerification?: SurveyFormDates | null;
  factoryVerification?: SurveyFormDates | null;
}): { surveyDate: string | null; completedAt: string | NonNullable<S> | null } {
  const form = visit.officeVerification ?? visit.warehouseVerification ?? visit.factoryVerification ?? null;
  return {
    surveyDate: form?.actualVisitDate || null,
    completedAt: resolveReportPreparedDate(form, visit.submittedAt),
  };
}
