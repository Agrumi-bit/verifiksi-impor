"use client";

import { fmtNum, parseNumeric, type ModuleProps } from "../analysis-types";
import { Card, ConclusionCard, ModuleIntro, ResultBanner, StatBoxes } from "./shared";

export function ModalModule({
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
  const nilaiImpor = parseNumeric(inputs.nilaiImpor);
  const modalKerja = parseNumeric(inputs.modalKerja);
  const ratio = nilaiImpor && modalKerja !== null ? modalKerja / nilaiImpor : null;
  const sesuai = ratio !== null ? ratio >= 1 : null;

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <ModuleIntro
          icon="payments"
          iconColor="#2f6fe0"
          title="Analisis Kesesuaian Modal"
          subtitle="Kemampuan membeli barang yang diimpor berdasarkan kemampuan modal yang dimiliki perusahaan."
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Nilai Impor (Rp)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.nilaiImpor ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("nilaiImpor", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Modal Kerja (Rp)</div>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.modalKerja ?? ""}
              disabled={!canEdit}
              onChange={(e) => onInputChange("modalKerja", e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none disabled:opacity-60"
            />
          </div>
        </div>
        <StatBoxes items={[{ label: "Rasio Modal Kerja / Nilai Impor", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi nilai impor dan modal kerja untuk menghitung rasio."
              : sesuai
                ? "Modal kerja mencukupi untuk membeli barang yang akan diimpor."
                : "Modal kerja tidak mencukupi terhadap estimasi nilai barang impor."
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
