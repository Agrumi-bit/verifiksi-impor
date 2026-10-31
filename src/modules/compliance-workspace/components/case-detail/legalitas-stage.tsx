import { Check, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LegalitasStage as LegalitasStageData } from "../../server/load-legalitas";
import { Pill } from "../case-list/badges";
import { DocumentChip, DocumentStatus, Field, RequirementTag, SummaryChips } from "./stage-ui";

/**
 * Tahap 2 "Perusahaan & Legalitas" — the Verifikator design's layout, read only: no Edit, and the
 * verification status is shown as recorded instead of a dropdown.
 */
export function LegalitasStage({ data, handedOver }: { data: LegalitasStageData; handedOver: boolean }) {
  const { company, kbli, rows } = data;
  const verified = rows.filter((row) => row.status === "VERIFIED").length;

  return (
    <>
      <section className="rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
        <div className="border-b border-[#EEF2F6] px-6 py-5">
          <h3 className="text-[17px] font-semibold">Data Perusahaan (API-U)</h3>
          <p className="text-[13px] text-[#64748B]">Identitas dan legalitas Angka Pengenal Importir Umum (API-U), seperti yang diajukan.</p>
        </div>
        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
            <Field label="Nama Perusahaan">{company.name}</Field>
            <Field label="NIB"><span className="font-mono">{company.nib}</span></Field>
            <Field label="NPWP"><span className="font-mono">{company.npwp}</span></Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] text-[#64748B]">Status Perusahaan</span>
              <span className="py-2.5">
                {company.active === null ? "—" : company.active ? <Pill tone="green">Aktif</Pill> : <Pill tone="slate">Nonaktif</Pill>}
              </span>
            </div>
            <Field label="KBLI Utama">{company.kbliUtama}</Field>
            <Field label="Alamat Kantor">{company.officeAddress}</Field>
            <Field label="Jenis API">{company.apiType}</Field>
            <Field label="PIC Perusahaan">{company.pic}</Field>
          </div>

          <div className="flex gap-3 rounded-xl border border-[#BFD7FF] bg-[#F0F6FF] px-5 py-4">
            <Info className="mt-0.5 size-4.5 shrink-0 text-[#1677FF]" aria-hidden />
            <div className="flex flex-col gap-2">
              <p className="text-[13.5px] font-semibold">KBLI yang diperbolehkan:</p>
              <ul className="flex flex-wrap gap-2">
                {kbli.allowed.map((code) => {
                  const isMatch = kbli.matched.includes(code);
                  return (
                    <li
                      key={code}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[12.5px] font-medium",
                        isMatch ? "border-[#1677FF] bg-[#1677FF] text-white" : "border-[#D6E4F5] bg-white text-[#334155]",
                      )}
                    >
                      {isMatch && <Check className="size-3.5" aria-hidden />}
                      {code}
                      {isMatch && <span className="sr-only">(KBLI Utama perusahaan)</span>}
                    </li>
                  );
                })}
              </ul>
              <p className={cn("text-[13px]", kbli.ok ? "text-[#15803D]" : "text-[#B91C1C]")}>
                {kbli.ok
                  ? `KBLI Utama perusahaan (${kbli.matched.join(", ")}) termasuk dalam daftar yang diperbolehkan.`
                  : "KBLI Utama perusahaan tidak termasuk dalam daftar yang diperbolehkan."}
              </p>
              {kbli.regulation && <p className="text-[12px] text-[#64748B]">Note: Sesuai {kbli.regulation}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
        <div className="flex flex-col gap-2 px-6 py-5">
          <h3 className="text-[17px] font-semibold">Matriks Pemeriksaan Perusahaan &amp; Legalitas</h3>
          <p className="text-[13px] text-[#64748B]">
            Setiap dokumen dengan status yang dicatat workspace sumber, tipe wajib dan dasar regulasinya. Compliance hanya menampilkan.
          </p>
          {!handedOver && (
            <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-[12.5px] text-[#B45309]">
              Verifikator belum menyelesaikan pemeriksaan — status di bawah masih dapat berubah.
            </p>
          )}
          <SummaryChips rows={rows} />
        </div>

        <div className="overflow-x-auto border-t border-[#EEF2F6]">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-[13px]">
            <caption className="sr-only">Matriks pemeriksaan perusahaan dan legalitas</caption>
            <thead>
              <tr>
                {["No.", "Data / Parameter", "Isian", "Dokumen Tersedia", "Status Verifikasi", "Tipe Wajib dalam Regulasi", "Note Regulasi"].map((label) => (
                  <th key={label} className="border-b border-[#EEF2F6] px-4 py-3 text-left align-bottom text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-[#64748B]">Belum ada dokumen legalitas pada permohonan ini.</td></tr>
              )}
              {rows.map((row, index) => (
                <tr key={row.key} className="align-top">
                  <td className="border-b border-[#EEF2F6] px-4 py-4 text-[#64748B] tabular-nums">{index + 1}</td>
                  <th scope="row" className="border-b border-[#EEF2F6] px-4 py-4 text-left font-semibold">{row.label}</th>
                  <td className="border-b border-[#EEF2F6] px-4 py-4 font-medium">{row.value}</td>
                  <td className="border-b border-[#EEF2F6] px-4 py-3"><DocumentChip document={row.document} /></td>
                  <td className="border-b border-[#EEF2F6] px-4 py-4"><DocumentStatus row={row} /></td>
                  <td className="border-b border-[#EEF2F6] px-4 py-4">
                    <RequirementTag value={row.requirement} />
                  </td>
                  <td className="max-w-[240px] border-b border-[#EEF2F6] px-4 py-4 text-[12.5px] text-[#475569]">{row.regulation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap justify-between gap-2 px-6 py-4 text-[12.5px] text-[#64748B]">
          <span>{verified} dari {rows.length} dokumen berstatus Terverifikasi. Dokumen yang dinyatakan Tidak Berlaku oleh Verifikator tidak ditampilkan.</span>
          <span>Status berasal dari Verifikator / Customer Relation.</span>
        </div>
      </section>
    </>
  );
}
