"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

export function RencanaModule({
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
  const kebutuhanLhvki = parseNumeric(inputs.kebutuhanAktual);
  const volumePermohonan = parseNumeric(inputs.rencanaImpor);
  const ratio = kebutuhanLhvki && volumePermohonan !== null ? volumePermohonan / kebutuhanLhvki : null;
  const sesuai = ratio !== null ? ratio <= 1.2 : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="local_shipping"
          iconColor="#a3690a"
          title="Analisis Kesesuaian HS Code dan Volume Permohonan API-U terhadap LHVKI Mitra Industri"
          subtitle="Memastikan barang/HS Code dan volume yang diajukan API-U memiliki dasar kebutuhan dari perusahaan industri mitra."
        />
        <div className="mb-4">
          <div className="mb-1 text-xs font-semibold text-[#594138]">HS Code yang Diperiksa</div>
          <input
            type="text"
            value={inputs.hsCode ?? ""}
            disabled={!canEdit}
            onChange={(e) => onInputChange("hsCode", e.target.value)}
            placeholder="Contoh: 3901.10.10"
            className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Volume Kebutuhan Menurut LHVKI Mitra Industri (unit/tahun)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.kebutuhanAktual ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("kebutuhanAktual", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Volume Permohonan Impor API-U (unit/tahun)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.rencanaImpor ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("rencanaImpor", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
        </div>
        <StatBoxes items={[{ label: "Rasio Permohonan / Kebutuhan LHVKI", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi volume kebutuhan menurut LHVKI mitra industri dan volume permohonan impor API-U untuk menghitung rasio."
              : sesuai
                ? "Volume permohonan impor API-U memiliki dasar kebutuhan yang wajar dari LHVKI mitra industri (≤1.2x)."
                : "Volume permohonan impor API-U melebihi kebutuhan yang tercantum pada LHVKI mitra industri secara signifikan (>1.2x)."
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
