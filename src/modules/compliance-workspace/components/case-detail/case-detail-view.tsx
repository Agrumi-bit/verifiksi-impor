import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, FileText, Lock } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { CaseStep, StepStatus } from "../../case-detail";
import type { CaseRow } from "../../case-list";
import { REQUIREMENTS } from "../../requirements";
import { COMPLIANCE_HOME } from "../../navigation";
import { CategoryBadge, HandoverBadge, Pill } from "../case-list/badges";

const STATUS_TONE: Record<StepStatus, "green" | "orange" | "red" | "blue"> = {
  Sesuai: "green",
  Completed: "green",
  "Menunggu Handover": "orange",
  "Perlu Klarifikasi": "orange",
  "Open Issue": "red",
  Conflict: "red",
};
const STATUS_DOT: Record<StepStatus, string> = {
  Sesuai: "bg-[#16A34A]",
  Completed: "bg-[#16A34A]",
  "Menunggu Handover": "bg-[#F59E0B]",
  "Perlu Klarifikasi": "bg-[#F59E0B]",
  "Open Issue": "bg-[#DC2626]",
  Conflict: "bg-[#DC2626]",
};
const KIND_LABELS = { OPEN: "Open Issue", KLARIFIKASI: "Perlu Klarifikasi", CONFLICT: "Conflict", RESOLVED: "Resolved" } as const;
const REQUIREMENT_LABELS = Object.fromEntries(REQUIREMENTS.map((requirement) => [requirement.key, requirement.label])) as Record<string, string>;

function stepHref(applicationId: string, num: number): string {
  return `${COMPLIANCE_HOME}/permohonan/${applicationId}?step=${num}`;
}

/** Read-only 11-stage view of one case; every value comes from its source workspace. */
export function CaseDetailView({ row, steps, current }: { row: CaseRow; steps: CaseStep[]; current: number }) {
  const step = steps[current - 1];

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <Link href={`${COMPLIANCE_HOME}/permohonan`} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[#1677FF] hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        Daftar Permohonan
      </Link>

      <header className="flex flex-wrap items-start gap-3 rounded-xl border border-[#E5EAF0] bg-white px-5 py-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Compliance Case · VIU – Barang Konsumsi</p>
          <h1 className="font-mono text-lg font-semibold">{row.applicationNumber}</h1>
          <p className="text-[13px] text-[#64748B]">{row.companyName} · NIB {row.nib}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <HandoverBadge handover={row.handover} />
          <CategoryBadge category={row.category} />
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">
            <Lock className="size-3" aria-hidden />
            Read-only
          </span>
        </div>
        <div className="flex w-full flex-wrap gap-2 border-t border-[#E5EAF0] pt-3">
          <Link
            href={`${COMPLIANCE_HOME}/temuan?case=${row.applicationId}`}
            className="inline-flex h-8 items-center rounded-lg border border-[#E5EAF0] px-3 text-[12.5px] font-medium hover:bg-[#F5F7FA]"
          >
            Lihat Issue ({row.activeFindings.length} aktif)
          </Link>
          <Link
            href={`${COMPLIANCE_HOME}/temuan?case=${row.applicationId}&new=1`}
            className="inline-flex h-8 items-center rounded-lg bg-[#1677FF] px-3 text-[12.5px] font-medium text-white hover:bg-[#0F62D6]"
          >
            Catat Temuan
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Tahap case" className="h-fit rounded-xl border border-[#E5EAF0] bg-white p-2 shadow-sm">
          <ol className="flex flex-col gap-0.5">
            {steps.map((item) => {
              const isCurrent = item.num === current;
              return (
                <li key={item.num}>
                  <Link
                    href={stepHref(row.applicationId, item.num)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]",
                      isCurrent ? "bg-[#EAF2FF] font-semibold text-[#10233F]" : "text-[#334155] hover:bg-[#F5F7FA]",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold tabular-nums text-[#475569]">
                      {item.num}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
                    <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[item.status])} title={item.status} aria-label={item.status} role="img" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="step-title" className="flex flex-col gap-4 rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] text-[#64748B]">Tahap {step.num} dari {steps.length}</p>
            <span className="flex-1" />
            <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">Sumber: {step.sourceLabel}</span>
            <Pill tone={STATUS_TONE[step.status]}>{step.status}</Pill>
          </div>
          <h2 id="step-title" className="-mt-2 text-lg font-semibold">{step.label}</h2>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Data Kunci</h3>
            {step.keyData.length === 0 ? (
              <p className="text-[13px] text-[#64748B]">Belum ada data dari workspace sumber.</p>
            ) : (
              <dl className="grid grid-cols-[minmax(140px,220px)_1fr] gap-x-4 gap-y-2 text-[13px]">
                {step.keyData.map(([label, value], index) => (
                  <div key={`${label}-${index}`} className="contents">
                    <dt className="text-[#64748B]">{label}</dt>
                    <dd className="min-w-0 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {step.note && <p className="mt-2 text-[12px] text-[#64748B]">{step.note}</p>}
          </div>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Evidence</h3>
            {step.evidence.length === 0 ? (
              <p className="text-[13px] text-[#64748B]">Tidak ada dokumen pada tahap ini.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {step.evidence.map((item) => (
                  <li key={item.path}>
                    <a
                      href={fileHref(item.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-[#E5EAF0] px-3 py-2 text-[13px] outline-none hover:bg-[#F5F7FA] focus-visible:ring-2 focus-visible:ring-[#1677FF]"
                    >
                      <FileText className="size-4 shrink-0 text-[#64748B]" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <ExternalLink className="size-3.5 shrink-0 text-[#64748B]" aria-hidden />
                      <span className="sr-only">(buka di tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Temuan</h3>
            {step.findings.length === 0 ? (
              <p className="text-[13px] text-[#64748B]">Tidak ada temuan pada tahap ini.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {step.findings.map((finding) => (
                  <li key={finding.id} className="rounded-lg border border-[#E5EAF0] px-3 py-2 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] font-medium">{finding.issueNumber}</span>
                      <Pill tone={finding.kind === "RESOLVED" ? "green" : finding.kind === "KLARIFIKASI" ? "orange" : "red"}>{KIND_LABELS[finding.kind]}</Pill>
                      <span className="text-[12px] text-[#64748B]">{REQUIREMENT_LABELS[finding.requirementKey] ?? finding.requirementKey}</span>
                    </div>
                    <p className="mt-1">{finding.title}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#E5EAF0] pt-4">
            {current > 1 ? (
              <Link href={stepHref(row.applicationId, current - 1)} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1677FF] hover:underline">
                <ChevronLeft className="size-4" aria-hidden />
                {steps[current - 2].label}
              </Link>
            ) : (
              <span />
            )}
            {current < steps.length && (
              <Link href={stepHref(row.applicationId, current + 1)} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1677FF] hover:underline">
                {steps[current].label}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
