import { Download, Eye } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { Evidence } from "../../case-detail";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_TONES, documentSummary, type DocumentRow } from "../../document-matrix";
import type { Verdict } from "../../konsumsi-stages";
import { Pill } from "../case-list/badges";

/** Building blocks shared by the Verifikator-style stage layouts (Tahap 2–8). Read only. */

export const TH = "border-b border-[#EEF2F6] px-4 py-3 text-left align-bottom text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
export const TD = "border-b border-[#EEF2F6] px-4 py-3.5 align-top";

export function StageCard({ title, description, aside, children }: { title: string; description?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
      <div className="flex flex-col gap-2 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold">{title}</h3>
            {description && <p className="text-[13px] text-[#64748B]">{description}</p>}
          </div>
          {aside}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A read-only labelled value, styled like the Verifikator design's locked input. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-[#64748B]">{label}</span>
      <div className="min-h-11 rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] px-3.5 py-2.5 text-[13.5px]">{children}</div>
    </div>
  );
}

export function DataTable({ caption, headers, minWidth = 1000, empty, children }: { caption: string; headers: string[]; minWidth?: number; empty?: string | false; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border-t border-[#EEF2F6]">
      <table className="w-full border-separate border-spacing-0 text-[13px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{headers.map((label) => <th key={label} className={TH}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {empty && (
            <tr><td colSpan={headers.length} className="px-6 py-10 text-center text-[#64748B]">{empty}</td></tr>
          )}
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return <Pill tone={verdict.tone}>{verdict.label}</Pill>;
}

export function DocumentChip({ document }: { document: Evidence | null }) {
  if (!document) return <span className="text-[12.5px] text-[#64748B]">Tidak diunggah</span>;
  return (
    <div className="flex w-fit items-center gap-2 rounded-lg border border-[#E5EAF0] px-2.5 py-2">
      <span className="rounded bg-[#FEF2F2] px-1.5 py-1 text-[10px] font-bold text-[#B91C1C]">PDF</span>
      <span className="max-w-[140px] truncate text-[12.5px] text-[#1677FF]" title={document.label}>{document.label}</span>
      <a href={fileHref(document.path)} target="_blank" rel="noopener noreferrer" aria-label={`Lihat ${document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
        <Eye className="size-4" aria-hidden />
      </a>
      <a href={fileHref(document.path)} download aria-label={`Unduh ${document.label}`} className="rounded p-1 text-[#64748B] hover:bg-[#F5F7FA]">
        <Download className="size-4" aria-hidden />
      </a>
    </div>
  );
}

export function DocumentStatus({ row }: { row: DocumentRow | null }) {
  if (!row) return <span className="text-[12.5px] text-[#64748B]">—</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <Pill tone={VERIFICATION_STATUS_TONES[row.status]}>{VERIFICATION_STATUS_LABELS[row.status]}</Pill>
      {row.verifiedBy && <span className="text-[11.5px] text-[#64748B]">oleh {row.verifiedBy}</span>}
      {row.note && <span className="max-w-[200px] text-[11.5px] text-[#B45309]">{row.note}</span>}
    </div>
  );
}

export function RequirementTag({ value }: { value: string }) {
  return (
    <span className={cn("whitespace-nowrap rounded px-2 py-0.5 text-[11.5px] font-semibold", value === "Wajib" ? "bg-[#EAF2FF] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#475569]")}>
      {value}
    </span>
  );
}

export function SummaryChips({ rows }: { rows: DocumentRow[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Ringkasan status verifikasi">
      {documentSummary(rows).map((item) => (
        <li key={item.status}>
          <Pill tone={VERIFICATION_STATUS_TONES[item.status]} className="border border-current/20">
            {VERIFICATION_STATUS_LABELS[item.status]} <span className="font-semibold tabular-nums">{item.count}</span>
          </Pill>
        </li>
      ))}
    </ul>
  );
}

export function PendingHandover({ handedOver, who = "Verifikator" }: { handedOver: boolean; who?: string }) {
  if (handedOver) return null;
  return <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-[12.5px] text-[#B45309]">{who} belum menyelesaikan pemeriksaan — status di bawah masih dapat berubah.</p>;
}

const NUMBER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
export function formatNumber(value: number): string {
  return NUMBER.format(value);
}
export function formatMoney(value: number, currency: string): string {
  return `${currency} ${NUMBER.format(value)}`;
}
