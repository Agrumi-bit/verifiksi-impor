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
          title="Analisis Pengajuan Impor vs Kepemilikan Modal Perusahaan Importir Umum (API-U)"
          subtitle="Menilai kewajaran nilai rencana impor dibandingkan kemampuan permodalan/keuangan API-U."
        />
        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-[#594138]">Nilai Rencana Impor (Rp)</div>
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
            <div className="mb-1 text-xs font-semibold text-[#594138]">Kepemilikan Modal API-U (Rp)</div>
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
        <StatBoxes items={[{ label: "Rasio Kepemilikan Modal / Nilai Rencana Impor", value: ratio !== null ? `${fmtNum(ratio, 2)}x` : "—" }]} />
        <ResultBanner
          bg={sesuai === null ? "#f2ece5" : sesuai ? "#e2f7ea" : "#fbe4de"}
          color={sesuai === null ? "#6b5b4c" : sesuai ? "#1a9850" : "#c1361f"}
          icon={sesuai === null ? "info" : sesuai ? "check_circle" : "warning"}
          text={
            sesuai === null
              ? "Isi nilai rencana impor dan kepemilikan modal API-U untuk menghitung rasio."
              : sesuai
                ? "Kepemilikan modal API-U wajar terhadap nilai rencana impor yang diajukan."
                : "Kepemilikan modal API-U tidak mencukupi terhadap nilai rencana impor yang diajukan."
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
