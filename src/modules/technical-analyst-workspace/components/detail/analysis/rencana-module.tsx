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
  const kebutuhan = parseNumeric(inputs.kebutuhanAktual);
  const rencana = parseNumeric(inputs.rencanaImpor);
  const ratio = kebutuhan && rencana !== null ? rencana / kebutuhan : null;
  const sesuai = ratio !== null ? ratio <= 1.2 : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="local_shipping"
          iconColor="#a3690a"
          title="Analisis Kebutuhan dan Rencana Impor"
          subtitle="Rencana jumlah barang yang akan diimpor dibandingkan dengan kebutuhan aktual perusahaan."
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Kebutuhan Aktual (unit/tahun)</div>
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
            <div className="mb-1 text-xs font-semibold text-[#594138]">Rencana Jumlah Impor (unit/tahun)</div>
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
        <StatBoxes items={[{ label: "Rasio Rencana / Kebutuhan", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi kebutuhan aktual dan rencana impor untuk menghitung rasio."
              : sesuai
                ? "Rencana jumlah impor sesuai dengan kebutuhan aktual perusahaan (≤1.2x)."
                : "Rencana jumlah impor melebihi kebutuhan aktual secara signifikan (>1.2x)."
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
