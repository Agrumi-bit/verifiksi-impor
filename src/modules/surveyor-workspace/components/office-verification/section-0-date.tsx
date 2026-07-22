"use client";

import { SectionShell } from "./section-shell";
import type { OfficeVerificationValues } from "./schema";

type Props = {
  values: OfficeVerificationValues;
  onChange: (patch: Partial<OfficeVerificationValues>) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function Section0Date({ values, onChange, onSave, onSaveNext, isSaving }: Props) {
  return (
    <SectionShell index={0} title="Tanggal Verifikasi" onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-5 text-[13.5px] leading-relaxed text-[#4a5568]">
        Konfirmasi tanggal penugasan dan tanggal aktual kunjungan verifikasi lapangan.
      </p>
      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
          <div className="mb-2.5 text-[13.5px] font-bold text-[#1c2530]">Tanggal Ditugaskan</div>
          <input
            type="date"
            value={values.assignedDate ?? ""}
            onChange={(e) => onChange({ assignedDate: e.target.value })}
            className="w-full rounded-lg border border-[#d7dbe0] px-3 py-2.5 text-[13.5px]"
          />
        </div>
        <div className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
          <div className="mb-2.5 text-[13.5px] font-bold text-[#1c2530]">Tanggal Kunjungan Aktual</div>
          <input
            type="date"
            value={values.actualVisitDate ?? ""}
            onChange={(e) => onChange({ actualVisitDate: e.target.value })}
            className="w-full rounded-lg border border-[#d7dbe0] px-3 py-2.5 text-[13.5px]"
          />
        </div>
      </div>
      <div className="mb-1">
        <div className="mb-2 text-sm font-extrabold text-[#1c2530]">Keterangan</div>
        <textarea
          value={values.dateNotes ?? ""}
          onChange={(e) => onChange({ dateNotes: e.target.value })}
          placeholder="Tuliskan keterangan terkait tanggal verifikasi..."
          className="min-h-[70px] w-full resize-y rounded-[10px] border border-[#dbe4f0] p-3 text-[13.5px]"
        />
      </div>
    </SectionShell>
  );
}
