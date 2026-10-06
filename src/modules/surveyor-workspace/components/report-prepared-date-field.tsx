"use client";

import { assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";

import {
  defaultReportPreparedDateMode,
  effectiveReportPreparedDate,
  type ReportPreparedDateMode,
} from "../report-prepared-date";
import { MaterialIcon } from "./material-icon";

type Props = {
  /** "Tanggal Kunjungan Aktual", "YYYY-MM-DD" ("" while not filled in). */
  actualVisitDate: string;
  mode: ReportPreparedDateMode | undefined;
  date: string | undefined;
  confirmed: boolean;
  error: string | null;
  /** Every change sets mode AND the resolved date together, so the saved draft is always consistent. */
  onChange: (next: { reportPreparedDateMode: ReportPreparedDateMode; reportPreparedDate: string }) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  disabled?: boolean;
};

/**
 * "Tanggal Penyusunan Laporan" — asked right before "Submit Verifikasi" (field and office): the date
 * printed as "Disusun oleh" on the report. Same date picker + confirmation pattern as the
 * verifikator's report decision.
 */
export function ReportPreparedDateField({ actualVisitDate, mode, date, confirmed, error, onChange, onConfirmedChange, disabled }: Props) {
  const activeMode = mode ?? defaultReportPreparedDateMode(actualVisitDate);
  const today = assignmentDateKey(new Date());
  const visitDateLabel = actualVisitDate ? formatAssignmentDate(actualVisitDate, "full") : null;

  function chooseMode(next: ReportPreparedDateMode) {
    onChange({
      reportPreparedDateMode: next,
      reportPreparedDate: effectiveReportPreparedDate({ mode: next, date, actualVisitDate }),
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-[#dbe4f0] bg-white p-5" data-testid="report-prepared-date">
      <div className="mb-1 text-[15px] font-extrabold text-[#1c2530]">
        Tanggal Penyusunan Laporan <span className="text-[#dc2626]">*</span>
      </div>
      <p className="mb-3.5 text-[12.5px] leading-relaxed text-[#6b7685]">
        Tanggal ini tercetak sebagai &ldquo;Disusun oleh&rdquo; pada laporan. Waktu klik Submit tetap tercatat terpisah sebagai
        jejak audit.
      </p>

      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Tanggal Penyusunan Laporan">
        <label
          className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3.5"
          style={{ borderColor: activeMode === "VISIT_DATE" ? "#4a5568" : "#e0e5eb", background: activeMode === "VISIT_DATE" ? "#f4f6f9" : "#fff" }}
        >
          <input
            type="radio"
            name="report-prepared-date-mode"
            className="mt-1"
            checked={activeMode === "VISIT_DATE"}
            disabled={disabled}
            onChange={() => chooseMode("VISIT_DATE")}
          />
          <span className="text-[13.5px]">
            <span className="font-bold text-[#1c2530]">Sama dengan Tanggal Kunjungan Aktual</span>
            <span className="mt-0.5 block text-[13px] text-[#4a5568]" data-testid="report-prepared-date-visit">
              {visitDateLabel ?? "Belum diisi — isi Tanggal Kunjungan Aktual di Section 0."}
            </span>
          </span>
        </label>

        <label
          className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3.5"
          style={{ borderColor: activeMode === "CUSTOM" ? "#4a5568" : "#e0e5eb", background: activeMode === "CUSTOM" ? "#f4f6f9" : "#fff" }}
        >
          <input
            type="radio"
            name="report-prepared-date-mode"
            className="mt-1"
            checked={activeMode === "CUSTOM"}
            disabled={disabled}
            onChange={() => chooseMode("CUSTOM")}
          />
          <span className="flex-1 text-[13.5px]">
            <span className="font-bold text-[#1c2530]">Pilih tanggal lain</span>
            {activeMode === "CUSTOM" && (
              <span className="mt-2 block">
                <input
                  type="date"
                  value={date ?? ""}
                  min={actualVisitDate || undefined}
                  max={today}
                  disabled={disabled}
                  onChange={(event) => onChange({ reportPreparedDateMode: "CUSTOM", reportPreparedDate: event.target.value })}
                  className="w-full max-w-[220px] rounded-lg border border-[#d7dbe0] px-3 py-2.5 text-[13.5px]"
                  aria-label="Tanggal penyusunan laporan"
                />
                <span className="mt-1 block text-[12px] text-[#8a96a8]">
                  Tidak boleh sebelum Tanggal Kunjungan Aktual dan tidak boleh setelah hari ini.
                </span>
              </span>
            )}
          </span>
        </label>
      </div>

      <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-[#1c2530]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={confirmed}
          disabled={disabled}
          onChange={(event) => onConfirmedChange(event.target.checked)}
        />
        <span>Saya mengonfirmasi bahwa tanggal penyusunan laporan ini sudah benar.</span>
      </label>

      {error && (
        <div role="alert" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#b91c1c]">
          <MaterialIcon name="error" className="text-base" />
          {error}
        </div>
      )}
    </div>
  );
}
