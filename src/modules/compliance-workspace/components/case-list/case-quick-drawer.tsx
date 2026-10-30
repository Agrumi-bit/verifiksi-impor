"use client";

import Link from "next/link";

import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { COMPLIANCE_STATUS_LABELS, READINESS_LABELS } from "../../consolidation";
import type { CaseRow } from "../../case-list";
import { COMPLIANCE_HOME } from "../../navigation";
import { REQUIREMENTS, firstIssueStep } from "../../requirements";
import { WORKSPACE_KEYS, WORKSPACE_LABELS } from "../../workspace-status";
import { CategoryBadge, HandoverBadge, LhviuBadge, Pill, WorkspaceStateBadge } from "./badges";
import { formatCalendarDate, formatDate } from "./format";

const KIND_LABELS = { OPEN: "Open Issue", KLARIFIKASI: "Perlu Klarifikasi", CONFLICT: "Conflict", RESOLVED: "Resolved" } as const;
const REQUIREMENT_LABELS = Object.fromEntries(REQUIREMENTS.map((requirement) => [requirement.key, requirement.label])) as Record<string, string>;
const FOOTER_BUTTON =
  "inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/40";

function caseHref(applicationId: string, step = 1): string {
  return `${COMPLIANCE_HOME}/permohonan/${applicationId}?step=${step}`;
}

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** Read-only "Ringkasan Case" side panel opened from a row. */
export function CaseQuickDrawer({ row, onClose }: { row: CaseRow | null; onClose: () => void }) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-[460px] bg-white text-[#10233F]">
        {row && (
          <>
            <SheetHeader className="border-b border-[#E5EAF0]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Ringkasan Case</span>
              <SheetTitle className="font-mono text-base">{row.applicationNumber}</SheetTitle>
              <SheetDescription className="sr-only">Ringkasan read-only permohonan {row.applicationNumber}</SheetDescription>
              <div className="flex flex-wrap gap-1.5">
                <HandoverBadge handover={row.handover} />
                <CategoryBadge category={row.category} />
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-5 py-4 text-[13px]">
              <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
                <KeyValue label="No. Permohonan"><span className="font-mono">{row.applicationNumber}</span></KeyValue>
                <KeyValue label="Pemohon">{row.companyName}</KeyValue>
                <KeyValue label="NIB"><span className="font-mono">{row.nib}</span></KeyValue>
                <KeyValue label="Jenis">VIU – Barang Konsumsi</KeyValue>
                <KeyValue label="Tanggal Masuk">
                  {formatDate(row.submittedAt)}
                  {row.submittedIsSystemDate && <span className="text-[#64748B]"> (tanggal input sistem)</span>}
                </KeyValue>
                <KeyValue label="PIC Compliance">{row.picName ?? "—"}</KeyValue>
              </dl>

              <section className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[13px] font-semibold">Status Workspace</h3>
                  <span className="text-[12px] text-[#64748B] tabular-nums">Progress {row.completedWorkspaces} / 5</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]" aria-hidden>
                  <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${(row.completedWorkspaces / 5) * 100}%` }} />
                </div>
                <ul className="flex flex-col divide-y divide-[#EEF2F6]">
                  {WORKSPACE_KEYS.map((key) => (
                    <li key={key} className="flex items-center justify-between py-1.5">
                      <span>{WORKSPACE_LABELS[key]}</span>
                      <WorkspaceStateBadge state={row.workspaces[key]} />
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold">Compliance Summary</h3>
                <dl className="grid grid-cols-3 gap-2">
                  {[
                    ["Requirement", row.summary.total],
                    ["Tersedia", row.summary.available],
                    ["Menunggu", row.summary.pending],
                    ["Sesuai", row.summary.sesuai],
                    ["Temuan aktif", row.summary.activeFindings],
                    ["Administratif", `${row.summary.administrative}/2`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#F5F7FA] px-2.5 py-2">
                      <dt className="text-[11px] text-[#64748B]">{label}</dt>
                      <dd className="text-[15px] font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[12px] text-[#64748B]">
                  Skor {row.summary.score}% · Status {COMPLIANCE_STATUS_LABELS[row.complianceStatus]} · Readiness {READINESS_LABELS[row.readiness]}
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold">Issue Aktif ({row.activeFindings.length})</h3>
                {row.activeFindings.length === 0 ? (
                  <p className="text-[12px] text-[#64748B]">Tidak ada issue aktif.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {row.activeFindings.map((finding) => (
                      <li key={finding.id} className="rounded-lg border border-[#E5EAF0] px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[12px] font-medium">{finding.issueNumber}</span>
                          <Pill tone={finding.kind === "KLARIFIKASI" ? "orange" : "red"}>{KIND_LABELS[finding.kind]}</Pill>
                          <span className="text-[11.5px] text-[#64748B]">{REQUIREMENT_LABELS[finding.requirementKey] ?? finding.requirementKey}</span>
                        </div>
                        <p className="mt-0.5 text-[12.5px]">{finding.title}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold">LHVIU</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <LhviuBadge issued={row.lhviuIssued} />
                  {row.lhviuNumber && <span className="font-mono text-[12px]">{row.lhviuNumber}</span>}
                  {row.lhviuIssuedAt && <span className="text-[12px] text-[#64748B]">terbit {formatCalendarDate(row.lhviuIssuedAt)}</span>}
                </div>
                <p className="text-[12px] text-[#64748B]">Diterbitkan oleh Project Manager. Compliance hanya melihat.</p>
              </section>
            </SheetBody>
            <SheetFooter className="border-[#E5EAF0] bg-white">
              {(() => {
                const issueStep = firstIssueStep(row.activeFindings);
                return issueStep ? (
                  <Link href={caseHref(row.applicationId, issueStep)} className={cn(FOOTER_BUTTON, "border border-[#E5EAF0] text-[#10233F] hover:bg-[#F5F7FA]")}>
                    Lihat Issue ({row.activeFindings.length})
                  </Link>
                ) : (
                  <span aria-disabled="true" title="Tidak ada issue aktif" className={cn(FOOTER_BUTTON, "cursor-not-allowed border border-[#E5EAF0] text-[#94A3B8]")}>
                    Lihat Issue
                  </span>
                );
              })()}
              <Link href={caseHref(row.applicationId)} className={cn(FOOTER_BUTTON, "bg-[#1677FF] text-white hover:bg-[#0F62D6]")}>
                Buka Compliance Case
              </Link>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
