"use client";

import type { ReactNode } from "react";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

/** Allowed headroom of the import plan over the partners' net need before it reads as unjustified — same as the VIU Industri LHVKI check. */
const TOLERANCE = 1.2;

function NumberInput({ label, value, onChange, disabled, placeholder = "0" }: { label: ReactNode; value: string; onChange: (v: string) => void; disabled: boolean; placeholder?: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-[#594138]">{label}</div>
      <input
        type="text"
        inputMode="decimal"
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
 * VIU Bahan Baku Non Industri — there is no LHVKI behind a non-industri partner (Ps 37 ayat (2) huruf b), so the
 * import plan is checked against the partners' 1-year need stated in their contracts minus API-U's current stock
 * (Ps 37 ayat (2) huruf b angka 1; the LHVIU reports that need per Ps 39 ayat (4) huruf d).
 */
export function KebutuhanNonIndustriModule({
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
  const kebutuhan = parseNumeric(inputs.kebutuhanKontrak);
  const stok = parseNumeric(inputs.stokTerkini) ?? 0;
  const rencana = parseNumeric(inputs.rencanaImpor);
  const kebutuhanBersih = kebutuhan !== null ? Math.max(kebutuhan - stok, 0) : null;
  const ratio = kebutuhanBersih && rencana !== null ? rencana / kebutuhanBersih : null;
  const sesuai = ratio !== null ? ratio <= TOLERANCE : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="handshake"
          iconColor="#a3690a"
          title="Analisis Kesesuaian Rencana Impor API-U terhadap Kebutuhan Perusahaan Non Industri Mitra"
          subtitle="Memastikan volume impor yang diajukan berdasar pada kebutuhan 1 tahun Perusahaan Non Industri yang memiliki kontrak kerja sama/jual beli dengan API-U, setelah memperhitungkan stok terkini (Pasal 37 ayat (2) huruf b dan Pasal 39 ayat (4) huruf d Permenperin 27/2025)."
        />
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold text-[#594138]">HS Code / Jenis Barang yang Diperiksa</div>
          <input
            type="text"
            value={inputs.hsCode ?? ""}
            disabled={!canEdit}
            onChange={(e) => onInputChange("hsCode", e.target.value)}
            placeholder="Contoh: 5208.11.00"
            className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <NumberInput label="Kebutuhan Mitra Non Industri sesuai Kontrak (unit/tahun)" value={inputs.kebutuhanKontrak ?? ""} onChange={(v) => onInputChange("kebutuhanKontrak", v)} disabled={!canEdit} />
          <NumberInput label="Stok Terkini API-U (unit)" value={inputs.stokTerkini ?? ""} onChange={(v) => onInputChange("stokTerkini", v)} disabled={!canEdit} />
          <NumberInput label="Volume Permohonan Impor API-U (unit/tahun)" value={inputs.rencanaImpor ?? ""} onChange={(v) => onInputChange("rencanaImpor", v)} disabled={!canEdit} />
        </div>
        <StatBoxes
          items={[
            { label: "Kebutuhan Bersih (Kebutuhan − Stok)", value: fmtNum(kebutuhanBersih, 2) },
            { label: "Rasio Permohonan / Kebutuhan Bersih", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" },
          ]}
        />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi kebutuhan mitra non industri sesuai kontrak, stok terkini, dan volume permohonan impor untuk menghitung rasio."
              : sesuai
                ? `Volume permohonan impor wajar terhadap kebutuhan bersih mitra non industri (≤${TOLERANCE}x).`
                : `Volume permohonan impor melebihi kebutuhan bersih mitra non industri secara signifikan (>${TOLERANCE}x).`
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
