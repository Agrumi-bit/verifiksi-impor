"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { SectionShell } from "../office-verification/section-shell";
import { QuestionList } from "../office-verification/question-list";
import {
  CAPACITY_QUESTIONS,
  SISTEM_PENYIMPANAN_OPTIONS,
  computeCapacityEfektif,
  type AnswerValues,
  type CapacityValues,
} from "./schema";

type Props = {
  capacity: CapacityValues;
  layoutPath: string | undefined;
  answers: Record<string, AnswerValues>;
  onCapacityChange: (patch: Partial<CapacityValues>) => void;
  onLayoutPathChange: (path: string | undefined) => void;
  onAnswer: (key: string, value: AnswerValues) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("namespace", "inspection");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) throw new Error("Gagal mengunggah file");
  const data = (await response.json()) as { path: string };
  return data.path;
}

function NumberField({ label, unit, value, onChange }: { label: string; unit: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr] items-center gap-3 border-t border-[#eef1f5] px-5 py-4 first:border-t-0">
      <div className="text-[13.5px] font-bold text-[#1c2530]">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-[100px] rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13.5px]"
        />
        <span className="text-[13px] text-[#4a5568]">{unit}</span>
      </div>
      <div className="text-[13px] text-[#4a5568]">Observasi Lapangan</div>
    </div>
  );
}

export function SectionCapacity({
  capacity,
  layoutPath,
  answers,
  onCapacityChange,
  onLayoutPathChange,
  onAnswer,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const kapasitasEfektif = computeCapacityEfektif(capacity);
  const sistemLabel =
    Object.entries(capacity.sistemPenyimpanan)
      .filter(([, checked]) => checked)
      .map(([opt]) => opt)
      .join(", ") || "—";

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file);
      onLayoutPathChange(path);
    } catch {
      toast.error("Gagal mengunggah layout gudang");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SectionShell index={5} title="Kapasitas Gudang" onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Bagian ini digunakan untuk mengumpulkan data teknis gudang yang diperlukan untuk analisis kapasitas
        penyimpanan dan kesesuaian dengan rencana impor.
      </p>
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
        Struktur dibuat dalam bentuk tabel parameter teknis agar mudah digunakan oleh Surveyor, Verifikator, dan
        Technical Reviewer.
      </p>

      <div className="mb-3 text-sm font-extrabold text-[#1c2530]">Tabel Data Teknis Gudang</div>
      <div className="mb-5 overflow-hidden rounded-xl border border-[#dbe4f0] bg-white">
        <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr] gap-3 bg-[#f7f8fa] px-5 py-3.5 text-[13px] font-bold text-[#4a5568]">
          <div>Parameter</div>
          <div>Nilai</div>
          <div>Sumber Dokumen / Observasi</div>
        </div>
        <NumberField label="Luas Gudang Total" unit="m²" value={capacity.luasTotal} onChange={(v) => onCapacityChange({ luasTotal: v })} />
        <NumberField label="Jumlah Line Gudang" unit="Line" value={capacity.jumlahLine} onChange={(v) => onCapacityChange({ jumlahLine: v })} />
        <NumberField label="Luas Area Gudang yang Digunakan" unit="m²" value={capacity.luasDigunakan} onChange={(v) => onCapacityChange({ luasDigunakan: v })} />
        <NumberField label="Tinggi Efektif Penyimpanan" unit="m" value={capacity.tinggiEfektif} onChange={(v) => onCapacityChange({ tinggiEfektif: v })} />
        <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr] items-start gap-3 border-t border-[#eef1f5] px-5 py-4">
          <div className="text-[13.5px] font-bold text-[#1c2530]">Sistem Penyimpanan</div>
          <div className="flex flex-col gap-2">
            {SISTEM_PENYIMPANAN_OPTIONS.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                <input
                  type="checkbox"
                  checked={capacity.sistemPenyimpanan[opt] ?? false}
                  onChange={(e) =>
                    onCapacityChange({ sistemPenyimpanan: { ...capacity.sistemPenyimpanan, [opt]: e.target.checked } })
                  }
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="text-[13px] text-[#4a5568]">Observasi Lapangan</div>
        </div>
        <NumberField label="Persentase Utilisasi Aman" unit="%" value={capacity.utilisasiAman} onChange={(v) => onCapacityChange({ utilisasiAman: v })} />
        <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr] items-center gap-3 border-t border-[#eef1f5] bg-[#eaf2ff] px-5 py-[18px]">
          <div className="text-[13.5px] font-bold text-[#1c2530]">Kapasitas Efektif Gudang</div>
          <div>
            <div className="text-[18px] font-extrabold text-[#3b82f6]">{kapasitasEfektif} m³</div>
            <div className="text-[11.5px] text-[#8a96a8]">Formula: Luas × Tinggi × Utilisasi</div>
          </div>
          <div className="text-[13px] font-semibold text-[#4a5568]">Hasil Perhitungan Sistem</div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border-[1.5px] border-[#bcd4f5] bg-[#eaf2ff] p-5">
        <div className="mb-4 text-[14.5px] font-extrabold text-[#1c2530]">Ringkasan Data Gudang</div>
        <div className="mb-3.5 grid grid-cols-2 gap-4">
          <div>
            <div className="mb-0.5 text-xs text-[#3b82f6]">Luas Total</div>
            <div className="text-[15px] font-bold text-[#1c2530]">{capacity.luasTotal ?? 0} m²</div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-[#3b82f6]">Luas Digunakan</div>
            <div className="text-[15px] font-bold text-[#1c2530]">{capacity.luasDigunakan ?? 0} m²</div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-[#3b82f6]">Tinggi Efektif</div>
            <div className="text-[15px] font-bold text-[#1c2530]">{capacity.tinggiEfektif ?? 0} m</div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-[#3b82f6]">Utilisasi Aman</div>
            <div className="text-[15px] font-bold text-[#1c2530]">{capacity.utilisasiAman ?? 0} %</div>
          </div>
        </div>
        <div className="mb-3.5">
          <div className="mb-0.5 text-xs text-[#3b82f6]">Sistem Penyimpanan</div>
          <div className="text-[15px] font-bold text-[#1c2530]">{sistemLabel}</div>
        </div>
        <div className="border-t border-[#bcd4f5] pt-3.5">
          <div className="mb-0.5 text-xs text-[#3b82f6]">Kapasitas Efektif Gudang</div>
          <div className="text-xl font-extrabold text-[#3b82f6]">{kapasitasEfektif} m³</div>
        </div>
      </div>

      <div className="mb-3 text-sm font-extrabold text-[#1c2530]">Upload Layout Gudang</div>
      <label className="mb-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#a9c8f0] bg-white p-8">
        <MaterialIcon name="upload" className="text-[30px] text-[#3b82f6]" />
        <span className="text-[14px] font-bold text-[#1c2530]">Upload Denah / Layout Gudang</span>
        <span className="text-xs text-[#8a96a8]">Format: PDF, JPG, PNG • Maksimal 5MB</span>
        <span className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[#3b82f6] bg-white px-4 py-2 text-[13px] font-bold text-[#3b82f6]">
          <MaterialIcon name="upload" className="text-base" />
          {uploading ? "Mengunggah..." : "Pilih File"}
        </span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {layoutPath && (
        <div className="-mt-3 mb-5 flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
          <MaterialIcon name="check_circle" className="text-sm" />
          Layout gudang berhasil diunggah
        </div>
      )}

      <div className="mb-3.5 text-sm font-extrabold text-[#1c2530]">Verifikasi Kesesuaian Data Gudang</div>
      <QuestionList questions={CAPACITY_QUESTIONS} answers={answers} onAnswer={onAnswer} />
    </SectionShell>
  );
}
