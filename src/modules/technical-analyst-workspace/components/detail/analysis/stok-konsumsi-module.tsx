"use client";

import type { ReactNode } from "react";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

function TextInput({ label, value, onChange, disabled, placeholder, numeric }: { label: ReactNode; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; numeric?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-[#594138]">{label}</div>
      <input
        type="text"
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
      />
    </div>
  );
}

/**
 * VIU Barang Konsumsi — the scheme has no partner need to measure against (Ps 37 ayat (2) huruf c): the applicant
 * declares its current stock per jenis and pos tarif/HS, and the LHVIU records the HS Code, merek, negara asal and
 * that stock (Ps 39 ayat (5) huruf d-f). The analyst checks the declared stock against the field finding and judges
 * the import plan against it.
 */
export function StokKonsumsiModule({
  inputs,
  onInputChange,
  kesimpulan,
  onKesimpulanChange,
  status,
  onMarkSesuai,
  onMarkTidakSesuai,
  onSubmit,
  canEdit,
  submitting,
}: ModuleProps) {
  const stokDeklarasi = parseNumeric(inputs.stokDeklarasi);
  const stokLapangan = parseNumeric(inputs.stokLapangan);
  const rencana = parseNumeric(inputs.rencanaImpor);
  const selisihPct = stokDeklarasi && stokLapangan !== null ? ((stokLapangan - stokDeklarasi) / stokDeklarasi) * 100 : null;
  const stokSesuai = selisihPct !== null ? Math.abs(selisihPct) <= 10 : null;
  const rasioStok = rencana && stokLapangan !== null ? stokLapangan / rencana : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="inventory_2"
          iconColor="#a3690a"
          title="Analisis Stok Terkini dan Rencana Impor Produk Tekstil Barang Konsumsi per Pos Tarif/HS"
          subtitle="Mencocokkan jumlah stok terkini per jenis dan pos tarif/HS yang dinyatakan API-U dengan hasil pemeriksaan lapangan, serta menilai rencana impor terhadap stok tersebut (Pasal 37 ayat (2) huruf c angka 1 dan Pasal 39 ayat (5) huruf d–f Permenperin 27/2025)."
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <TextInput label="HS Code yang Diperiksa" value={inputs.hsCode ?? ""} onChange={(v) => onInputChange("hsCode", v)} disabled={!canEdit} placeholder="Contoh: 6110.30.00" />
          <TextInput label="Merek" value={inputs.merek ?? ""} onChange={(v) => onInputChange("merek", v)} disabled={!canEdit} placeholder="Nama merek" />
          <TextInput label="Negara Asal" value={inputs.negaraAsal ?? ""} onChange={(v) => onInputChange("negaraAsal", v)} disabled={!canEdit} placeholder="Contoh: REP. RAKYAT CINA" />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <TextInput label="Stok Terkini menurut Permohonan (unit)" value={inputs.stokDeklarasi ?? ""} onChange={(v) => onInputChange("stokDeklarasi", v)} disabled={!canEdit} placeholder="0" numeric />
          <TextInput label="Stok Terkini Hasil Pemeriksaan Lapangan (unit)" value={inputs.stokLapangan ?? ""} onChange={(v) => onInputChange("stokLapangan", v)} disabled={!canEdit} placeholder="0" numeric />
          <TextInput label="Rencana Impor (unit/tahun)" value={inputs.rencanaImpor ?? ""} onChange={(v) => onInputChange("rencanaImpor", v)} disabled={!canEdit} placeholder="0" numeric />
        </div>
        <StatBoxes
          items={[
            { label: "Selisih Stok Lapangan vs Permohonan", value: selisihPct !== null ? `${fmtNum(selisihPct, 1)}%` : "—" },
            { label: "Rasio Stok Terkini / Rencana Impor", value: rasioStok !== null ? `${fmtNum(rasioStok, 2)}x` : "—" },
          ]}
        />
        <ResultBanner
          bg={stokSesuai === null ? "#f2ece5" : stokSesuai ? "#e2f7ea" : "#fbe4de"}
          color={stokSesuai === null ? "#6b5b4c" : stokSesuai ? "#1a9850" : "#c1361f"}
          icon={stokSesuai === null ? "info" : stokSesuai ? "check_circle" : "warning"}
          text={
            stokSesuai === null
              ? "Isi stok terkini menurut permohonan dan hasil pemeriksaan lapangan untuk menilai kesesuaian stok."
              : stokSesuai
                ? "Stok terkini hasil pemeriksaan lapangan sesuai dengan yang dinyatakan dalam permohonan (selisih ≤10%)."
                : "Stok terkini hasil pemeriksaan lapangan berbeda signifikan dengan yang dinyatakan dalam permohonan (selisih >10%)."
          }
        />
      </Card>

      <ConclusionCard
        text={kesimpulan}
        onTextChange={onKesimpulanChange}
        status={status}
        onMarkSesuai={onMarkSesuai}
        onMarkTidakSesuai={onMarkTidakSesuai}
        onSubmit={onSubmit}
        canEdit={canEdit}
        submitting={submitting}
      />
    </div>
  );
}
