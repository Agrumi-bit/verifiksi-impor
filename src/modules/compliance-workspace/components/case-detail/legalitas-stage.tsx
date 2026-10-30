import { Check, Download, Eye, Info } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES, legalitasSummary } from "../../legalitas";
import type { LegalitasStage as LegalitasStageData } from "../../server/load-legalitas";
import { Pill } from "../case-list/badges";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-[#64748B]">{label}</span>
      <div className="min-h-11 rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] px-3.5 py-2.5 text-[13.5px]">{children}</div>
    </div>
  );
}

/**
 * Tahap 2 "Perusahaan & Legalitas" — the Verifikator design's layout, read only: no Edit, and the
 * verification status is shown as recorded instead of a dropdown.
 */
export function LegalitasStage({ data, handedOver }: { data: LegalitasStageData; handedOver: boolean }) {
  const { company, kbli, rows } = data;
  const summary = legalitasSummary(rows);
  const settled = rows.filter((row) => row.status === "VERIFIED" || row.status === "NOT_APPLICABLE").length;

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
          <ul className="flex flex-wrap gap-2" aria-label="Ringkasan status verifikasi">
            {summary.map((item) => (
              <li key={item.status}>
                <Pill tone={VERIFICATION_STATUS_TONES[item.status]} className="border border-current/20">
                  {VERIFICATION_STATUS_LABELS[item.status]} <span className="font-semibold tabular-nums">{item.count}</span>
                </Pill>
              </li>
            ))}
          </ul>
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
                  <td className="border-b border-[#EEF2F6] px-4 py-3">
                    {row.document ? (
                      <div className="flex w-fit items-center gap-2 rounded-lg border border-[#E5EAF0] px-2.5 py-2">
                        <span className="rounded bg-[#FEF2F2] px-1.5 py-1 text-[10px] font-bold text-[#B91C1C]">PDF</span>
                        <span className="max-w-[140px] truncate text-[12.5px] text-[#1677FF]">{row.document.label}</span>
                        <a href={fileHref(row.document.path)} target="_blank" rel="noopener noreferrer" aria-label={`Lihat ${row.document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
                          <Eye className="size-4" aria-hidden />
                        </a>
                        <a href={fileHref(row.document.path)} download aria-label={`Unduh ${row.document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
                          <Download className="size-4" aria-hidden />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-[#64748B]">Tidak diunggah</span>
                    )}
                  </td>
                  <td className="border-b border-[#EEF2F6] px-4 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <Pill tone={VERIFICATION_STATUS_TONES[row.status]}>{VERIFICATION_STATUS_LABELS[row.status]}</Pill>
                      {row.verifiedBy && <span className="text-[11.5px] text-[#64748B]">oleh {row.verifiedBy}</span>}
                      {row.note && <span className="max-w-[200px] text-[11.5px] text-[#B45309]">{row.note}</span>}
                    </div>
                  </td>
                  <td className="border-b border-[#EEF2F6] px-4 py-4">
                    <span className={cn("rounded px-2 py-0.5 text-[11.5px] font-semibold", row.requirement === "Wajib" ? "bg-[#EAF2FF] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#475569]")}>
                      {row.requirement}
                    </span>
                  </td>
                  <td className="max-w-[240px] border-b border-[#EEF2F6] px-4 py-4 text-[12.5px] text-[#475569]">{row.regulation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap justify-between gap-2 px-6 py-4 text-[12.5px] text-[#64748B]">
          <span>{settled} dari {rows.length} dokumen berstatus Terverifikasi atau Tidak Berlaku.</span>
          <span>Status berasal dari Verifikator / Customer Relation.</span>
        </div>
      </section>
    </>
  );
}
