"use client";

import { MaterialIcon } from "../material-icon";
import { SectionShell } from "./section-shell";
import { CONCLUSION_RECOMMENDATIONS, CONCLUSION_STATUSES, type OfficeVerificationValues } from "./schema";

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
  status: OfficeVerificationValues["conclusionStatus"];
  recommendation: OfficeVerificationValues["conclusionRecommendation"];
  summary: string;
  onStatusChange: (v: (typeof CONCLUSION_STATUSES)[number]) => void;
  onRecommendationChange: (v: (typeof CONCLUSION_RECOMMENDATIONS)[number]) => void;
  onSummaryChange: (v: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function Section8Conclusion({
  status,
  recommendation,
  summary,
  onStatusChange,
  onRecommendationChange,
  onSummaryChange,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const isComplete = Boolean(status && recommendation && summary.trim());

  return (
    <SectionShell
      index={8}
      title="Kesimpulan Verifikasi Kantor"
      accent="purple"
      onSave={onSave}
      onSaveNext={onSaveNext}
      isSaving={isSaving}
    >
      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Surveyor memberikan kesimpulan atas hasil verifikasi lapangan terhadap kantor perusahaan berdasarkan
        observasi yang telah dilakukan pada section sebelumnya.
      </p>
      <p className="mb-5 text-[13.5px] font-bold leading-relaxed text-[#9333ea]">
        Kesimpulan ini mencerminkan kesesuaian kondisi kantor dengan data dan dokumen yang disampaikan dalam
        permohonan.
      </p>

      <div className="mb-5 rounded-xl border border-[#ecdffb] bg-white p-6">
        <div className="mb-1 text-[15.5px] font-extrabold text-[#1c2530]">Form Kesimpulan Verifikasi</div>
        <div className="mb-[18px] text-[13px] text-[#8a96a8]">
          Surveyor mengisi kesimpulan berdasarkan hasil observasi seluruh section verifikasi.
        </div>

        <div className="mb-2 text-[13.5px] font-bold text-[#1c2530]">
          Status Verifikasi Kantor <span className="text-[#dc2626]">*</span>
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
                style={{
                  border: `1.5px solid ${active ? "#9333ea" : "#e4d8f2"}`,
                  background: active ? "#f3e8fd" : "#fff",
                }}
              >
                <MaterialIcon
                  name={STATUS_ICON[option]}
                  className="text-[17px]"
                  style={{ color: active ? "#9333ea" : "#8a96a8" }}
                />
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
                style={{
                  border: `1.5px solid ${active ? "#9333ea" : "#e4d8f2"}`,
                  background: active ? "#f3e8fd" : "#fff",
                }}
              >
                <MaterialIcon
                  name={RECOMMENDATION_ICON[option]}
                  className="text-[17px]"
                  style={{ color: active ? "#9333ea" : "#8a96a8" }}
                />
                <span className="text-[13px] font-bold" style={{ color: active ? "#9333ea" : "#8a96a8" }}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-1.5 text-[13.5px] font-bold text-[#1c2530]">
          Ringkasan Hasil Verifikasi Kantor <span className="text-[#dc2626]">*</span>
        </div>
        <textarea
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="mb-1.5 min-h-[110px] w-full resize-y rounded-[10px] border border-[#d7dbe0] p-3 text-[13px]"
        />
        <div className="mb-[18px] text-xs text-[#8a96a8]">
          Jelaskan hasil observasi secara ringkas dan komprehensif.
        </div>

        {isComplete && (
          <div className="rounded-[10px] bg-[#e2f7ea] p-3.5 text-[13px] font-semibold text-[#16a34a]">
            ✓ Kesimpulan verifikasi kantor sudah lengkap.
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
    </SectionShell>
  );
}
