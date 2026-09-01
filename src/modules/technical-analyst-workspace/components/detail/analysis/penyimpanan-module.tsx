"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

export function PenyimpananModule({
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
  const kapasitas = parseNumeric(inputs.kapasitasGudang);
  const stok = parseNumeric(inputs.stokTerkini) ?? 0;
  const rencana = parseNumeric(inputs.rencanaImpor) ?? 0;
  const pct = kapasitas ? Math.round(((stok + rencana) / kapasitas) * 100) : null;
  const sesuai = pct !== null ? pct <= 100 : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="warehouse"
          iconColor="#1a9850"
          title="Analisis Pengajuan Impor vs Kapasitas Gudang API-U"
          subtitle="Memastikan volume barang yang diajukan masih rasional terhadap kemampuan penyimpanan dan pengelolaan barang API-U."
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Kapasitas Gudang API-U (m³)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.kapasitasGudang ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("kapasitasGudang", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Stok Terkini (m³)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.stokTerkini ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("stokTerkini", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Volume Pengajuan Impor (m³)</div>
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
        <div className="mb-1.5 flex justify-between text-[11.5px] text-[#8a7565]">
          <span>Kapasitas Terpakai (Stok + Rencana Impor)</span>
          <span className="font-bold text-[#20180f]">{pct !== null ? `${pct}%` : "—"}</span>
        </div>
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[#f0ded0]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: sesuai === false ? "#c1361f" : "#1a9850" }}
          />
        </div>
        <StatBoxes items={[{ label: "Total Kebutuhan Ruang", value: `${fmtNum(stok + rencana)} m³` }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi kapasitas gudang API-U, stok terkini, dan volume pengajuan impor untuk menghitung utilisasi."
              : sesuai
                ? "Volume pengajuan impor masih rasional terhadap kapasitas penyimpanan dan pengelolaan barang API-U."
                : `Volume pengajuan impor tidak rasional terhadap kapasitas gudang API-U — total ${pct}% dari kapasitas.`
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
