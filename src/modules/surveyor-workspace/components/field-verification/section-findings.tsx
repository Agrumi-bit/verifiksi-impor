"use client";

import { SectionShell } from "../office-verification/section-shell";
import { FINDINGS_IMPACTS, type Finding } from "./schema";

type Props = {
  index: number;
  rangeText: string;
  findings: Finding[];
  explanation: string;
  impact: (typeof FINDINGS_IMPACTS)[number] | null;
  recommendation: string;
  onExplanationChange: (v: string) => void;
  onImpactChange: (v: (typeof FINDINGS_IMPACTS)[number]) => void;
  onRecommendationChange: (v: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function SectionFindings({
  index,
  rangeText,
  findings,
  explanation,
  impact,
  recommendation,
  onExplanationChange,
  onImpactChange,
  onRecommendationChange,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const isComplete = Boolean(explanation.trim() && impact && recommendation.trim());

  return (
    <SectionShell index={index} title="Review Temuan Ketidaksesuaian" accent="amber" onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Surveyor diminta untuk memberikan penjelasan dan klarifikasi terhadap setiap temuan ketidaksesuaian yang
        ditemukan selama proses verifikasi lapangan.
      </p>
      <p className="mb-5 text-[13.5px] font-bold leading-relaxed text-[#c1440e]">
        Section ini menampilkan ringkasan temuan dari {rangeText} yang berstatus &quot;Tidak Sesuai&quot;.
      </p>

      <div className="mb-5 rounded-xl border border-[#f0ded0] bg-white p-6">
        <div className="mb-1 text-[15.5px] font-extrabold text-[#1c2530]">Tabel Temuan Ketidaksesuaian</div>
        <div className="mb-4 text-[13px] text-[#8a96a8]">
          Sistem otomatis menampilkan daftar temuan ketidaksesuaian dari {rangeText}.
        </div>

        {findings.length === 0 ? (
          <div className="p-1 text-[13px] text-[#8a96a8]">Belum ada temuan ketidaksesuaian pada {rangeText}.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[0.4fr_1.4fr_1.8fr_0.9fr_1.8fr] gap-3.5 rounded-lg bg-[#f7f7f7] p-2.5 text-xs font-bold text-[#6b7685]">
                <div>No</div>
                <div>Section</div>
                <div>Pertanyaan</div>
                <div>Status</div>
                <div>Catatan Surveyor</div>
              </div>
              {findings.map((f) => (
                <div key={f.no} className="grid grid-cols-[0.4fr_1.4fr_1.8fr_0.9fr_1.8fr] items-start gap-3.5 border-b border-[#f0ded0] p-2.5 py-4">
                  <div className="text-[13.5px] font-bold">{f.no}</div>
                  <div className="text-[13.5px] font-bold">{f.section}</div>
                  <div className="text-[13px] text-[#4a5568]">{f.question}</div>
                  <div>
                    <span className="whitespace-nowrap rounded-full bg-[#fdecec] px-3 py-1 text-[11.5px] font-bold text-[#dc2626]">
                      Tidak Sesuai
                    </span>
                  </div>
                  <div className="text-[13px] text-[#4a5568]">{f.note || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-[#f0ded0] bg-white p-6">
        <div className="mb-1 text-[15.5px] font-extrabold text-[#1c2530]">Klarifikasi Surveyor</div>
        <div className="mb-4 text-[13px] text-[#8a96a8]">
          Surveyor memberikan penjelasan tambahan, dampak, dan rekomendasi terhadap temuan ketidaksesuaian.
        </div>

        <div className="mb-1.5 text-[13.5px] font-bold text-[#1c2530]">
          Penjelasan Temuan Ketidaksesuaian <span className="text-[#dc2626]">*</span>
        </div>
        <textarea
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          className="mb-1.5 min-h-[90px] w-full resize-y rounded-[10px] border border-[#d7dbe0] p-3 text-[13px]"
        />
        <div className="mb-4 text-xs text-[#8a96a8]">Jelaskan konteks dan klarifikasi terhadap temuan ketidaksesuaian yang ditemukan.</div>

        <div className="mb-1.5 text-[13.5px] font-bold text-[#1c2530]">
          Dampak Terhadap Verifikasi <span className="text-[#dc2626]">*</span>
        </div>
        <select
          value={impact ?? ""}
          onChange={(e) => onImpactChange(e.target.value as (typeof FINDINGS_IMPACTS)[number])}
          className="mb-1.5 w-full rounded-lg border border-[#d7dbe0] px-3 py-2.5 text-[13.5px] text-[#1c2530]"
        >
          <option value="" disabled>
            Pilih dampak...
          </option>
          {FINDINGS_IMPACTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="mb-4 text-xs text-[#8a96a8]">Berikan penilaian apakah temuan mempengaruhi kelayakan verifikasi.</div>

        <div className="mb-1.5 text-[13.5px] font-bold text-[#1c2530]">
          Rekomendasi Surveyor <span className="text-[#dc2626]">*</span>
        </div>
        <textarea
          value={recommendation}
          onChange={(e) => onRecommendationChange(e.target.value)}
          className="mb-1.5 min-h-[80px] w-full resize-y rounded-[10px] border border-[#d7dbe0] p-3 text-[13px]"
        />
        <div className="mb-4 text-xs text-[#8a96a8]">Berikan rekomendasi terkait temuan ketidaksesuaian kepada perusahaan atau reviewer.</div>

        {isComplete && (
          <div className="rounded-[10px] bg-[#e2f7ea] p-3.5 text-[13px] font-semibold text-[#16a34a]">
            ✓ Klarifikasi surveyor sudah lengkap.
          </div>
        )}
      </div>
    </SectionShell>
  );
}
