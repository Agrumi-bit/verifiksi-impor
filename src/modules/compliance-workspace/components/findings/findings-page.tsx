"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, SearchX, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FindingKind } from "../../consolidation";
import { FINDING_KINDS, FINDING_KIND_LABELS, FINDING_SEVERITY_LABELS } from "../../finding-rules";
import { COMPLIANCE_HOME } from "../../navigation";
import { WORKSPACE_LABELS, type WorkspaceKey } from "../../workspace-status";
import { Pill } from "../case-list/badges";
import { INPUT_CLASS } from "../styles";
import { formatDateTime } from "../case-list/format";
import { CreateFindingDialog } from "./create-finding-dialog";
import { FindingDrawer, KIND_TONE } from "./finding-drawer";
import { useFindings } from "./use-findings";

const TH = "sticky top-0 z-10 whitespace-nowrap border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
const TD = "border-b border-[#EEF2F6] px-3 py-2.5 align-top";
const SEVERITY_TONE = { TINGGI: "red", SEDANG: "orange", RENDAH: "slate" } as const;

function parseTab(value: string | null): FindingKind {
  return (FINDING_KINDS as string[]).includes(value ?? "") ? (value as FindingKind) : "OPEN";
}

export function FindingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseFilter = searchParams.get("case") ?? "";
  const [tab, setTab] = useState<FindingKind>(() => parseTab(searchParams.get("tab")));
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(searchParams.get("new") === "1");
  const { data, isLoading, isError } = useFindings();

  const all = data?.findings ?? [];
  const pics = data?.pics ?? [];
  const inCase = caseFilter ? all.filter((finding) => finding.applicationId === caseFilter) : all;
  const caseNumber = caseFilter ? (all.find((finding) => finding.applicationId === caseFilter)?.applicationNumber ?? null) : null;
  const query = q.trim().toLowerCase();
  const rows = inCase.filter(
    (finding) =>
      finding.kind === tab &&
      (!query ||
        [finding.issueNumber, finding.applicationNumber, finding.companyName, finding.title, finding.ownerName ?? ""].some((value) =>
          value.toLowerCase().includes(query),
        )),
  );

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Temuan &amp; Exception</h1>
          <p className="max-w-3xl text-[13px] text-[#64748B]">
            Issue, permintaan klarifikasi, dan conflict data lintas workspace. Tindak lanjut dicatat di sini; perbaikan data tetap
            dilakukan oleh workspace sumber.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1677FF] px-3.5 text-[13px] font-medium text-white outline-none hover:bg-[#0F62D6] focus-visible:ring-2 focus-visible:ring-[#1677FF]/40"
        >
          <Plus className="size-4" aria-hidden />
          Catat Temuan
        </button>
      </header>

      {isError && (
        <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C]">
          Gagal memuat temuan. Muat ulang halaman.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Kategori temuan" className="flex flex-wrap gap-1 rounded-xl border border-[#E5EAF0] bg-white p-1">
          {FINDING_KINDS.map((kind) => {
            const count = inCase.filter((finding) => finding.kind === kind).length;
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                onClick={() => setTab(kind)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]",
                  tab === kind ? "bg-[#10233F] text-white" : "text-[#10233F] hover:bg-[#F5F7FA]",
                )}
              >
                {FINDING_KIND_LABELS[kind]}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", tab === kind ? "bg-white/20" : "bg-[#F1F5F9] text-[#64748B]")}>{count}</span>
              </button>
            );
          })}
        </div>
        {caseFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFD7FF] bg-[#EAF2FF] py-1 pl-3 pr-1 text-[12px] font-medium text-[#0958D9]">
            Case: <span className="font-mono">{caseNumber ?? "…"}</span>
            <button
              type="button"
              onClick={() => router.replace(`${COMPLIANCE_HOME}/temuan?tab=${tab}`)}
              aria-label="Hapus filter case"
              className="flex size-5 items-center justify-center rounded-full hover:bg-white/60"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        )}
        <span className="flex-1" />
        <label className="relative w-full sm:w-[320px]">
          <span className="sr-only">Cari temuan</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
          <input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Cari case, issue, owner..." className={cn(INPUT_CLASS, "w-full pl-8")} />
        </label>
      </div>

      <div className="max-h-[calc(100vh-240px)] overflow-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-[13px]" aria-busy={isLoading}>
          <caption className="sr-only">Temuan {FINDING_KIND_LABELS[tab]}</caption>
          <thead>
            <tr>
              {["Case", "Issue", "Source Workspace", "Data A", "Data B", "Severity", "Status", "Owner", "Last Update"].map((label) => (
                <th key={label} className={TH}>{label}</th>
              ))}
              <th className={cn(TH, "w-24")}><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} aria-hidden>
                  {Array.from({ length: 10 }, (_, cell) => (
                    <td key={cell} className={TD}><span className="block h-3 animate-pulse rounded bg-[#EEF2F6]" /></td>
                  ))}
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[#64748B]">
                    <SearchX className="size-6" aria-hidden />
                    <span>Tidak ada temuan pada kategori ini.</span>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((finding) => (
                <tr key={finding.id} className="hover:bg-[#F8FAFC]">
                  <td className={TD}>
                    <Link href={`${COMPLIANCE_HOME}/permohonan/${finding.applicationId}`} className="whitespace-nowrap font-mono text-[12.5px] font-medium text-[#1677FF] hover:underline">
                      {finding.applicationNumber}
                    </Link>
                    <span className="block font-mono text-[11.5px] text-[#64748B]">{finding.issueNumber}</span>
                  </td>
                  <th scope="row" className={cn(TD, "min-w-[260px] max-w-[360px] text-left font-normal")}>{finding.title}</th>
                  <td className={cn(TD, "whitespace-nowrap")}>{WORKSPACE_LABELS[finding.sourceWorkspace as WorkspaceKey] ?? finding.sourceWorkspace}</td>
                  <td className={cn(TD, "max-w-[200px] text-[12.5px] text-[#475569]")}>{finding.evidenceA ?? "—"}</td>
                  <td className={cn(TD, "max-w-[200px] text-[12.5px] text-[#475569]")}>{finding.evidenceB ?? "—"}</td>
                  <td className={TD}><Pill tone={SEVERITY_TONE[finding.severity]}>{FINDING_SEVERITY_LABELS[finding.severity]}</Pill></td>
                  <td className={TD}><Pill tone={KIND_TONE[finding.kind]}>{FINDING_KIND_LABELS[finding.kind]}</Pill></td>
                  <td className={cn(TD, "whitespace-nowrap")}>{finding.ownerName ?? <span className="text-[#64748B]">—</span>}</td>
                  <td className={cn(TD, "whitespace-nowrap text-[12px] tabular-nums text-[#64748B]")}>{formatDateTime(finding.updatedAt)}</td>
                  <td className={TD}>
                    <button
                      type="button"
                      onClick={() => setOpenId(finding.id)}
                      className={cn(INPUT_CLASS, "whitespace-nowrap font-medium hover:bg-[#F5F7FA]")}
                    >
                      {finding.kind === "RESOLVED" ? "Lihat" : "Tindak Lanjut"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <FindingDrawer findingId={openId} pics={pics} onClose={() => setOpenId(null)} />
      <CreateFindingDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        defaultApplicationId={caseFilter}
        pics={pics}
        onCreated={(id, kind) => {
          setTab(kind);
          setOpenId(id);
        }}
      />
    </div>
  );
}
