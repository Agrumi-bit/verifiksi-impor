/**
 * Pasal 37 Permenperin 27/2025 — a Sertifikat Hasil Uji Mutu is "diajukan paling lama 6 (enam) bulan
 * sejak tanggal diterbitkan". Compared on calendar dates (YYYY-MM-DD, time ignored) against the
 * application's own Tanggal Pengajuan. Pure, so both the review modal and the report can use it.
 */
export const QUALITY_TEST_SUBMISSION_WINDOW_MONTHS = 6;

export type QualityTestSubmissionWindow = {
  /** null when either date is missing or unreadable — the verifikator decides manually. */
  withinWindow: boolean | null;
  label: string;
};

function toCalendarDate(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Last day the certificate may still be submitted: same day N months later, clamped to month end. */
function windowEnd(issue: { y: number; m: number; d: number }): { y: number; m: number; d: number } {
  const monthIndex = issue.m - 1 + QUALITY_TEST_SUBMISSION_WINDOW_MONTHS;
  const y = issue.y + Math.floor(monthIndex / 12);
  const m = (monthIndex % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { y, m, d: Math.min(issue.d, lastDay) };
}

const toKey = (date: { y: number; m: number; d: number }) => date.y * 10000 + date.m * 100 + date.d;

function formatTanggal(date: { y: number; m: number; d: number }): string {
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function qualityTestSubmissionWindow(
  issueDate: string | null | undefined,
  submissionDate: string | null | undefined,
): QualityTestSubmissionWindow {
  const issue = toCalendarDate(issueDate);
  if (!issue) return { withinWindow: null, label: "Tanggal terbit sertifikat belum tercatat" };
  const submitted = toCalendarDate(submissionDate);
  if (!submitted) return { withinWindow: null, label: "Tanggal pengajuan permohonan belum tercatat" };

  if (toKey(submitted) < toKey(issue)) {
    return { withinWindow: false, label: "Tidak Memenuhi — tanggal pengajuan lebih awal dari tanggal terbit sertifikat" };
  }
  const deadline = windowEnd(issue);
  const withinWindow = toKey(submitted) <= toKey(deadline);
  const detail = `terbit ${formatTanggal(issue)}, diajukan ${formatTanggal(submitted)}, batas ${formatTanggal(deadline)}`;
  return {
    withinWindow,
    label: withinWindow
      ? `Memenuhi — diajukan paling lama 6 (enam) bulan sejak diterbitkan (${detail})`
      : `Tidak Memenuhi — diajukan lebih dari 6 (enam) bulan sejak diterbitkan (${detail})`,
  };
}
