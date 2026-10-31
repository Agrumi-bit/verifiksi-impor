import Link from "next/link";
import { ArrowRight, FileText, History, Route } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import { COMPLIANCE_HOME } from "../../navigation";
import { TRAIL_SOURCE_LABELS, TRAIL_SOURCES, type HistoryRow, type LineageRow, type TrailEvent, type TrailSource } from "../../traceability";
import { formatDateTime } from "../case-list/format";
import { INPUT_CLASS } from "../styles";

export const AUDIT_TABS = ["trail", "lineage", "history"] as const;
export type AuditTab = (typeof AUDIT_TABS)[number];
const TAB_LABELS: Record<AuditTab, string> = { trail: "Audit Trail", lineage: "Data Lineage", history: "Riwayat Perubahan" };
const TAB_DESCRIPTIONS: Record<AuditTab, string> = {
  trail: "Timeline aktivitas lintas workspace per case, dari data yang tercatat di sistem.",
  lineage: "Asal setiap field LHVIU: Field → Workspace Sumber → Dokumen Sumber → Data.",
  history: "Perubahan status dan nilai yang tercatat, termasuk perubahan status temuan dan cek administratif.",
};
const SOURCE_TONE: Record<TrailSource, string> = {
  CR: "bg-[#EAF2FF] text-[#1D4ED8]",
  SV: "bg-[#ECFDF3] text-[#15803D]",
  VF: "bg-[#F3EEFF] text-[#6D28D9]",
  PM: "bg-[#FFF7E6] text-[#B45309]",
  CMP: "bg-[#10233F] text-white",
  COMPANY: "bg-[#F1F5F9] text-[#475569]",
  ADMIN: "bg-[#FEF2F2] text-[#B91C1C]",
  SYSTEM: "bg-[#F1F5F9] text-[#475569]",
};

type CaseOption = { applicationId: string; applicationNumber: string; companyName: string };

function href(params: { tab: AuditTab; case?: string; ws?: string }): string {
  const search = new URLSearchParams({ tab: params.tab });
  if (params.case) search.set("case", params.case);
  if (params.ws) search.set("ws", params.ws);
  return `${COMPLIANCE_HOME}/audit?${search}`;
}

function SourceBadge({ source }: { source: TrailSource }) {
  return <span className={cn("whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold", SOURCE_TONE[source])}>{TRAIL_SOURCE_LABELS[source]}</span>;
}

function CasePicker({ tab, cases, selected, allowAll }: { tab: AuditTab; cases: CaseOption[]; selected: string; allowAll: boolean }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tab" value={tab} />
      <label htmlFor="audit-case" className="text-[12px] text-[#64748B]">Case</label>
      <select id="audit-case" name="case" defaultValue={selected} className={cn(INPUT_CLASS, "min-w-[300px]")}>
        <option value="">{allowAll ? "Semua permohonan" : "Pilih permohonan…"}</option>
        {cases.map((option) => (
          <option key={option.applicationId} value={option.applicationId}>{option.applicationNumber} · {option.companyName}</option>
        ))}
      </select>
      <button type="submit" className={cn(INPUT_CLASS, "font-medium hover:bg-[#F5F7FA]")}>Tampilkan</button>
    </form>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof History; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-14 text-center text-[#64748B]">
      <Icon className="size-6" aria-hidden />
      <p className="text-[13px]">{text}</p>
    </div>
  );
}

function TrailPanel({ events, caseId, ws, limited }: { events: TrailEvent[]; caseId: string; ws: string; limited: boolean }) {
  const shown = ws ? events.filter((event) => event.source === ws) : events;
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filter workspace" className="flex flex-wrap gap-1.5">
        {["", ...TRAIL_SOURCES].map((source) => {
          const isOn = ws === source;
          return (
            <Link
              key={source || "all"}
              href={href({ tab: "trail", case: caseId, ws: source })}
              aria-current={isOn ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium",
                isOn ? "border-[#1677FF] bg-[#1677FF] text-white" : "border-[#E5EAF0] bg-white hover:bg-[#F5F7FA]",
              )}
            >
              {source ? TRAIL_SOURCE_LABELS[source as TrailSource] : "Semua"}
            </Link>
          );
        })}
      </div>
      {limited && <p className="text-[12px] text-[#64748B]">Menampilkan aktivitas terbaru. Pilih case untuk melihat timeline lengkapnya.</p>}
      {shown.length === 0 ? (
        <Empty icon={History} text="Tidak ada aktivitas untuk filter ini." />
      ) : (
        <ol className="flex flex-col rounded-xl border border-[#E5EAF0] bg-white px-5 py-3 shadow-sm">
          {shown.map((event, index) => (
            <li key={event.id} className="grid grid-cols-[150px_16px_1fr] gap-3">
              <span className="pt-2.5 text-[12px] tabular-nums text-[#64748B]">{formatDateTime(event.at)}</span>
              <span aria-hidden className="flex flex-col items-center">
                <span className="mt-3.5 size-2.5 shrink-0 rounded-full bg-[#94A3B8]" />
                {index < shown.length - 1 && <span className="w-px flex-1 bg-[#E5EAF0]" />}
              </span>
              <div className="flex flex-col gap-0.5 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={event.source} />
                  <Link href={`${COMPLIANCE_HOME}/permohonan/${event.applicationId}`} className="font-mono text-[12px] text-[#1677FF] hover:underline">
                    {event.applicationNumber}
                  </Link>
                </div>
                <span className="text-[13px]">{event.text}</span>
                {event.by && <span className="text-[11.5px] text-[#64748B]">oleh {event.by}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LineagePanel({ rows, caseId }: { rows: LineageRow[]; caseId: string }) {
  if (!caseId) return <Empty icon={Route} text="Pilih permohonan untuk menelusuri asal data LHVIU-nya." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
      <ul className="flex min-w-[900px] flex-col divide-y divide-[#EEF2F6]">
        {rows.map((row) => (
          <li key={row.field} className="grid grid-cols-[1fr_16px_1fr_16px_1.2fr_16px_1.6fr_auto] items-center gap-2 px-4 py-3 text-[13px]">
            <span className="font-medium">{row.field}</span>
            <ArrowRight className="size-3.5 text-[#94A3B8]" aria-hidden />
            <span><span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">{row.sourceLabel}</span></span>
            <ArrowRight className="size-3.5 text-[#94A3B8]" aria-hidden />
            {row.evidence ? (
              <a href={fileHref(row.evidence.path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#1677FF] hover:underline">
                <FileText className="size-3.5 shrink-0" aria-hidden />
                {row.document}
                <span className="sr-only">(buka di tab baru)</span>
              </a>
            ) : (
              <span>{row.document}</span>
            )}
            <ArrowRight className="size-3.5 text-[#94A3B8]" aria-hidden />
            <span className={cn("min-w-0 break-words", !row.ready && "text-[#B45309]")}>{row.data}</span>
            <Link href={`${COMPLIANCE_HOME}/permohonan/${caseId}?step=${row.step}`} className={cn(INPUT_CLASS, "inline-flex h-8 items-center whitespace-nowrap font-medium hover:bg-[#F5F7FA]")}>
              Buka tahap
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryPanel({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) return <Empty icon={History} text="Belum ada perubahan nilai yang tercatat." />;
  const th = "sticky top-0 whitespace-nowrap border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
  const td = "border-b border-[#EEF2F6] px-3 py-2.5 align-top";
  return (
    <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[13px]">
        <caption className="sr-only">Riwayat perubahan</caption>
        <thead>
          <tr>{["Waktu", "Case", "Field / Objek", "Sebelum", "Sesudah", "Oleh", "Workspace"].map((label) => <th key={label} className={th}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#F8FAFC]">
              <td className={cn(td, "whitespace-nowrap tabular-nums text-[12px] text-[#64748B]")}>{formatDateTime(row.at)}</td>
              <td className={td}>
                <Link href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}`} className="whitespace-nowrap font-mono text-[12px] text-[#1677FF] hover:underline">{row.applicationNumber}</Link>
              </td>
              <th scope="row" className={cn(td, "text-left font-medium")}>{row.field}</th>
              <td className={cn(td, "max-w-[220px] break-words text-[#64748B]")}>{row.before}</td>
              <td className={cn(td, "max-w-[220px] break-words")}>{row.after}</td>
              <td className={cn(td, "whitespace-nowrap")}>{row.by ?? "—"}</td>
              <td className={td}><SourceBadge source={row.source} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditView({
  tab,
  caseId,
  ws,
  cases,
  trail,
  trailLimited,
  lineage,
  history,
}: {
  tab: AuditTab;
  caseId: string;
  ws: string;
  cases: CaseOption[];
  trail: TrailEvent[];
  trailLimited: boolean;
  lineage: LineageRow[];
  history: HistoryRow[];
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{TAB_LABELS[tab]}</h1>
          <p className="text-[13px] text-[#64748B]">{TAB_DESCRIPTIONS[tab]}</p>
        </div>
        <CasePicker tab={tab} cases={cases} selected={caseId} allowAll={tab !== "lineage"} />
      </header>
      <nav aria-label="Audit & Traceability" className="flex w-fit gap-1 rounded-xl border border-[#E5EAF0] bg-white p-1">
        {AUDIT_TABS.map((item) => (
          <Link
            key={item}
            href={href({ tab: item, case: caseId })}
            aria-current={tab === item ? "page" : undefined}
            className={cn("rounded-lg px-3 py-1.5 text-[13px] font-medium", tab === item ? "bg-[#10233F] text-white" : "hover:bg-[#F5F7FA]")}
          >
            {TAB_LABELS[item]}
          </Link>
        ))}
      </nav>
      {tab === "trail" && <TrailPanel events={trail} caseId={caseId} ws={ws} limited={trailLimited} />}
      {tab === "lineage" && <LineagePanel rows={lineage} caseId={caseId} />}
      {tab === "history" && <HistoryPanel rows={history} />}
    </div>
  );
}
