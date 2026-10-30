import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CaseRow } from "../../case-list";
import { CASE_CATEGORIES, CASE_CATEGORY_LABELS } from "../../consolidation";
import type { DashboardSummary } from "../../dashboard";
import { FINDING_KIND_LABELS } from "../../finding-rules";
import { COMPLIANCE_HOME, COMPLIANCE_NAV } from "../../navigation";
import { TRAIL_SOURCE_LABELS, type TrailEvent } from "../../traceability";
import { WORKSPACE_KEYS, WORKSPACE_LABELS } from "../../workspace-status";
import { CategoryBadge } from "../case-list/badges";
import { formatDateTime } from "../case-list/format";

const CATEGORY_COLOR: Record<(typeof CASE_CATEGORIES)[number], string> = {
  MH: "bg-[#F59E0B]",
  SK: "bg-[#1677FF]",
  PTL: "bg-[#F97316]",
  OI: "bg-[#DC2626]",
  CL: "bg-[#16A34A]",
  SL: "bg-[#7C3AED]",
};

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm", className)}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[14px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#1677FF] hover:underline">
      {label}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded-xl border border-[#E5EAF0] bg-white px-4 py-3 shadow-sm outline-none hover:border-[#C7D2E0] focus-visible:ring-2 focus-visible:ring-[#1677FF]">
      <span className="text-[12px] text-[#64748B]">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-[11.5px] text-[#64748B]">{hint}</span>}
    </Link>
  );
}

export function DashboardView({ summary, attention, activity }: { summary: DashboardSummary; attention: CaseRow[]; activity: TrailEvent[] }) {
  const activeTotal = summary.activeFindings.OPEN + summary.activeFindings.KLARIFIKASI + summary.activeFindings.CONFLICT;
  const maxWaiting = Math.max(1, ...WORKSPACE_KEYS.map((key) => summary.waitingAt[key]));
  const upcoming = COMPLIANCE_NAV.filter((item) => !item.available);

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-[13px] text-[#64748B]">Ringkasan compliance VIU – Barang Konsumsi, dihitung dari data workspace sumber dan temuan Compliance.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total permohonan" value={summary.totalCases} hint={`${summary.byCategory.MH} menunggu handover`} href={`${COMPLIANCE_HOME}/permohonan`} />
        <Stat label="Siap dikonsolidasi" value={summary.readyForConsolidation} hint="handover lengkap, tanpa temuan aktif" href={`${COMPLIANCE_HOME}/permohonan`} />
        <Stat label="Temuan aktif" value={activeTotal} hint={`${summary.resolvedFindings} sudah resolved`} href={`${COMPLIANCE_HOME}/temuan`} />
        <Stat
          label="Rata-rata skor compliance"
          value={summary.averageScore === null ? "—" : `${summary.averageScore}%`}
          hint={`${summary.lhviuIssued} LHVIU terbit`}
          href={`${COMPLIANCE_HOME}/lhviu`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Status compliance" action={<MoreLink href={`${COMPLIANCE_HOME}/permohonan`} label="Daftar Permohonan" />}>
          {summary.totalCases === 0 ? (
            <p className="text-[13px] text-[#64748B]">Belum ada permohonan VIU Barang Konsumsi.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-[#EEF2F6]" role="img" aria-label={CASE_CATEGORIES.map((c) => `${CASE_CATEGORY_LABELS[c]} ${summary.byCategory[c]}`).join(", ")}>
                {CASE_CATEGORIES.filter((category) => summary.byCategory[category] > 0).map((category) => (
                  <span key={category} className={cn("h-full border-r-2 border-white last:border-r-0", CATEGORY_COLOR[category])} style={{ width: `${(summary.byCategory[category] / summary.totalCases) * 100}%` }} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {CASE_CATEGORIES.map((category) => (
                  <li key={category} className="flex items-center gap-2 text-[12.5px]">
                    <span className={cn("size-2.5 rounded-full", CATEGORY_COLOR[category])} aria-hidden />
                    <span className="flex-1 text-[#475569]">{CASE_CATEGORY_LABELS[category]}</span>
                    <span className="font-semibold tabular-nums">{summary.byCategory[category]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Menunggu handover per workspace">
          <ul className="flex flex-col gap-2">
            {WORKSPACE_KEYS.map((key) => (
              <li key={key} className="grid grid-cols-[130px_1fr_32px] items-center gap-3 text-[12.5px]">
                <span className="text-[#475569]">{WORKSPACE_LABELS[key]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
                  <span className="block h-full rounded-full bg-[#F59E0B]" style={{ width: `${(summary.waitingAt[key] / maxWaiting) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{summary.waitingAt[key]}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11.5px] text-[#64748B]">Case dihitung di workspace pertama yang belum selesai.</p>
        </Card>

        <Card title="Perlu perhatian" action={<MoreLink href={`${COMPLIANCE_HOME}/temuan`} label="Temuan & Exception" />}>
          {attention.length === 0 ? (
            <p className="text-[13px] text-[#64748B]">Tidak ada case dengan temuan aktif atau tanda review.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EEF2F6]">
              {attention.map((row) => (
                <li key={row.applicationId} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}`} className="font-mono text-[12.5px] font-medium text-[#1677FF] hover:underline">
                    {row.applicationNumber}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#475569]">{row.companyName}</span>
                  {row.reviewFlag && <span className="rounded bg-[#F3EEFF] px-1.5 text-[10.5px] font-semibold text-[#6D28D9]">Review</span>}
                  <CategoryBadge category={row.category} />
                  <span className="text-[11.5px] tabular-nums text-[#64748B]">{row.activeFindings.length} temuan</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-3 gap-2 border-t border-[#EEF2F6] pt-3">
            {(["OPEN", "KLARIFIKASI", "CONFLICT"] as const).map((kind) => (
              <div key={kind} className="rounded-lg bg-[#F5F7FA] px-3 py-2">
                <dt className="text-[11px] text-[#64748B]">{FINDING_KIND_LABELS[kind]}</dt>
                <dd className="text-[16px] font-semibold tabular-nums">{summary.activeFindings[kind]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Aktivitas terbaru" action={<MoreLink href={`${COMPLIANCE_HOME}/audit`} label="Audit Trail" />}>
          {activity.length === 0 ? (
            <p className="text-[13px] text-[#64748B]">Belum ada aktivitas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#EEF2F6]">
              {activity.map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5 py-2 text-[12.5px]">
                  <span className="flex flex-wrap items-center gap-2 text-[11.5px] text-[#64748B]">
                    <span className="tabular-nums">{formatDateTime(event.at)}</span>
                    <span>·</span>
                    <span>{TRAIL_SOURCE_LABELS[event.source]}</span>
                    <span>·</span>
                    <Link href={`${COMPLIANCE_HOME}/permohonan/${event.applicationId}`} className="font-mono text-[#1677FF] hover:underline">{event.applicationNumber}</Link>
                  </span>
                  <span>{event.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {upcoming.length > 0 && (
        <p className="text-[12px] text-[#64748B]">
          Belum tersedia: {upcoming.map((item) => item.label).join(", ")}. Compliance tidak membuat atau mengubah permohonan, tidak mengganti
          evidence, dan tidak menyetujui atau menerbitkan LHVIU.
        </p>
      )}
    </div>
  );
}
