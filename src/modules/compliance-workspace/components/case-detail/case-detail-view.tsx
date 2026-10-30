import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ExternalLink, FileText, Lock } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { CaseStep, StepStatus } from "../../case-detail";
import type { CaseRow } from "../../case-list";
import { REQUIREMENTS } from "../../requirements";
import { COMPLIANCE_HOME } from "../../navigation";
import type { LegalitasStage as LegalitasStageData } from "../../server/load-legalitas";
import { CategoryBadge, Pill } from "../case-list/badges";
import { formatDate } from "../case-list/format";
import { LegalitasStage } from "./legalitas-stage";

const STATUS_TONE: Record<StepStatus, "green" | "orange" | "red" | "blue"> = {
  Sesuai: "green",
  Completed: "green",
  "Menunggu Handover": "orange",
  "Perlu Klarifikasi": "orange",
  "Open Issue": "red",
  Conflict: "red",
};
const STATUS_RING: Record<StepStatus, string> = {
  Sesuai: "border-[#16A34A] text-[#16A34A]",
  Completed: "border-[#16A34A] text-[#16A34A]",
  "Menunggu Handover": "border-[#CBD5E1] text-[#64748B]",
  "Perlu Klarifikasi": "border-[#F59E0B] text-[#B45309]",
  "Open Issue": "border-[#DC2626] text-[#DC2626]",
  Conflict: "border-[#DC2626] text-[#DC2626]",
};
const KIND_LABELS = { OPEN: "Open Issue", KLARIFIKASI: "Perlu Klarifikasi", CONFLICT: "Conflict", RESOLVED: "Resolved" } as const;
const REQUIREMENT_LABELS = Object.fromEntries(REQUIREMENTS.map((requirement) => [requirement.key, requirement.label])) as Record<string, string>;
const LINK_BUTTON = "inline-flex h-8 items-center rounded-lg border border-[#E5EAF0] bg-white px-3 text-[12.5px] font-medium hover:bg-[#F5F7FA]";

function stepHref(applicationId: string, num: number): string {
  return `${COMPLIANCE_HOME}/permohonan/${applicationId}?step=${num}`;
}

function CaseHeader({ row }: { row: CaseRow }) {
  return (
    <header className="flex flex-col gap-3 rounded-xl border border-[#E5EAF0] bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-[20px] font-semibold">VIU – Produk Tekstil sebagai Barang Konsumsi</h1>
        <span className="rounded-md border border-[#E5EAF0] bg-[#F5F7FA] px-2 py-0.5 font-mono text-[12px] font-medium">{row.applicationNumber}</span>
        <CategoryBadge category={row.category} />
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">
          <Lock className="size-3" aria-hidden />
          Read-only
        </span>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
        <div className="flex gap-1.5">
          <dt className="text-[#64748B]">Tanggal Pengajuan:</dt>
          <dd className="font-medium">
            {formatDate(row.submittedAt)}
            {row.submittedIsSystemDate && <span className="font-normal text-[#64748B]"> (tanggal input sistem)</span>}
          </dd>
        </div>
        <div className="flex gap-1.5"><dt className="text-[#64748B]">Pemohon:</dt><dd className="font-medium">{row.companyName}</dd></div>
        <div className="flex gap-1.5"><dt className="text-[#64748B]">NIB:</dt><dd className="font-medium">{row.nib}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-[#EEF2F6] pt-3">
        <Link href={`${COMPLIANCE_HOME}/temuan?case=${row.applicationId}`} className={LINK_BUTTON}>Lihat Issue ({row.activeFindings.length} aktif)</Link>
        <Link href={`${COMPLIANCE_HOME}/matrix?case=${row.applicationId}`} className={LINK_BUTTON}>Compliance Matrix</Link>
        <Link href={`${COMPLIANCE_HOME}/dossier?case=${row.applicationId}`} className={LINK_BUTTON}>Dossier</Link>
        <Link
          href={`${COMPLIANCE_HOME}/temuan?case=${row.applicationId}&new=1`}
          className="inline-flex h-8 items-center rounded-lg bg-[#1677FF] px-3 text-[12.5px] font-medium text-white hover:bg-[#0F62D6]"
        >
          Catat Temuan
        </Link>
      </div>
    </header>
  );
}

/** Horizontal 11-stage stepper (as on the Verifikator design); the ring colour is the stage's compliance status. */
function Stepper({ row, steps, current }: { row: CaseRow; steps: CaseStep[]; current: number }) {
  return (
    <nav aria-label="Tahap case" className="overflow-x-auto rounded-xl border border-[#E5EAF0] bg-white px-6 py-4 shadow-sm">
      <ol className="flex min-w-[1100px]">
        {steps.map((item, index) => {
          const isCurrent = item.num === current;
          const isDone = item.status === "Sesuai" || item.status === "Completed";
          return (
            <li key={item.num} className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center">
                <Link
                  href={stepHref(row.applicationId, item.num)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Tahap ${item.num}: ${item.label} — ${item.status}`}
                  title={item.status}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF] focus-visible:ring-offset-2",
                    isCurrent ? "border-[#1677FF] bg-[#1677FF] text-white" : cn("bg-white", STATUS_RING[item.status]),
                  )}
                >
                  {isDone && !isCurrent ? <Check className="size-4" aria-hidden /> : item.num}
                </Link>
                {index < steps.length - 1 && <span aria-hidden className={cn("mx-2 h-0.5 flex-1 rounded", item.num < current ? "bg-[#1677FF]" : "bg-[#E5EAF0]")} />}
              </div>
              <Link href={stepHref(row.applicationId, item.num)} tabIndex={-1} className="pr-3">
                <span className={cn("block text-[11px] font-semibold uppercase tracking-wide", isCurrent ? "text-[#1677FF]" : "text-[#64748B]")}>Tahap {item.num}</span>
                <span className={cn("block text-[12.5px] leading-snug", isCurrent ? "font-semibold text-[#10233F]" : "text-[#334155]")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function FindingsCard({ step }: { step: CaseStep }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
      <h3 className="text-[15px] font-semibold">Temuan Compliance</h3>
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
    </section>
  );
}

/** Generic stage panel (key data + evidence) for the stages without a dedicated layout yet. */
function GenericStage({ step }: { step: CaseStep }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Data Kunci</h3>
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
        <h3 className="mb-2 text-[15px] font-semibold">Evidence</h3>
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
    </section>
  );
}

/** Read-only 11-stage view of one case; every value comes from its source workspace. */
export function CaseDetailView({
  row,
  steps,
  current,
  legalitas,
}: {
  row: CaseRow;
  steps: CaseStep[];
  current: number;
  legalitas: LegalitasStageData | null;
}) {
  const step = steps[current - 1];
  const previous = steps[current - 2];
  const next = steps[current];

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <Link href={`${COMPLIANCE_HOME}/permohonan`} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[#1677FF] hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        Daftar Permohonan
      </Link>

      <CaseHeader row={row} />
      <Stepper row={row} steps={steps} current={current} />

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{step.label}</h2>
        <span className="flex-1" />
        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">Sumber: {step.sourceLabel}</span>
        <Pill tone={STATUS_TONE[step.status]}>{step.status}</Pill>
      </div>

      {step.num === 2 && legalitas ? <LegalitasStage data={legalitas} handedOver={step.status !== "Menunggu Handover"} /> : <GenericStage step={step} />}
      <FindingsCard step={step} />

      <div className="flex items-center justify-between">
        {previous ? (
          <Link href={stepHref(row.applicationId, previous.num)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5EAF0] bg-white px-4 text-[13.5px] font-medium hover:bg-[#F5F7FA]">
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke {previous.label}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={stepHref(row.applicationId, next.num)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1677FF] px-4 text-[13.5px] font-medium text-white hover:bg-[#0F62D6]">
            Lanjut ke {next.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
