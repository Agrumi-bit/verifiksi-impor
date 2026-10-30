import Link from "next/link";
import { Download, Eye, FileCheck2, Search } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { IssuedLhviu } from "../../server/load-lhviu";
import { COMPLIANCE_HOME } from "../../navigation";
import { Pill } from "../case-list/badges";
import { formatCalendarDate } from "../case-list/format";
import { INPUT_CLASS } from "../styles";

type Row = IssuedLhviu & { validUntil: string; status: "Berlaku" | "Kedaluwarsa" };

const TH = "sticky top-0 z-10 whitespace-nowrap border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
const TD = "border-b border-[#EEF2F6] px-3 py-2.5 align-middle";

/** LHVIU issued by the Project Manager Workspace — Compliance only views and downloads them. */
export function LhviuView({ rows, q }: { rows: Row[]; q: string }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">LHVIU &amp; Final Output</h1>
          <p className="max-w-3xl text-[13px] text-[#64748B]">
            LHVIU yang telah diterbitkan oleh Project Manager Workspace. Penerbitan, approval, dan publikasi tidak dilakukan di
            Compliance Workspace.
          </p>
        </div>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569]">Sumber: Project Manager Workspace</span>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-sm">
        <label className="relative min-w-[280px] flex-1">
          <span className="sr-only">Cari LHVIU</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
          <input name="q" type="search" defaultValue={q} placeholder="Cari nomor LHVIU, permohonan, perusahaan, NIB..." className={cn(INPUT_CLASS, "w-full pl-8")} />
        </label>
        <button type="submit" className={cn(INPUT_CLASS, "font-medium hover:bg-[#F5F7FA]")}>Cari</button>
        <span className="text-[12.5px] tabular-nums text-[#64748B]">{rows.length} LHVIU</span>
      </form>

      <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">Daftar LHVIU VIU Barang Konsumsi</caption>
          <thead>
            <tr>
              {["Nomor LHVIU", "No. Permohonan", "Perusahaan", "NIB", "Tanggal Terbit", "Berlaku Sampai", "Diterbitkan oleh", "Status"].map((label) => (
                <th key={label} className={TH}>{label}</th>
              ))}
              <th className={TH}><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[#64748B]">
                    <FileCheck2 className="size-6" aria-hidden />
                    <span>{q ? "Tidak ada LHVIU yang cocok." : "Belum ada LHVIU yang diterbitkan untuk VIU Barang Konsumsi."}</span>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.applicationId} className="hover:bg-[#F8FAFC]">
                <th scope="row" className={cn(TD, "whitespace-nowrap text-left font-mono font-medium")}>{row.number}</th>
                <td className={TD}>
                  <Link href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}?step=11`} className="whitespace-nowrap font-mono text-[12.5px] text-[#1677FF] hover:underline">
                    {row.applicationNumber}
                  </Link>
                </td>
                <td className={cn(TD, "min-w-[200px]")}>{row.companyName}</td>
                <td className={cn(TD, "font-mono text-[12px]")}>{row.nib}</td>
                <td className={cn(TD, "whitespace-nowrap")}>{formatCalendarDate(row.issuedAt)}</td>
                <td className={cn(TD, "whitespace-nowrap")}>{formatCalendarDate(row.validUntil)}</td>
                <td className={cn(TD, "whitespace-nowrap")}>{row.uploadedByName ?? "—"}</td>
                <td className={TD}><Pill tone={row.status === "Berlaku" ? "green" : "slate"}>{row.status}</Pill></td>
                <td className={TD}>
                  <div className="flex gap-1.5">
                    <a
                      href={fileHref(row.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(INPUT_CLASS, "inline-flex h-8 items-center gap-1 font-medium hover:bg-[#F5F7FA]")}
                    >
                      <Eye className="size-3.5" aria-hidden />
                      Preview
                    </a>
                    <a href={fileHref(row.path)} download={row.fileName} className={cn(INPUT_CLASS, "inline-flex h-8 items-center gap-1 font-medium hover:bg-[#F5F7FA]")}>
                      <Download className="size-3.5" aria-hidden />
                      Download
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-[#64748B]">
        Tanggal terbit berasal dari Project Manager Workspace; masa berlaku 1 tahun sejak tanggal terbit. Compliance Workspace hanya menampilkannya.
      </p>
    </div>
  );
}
