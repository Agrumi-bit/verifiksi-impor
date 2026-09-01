"use client";

import Link from "next/link";

import { MaterialIcon } from "../material-icon";
import { CONCLUSION_RECOMMENDATIONS, CONCLUSION_STATUSES, LOCATION_LABEL, type FieldKind, type FieldVerificationValues } from "./schema";

const STATUS_ICON: Record<(typeof CONCLUSION_STATUSES)[number], string> = {
  Sesuai: "check_circle",
  "Perlu Klarifikasi": "chat_bubble",
  "Tidak Sesuai": "cancel",
};

const RECOMMENDATION_ICON: Record<(typeof CONCLUSION_RECOMMENDATIONS)[number], string> = {
  Disetujui: "check_circle",
  "Memerlukan perbaikan / klarifikasi": "chat_bubble",
  Ditolak: "cancel",
};

type Props = {
  kind: FieldKind;
  index: number;
  status: FieldVerificationValues["conclusionStatus"];
  recommendation: FieldVerificationValues["conclusionRecommendation"];
  summary: string;
  reportHref: string;
  onStatusChange: (v: (typeof CONCLUSION_STATUSES)[number]) => void;
  onRecommendationChange: (v: (typeof CONCLUSION_RECOMMENDATIONS)[number]) => void;
  onSummaryChange: (v: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  isSaving?: boolean;
};

export function SectionConclusion({
  kind,
  index,
  status,
  recommendation,
  summary,
  reportHref,
  onStatusChange,
  onRecommendationChange,
  onSummaryChange,
  onSave,
  onSubmit,
  isSaving,
}: Props) {
  const label = LOCATION_LABEL[kind];
  const isComplete = Boolean(status && recommendation && summary.trim());

  return (
    <div className="mt-5 rounded-[14px] border-[1.5px] border-[#9333ea] bg-[#f6effc] p-7">
      <div className="mb-2.5 text-xs font-extrabold tracking-wide text-[#1c2530]">SECTION {index}</div>
      <div className="mb-3.5 text-[17px] font-extrabold text-[#1c2530]">Kesimpulan Verifikasi {label}</div>

      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Surveyor memberikan kesimpulan atas hasil verifikasi lapangan terhadap {label.toLowerCase()} perusahaan
        berdasarkan observasi yang telah dilakukan pada section sebelumnya.
      </p>
      <p className="mb-5 text-[13.5px] font-bold leading-relaxed text-[#9333ea]">
        Kesimpulan ini mencerminkan kesesuaian kondisi {label.toLowerCase()} dengan data dan dokumen yang disampaikan
        dalam permohonan.
      </p>

      <div className="mb-5 rounded-xl border border-[#ecdffb] bg-white p-6">
        <div className="mb-1 text-[15.5px] font-extrabold text-[#1c2530]">Form Kesimpulan Verifikasi</div>
        <div className="mb-[18px] text-[13px] text-[#8a96a8]">
          Surveyor mengisi kesimpulan berdasarkan hasil observasi seluruh section verifikasi.
        </div>

        <div className="mb-2 text-[13.5px] font-bold text-[#1c2530]">
          Status Verifikasi {label} <span className="text-[#dc2626]">*</span>
        </div>
        <div className="mb-[18px] grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {CONCLUSION_STATUSES.map((option) => {
            const active = status === option;
            return (
              <button
                type="button"
                key={option}
                onClick={() => onStatusChange(option)}
                className="flex items-center gap-2 rounded-[10px] p-3.5 text-left"
                style={{ border: `1.5px solid ${active ? "#9333ea" : "#e4d8f2"}`, background: active ? "#f3e8fd" : "#fff" }}
              >
                <MaterialIcon name={STATUS_ICON[option]} className="text-[17px]" style={{ color: active ? "#9333ea" : "#8a96a8" }} />
                <span className="text-[13px] font-bold" style={{ color: active ? "#9333ea" : "#8a96a8" }}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-2 text-[13.5px] font-bold text-[#1c2530]">
          Rekomendasi Surveyor <span className="text-[#dc2626]">*</span>
        </div>
        <div className="mb-[18px] grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {CONCLUSION_RECOMMENDATIONS.map((option) => {
            const active = recommendation === option;
            return (
              <button
                type="button"
                key={option}
                onClick={() => onRecommendationChange(option)}
                className="flex items-center gap-2 rounded-[10px] p-3.5 text-left"
                style={{ border: `1.5px solid ${active ? "#9333ea" : "#e4d8f2"}`, background: active ? "#f3e8fd" : "#fff" }}
              >
                <MaterialIcon name={RECOMMENDATION_ICON[option]} className="text-[17px]" style={{ color: active ? "#9333ea" : "#8a96a8" }} />
                <span className="text-[13px] font-bold" style={{ color: active ? "#9333ea" : "#8a96a8" }}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-1.5 text-[13.5px] font-bold text-[#1c2530]">
          Ringkasan Hasil Verifikasi {label} <span className="text-[#dc2626]">*</span>
        </div>
        <textarea
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="mb-1.5 min-h-[110px] w-full resize-y rounded-[10px] border border-[#d7dbe0] p-3 text-[13px]"
        />
        <div className="mb-[18px] text-xs text-[#8a96a8]">Jelaskan hasil observasi secara ringkas dan komprehensif.</div>

        {isComplete && (
          <div className="rounded-[10px] bg-[#e2f7ea] p-3.5 text-[13px] font-semibold text-[#16a34a]">
            ✓ Kesimpulan verifikasi {label.toLowerCase()} sudah lengkap.
          </div>
        )}
      </div>

      {status && recommendation && (
        <div className="mb-5 rounded-xl border-[1.5px] border-[#f5c542] bg-[#fffbeb] p-5">
          <div className="mb-3.5 flex items-center gap-2 text-sm font-bold text-[#c1440e]">
            <MaterialIcon name="chat_bubble" className="text-lg" />
            Status: {status}
          </div>
          <div className="mb-1 text-[13px] font-bold text-[#1c2530]">Rekomendasi</div>
          <div className="text-[13.5px] text-[#c1440e]">{recommendation}</div>
        </div>
      )}

      <div className="flex justify-end gap-2.5 border-t border-[#ecdffb] pt-3.5">
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-[9px] border border-[#9333ea] bg-white px-[18px] py-2.5 text-[13px] font-bold text-[#9333ea] disabled:opacity-60"
        >
          <MaterialIcon name="save" className="text-base" />
          Save
        </button>
        {/* Renders off whatever's saved so far — the report route has no COMPLETED gate, so this
            works as a real preview before submitting, same as verifikator's Generate Report. */}
        <Link
          href={reportHref}
          target="_blank"
          className="flex items-center gap-1.5 rounded-[9px] border border-[#9333ea] bg-white px-[18px] py-2.5 text-[13px] font-bold text-[#9333ea]"
        >
          <MaterialIcon name="description" className="text-base" />
          Generate Report
        </Link>
        <button
          type="button"
          onClick={onSubmit}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#9333ea] px-[18px] py-2.5 text-[13px] font-bold text-white"
        >
          <MaterialIcon name="send" className="text-base" />
          Submit Verifikasi
        </button>
      </div>
    </div>
  );
}
