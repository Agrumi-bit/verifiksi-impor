import Link from "next/link";
import { FileText, FolderOpen, Lock, Search } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { CaseRow } from "../../case-list";
import { COMPLIANCE_STATUS_LABELS } from "../../consolidation";
import type { AdministrativeRecord, DossierSection } from "../../dossier";
import { COMPLIANCE_HOME } from "../../navigation";
import { CategoryBadge, Pill } from "../case-list/badges";
import { formatCalendarDate, formatDate, formatDateTime } from "../case-list/format";
import { INPUT_CLASS } from "../styles";
import { AdministrativeChecks } from "./administrative-checks";

type CaseItem = { applicationId: string; applicationNumber: string; companyName: string; category: CaseRow["category"]; ready: number };

function dossierHref(applicationId: string, q: string): string {
  const params = new URLSearchParams({ case: applicationId });
  if (q) params.set("q", q);
  return `${COMPLIANCE_HOME}/dossier?${params}`;
}

function SectionCard({ section, index, applicationId }: { section: DossierSection; index: number; applicationId: string }) {
  return (
    <article className={cn("flex gap-3 rounded-xl border border-[#E5EAF0] p-4 shadow-sm", section.ready ? "bg-white" : "bg-[#FBFCFD]")}>
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
          section.ready ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#F1F5F9] text-[#94A3B8]",
        )}
      >
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-semibold">{section.title}</h3>
          <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">Source: {section.sourceLabel}</span>
          <Pill tone={section.ready ? "green" : "orange"}>{section.status}</Pill>
        </div>
        {section.ready ? (
          <dl className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-3">
            <div><dt className="text-[#64748B]">Completed date</dt><dd className="font-medium">{section.key === "LH" ? formatCalendarDate(section.completedAt) : formatDate(section.completedAt)}</dd></div>
            <div><dt className="text-[#64748B]">Completed by</dt><dd className="font-medium">{section.completedBy}</dd></div>
            <div><dt className="text-[#64748B]">Final status</dt><dd className="font-medium">{section.result}</dd></div>
          </dl>
        ) : (
          <p className="text-[12.5px] text-[#64748B]">
            Belum handover dari {section.sourceLabel}. Bagian ini terisi otomatis setelah output diserahkan.
          </p>
        )}
        {section.documents.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {section.documents.map((document) => (
              <li key={document.path}>
                <a
                  href={fileHref(document.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EAF0] px-2.5 py-1 text-[12px] hover:bg-[#F5F7FA]"
                >
                  <FileText className="size-3.5 text-[#64748B]" aria-hidden />
                  {document.label}
                  <span className="sr-only">(buka di tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {section.ready ? (
        <Link href={`${COMPLIANCE_HOME}/permohonan/${applicationId}?step=${section.step}`} className={cn(INPUT_CLASS, "inline-flex h-8 shrink-0 items-center self-start font-medium hover:bg-[#F5F7FA]")}>
          View Detail
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(INPUT_CLASS, "inline-flex h-8 shrink-0 cursor-not-allowed items-center self-start text-[#94A3B8]")}>View Detail</span>
      )}
    </article>
  );
}

export function DossierView({
  cases,
  q,
  selected,
}: {
  cases: CaseItem[];
  q: string;
  selected: {
    row: CaseRow;
    sections: DossierSection[];
    records: { finalReviewDone: AdministrativeRecord; dossierComplete: AdministrativeRecord };
    blockers: { finalReviewDone: string | null; dossierComplete: string | null };
  } | null;
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Compliance Dossier</h1>
          <p className="text-[13px] text-[#64748B]">Seluruh final case file dalam satu tempat — bersumber dari hasil yang telah diserahkan workspace asal.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569]">
          <Lock className="size-3" aria-hidden />
          READ-ONLY
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="flex h-fit flex-col gap-2 rounded-xl border border-[#E5EAF0] bg-white p-3 shadow-sm">
          <form method="get" className="relative">
            {selected && <input type="hidden" name="case" value={selected.row.applicationId} />}
            <label htmlFor="dossier-q" className="sr-only">Cari permohonan</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
            <input id="dossier-q" name="q" type="search" defaultValue={q} placeholder="Cari no. / perusahaan..." className={cn(INPUT_CLASS, "w-full pl-8")} />
          </form>
          <p className="px-1 text-[11.5px] text-[#64748B]">{cases.length} permohonan</p>
          <ul className="flex max-h-[calc(100vh-260px)] flex-col gap-0.5 overflow-y-auto">
            {cases.map((item) => {
              const isOn = item.applicationId === selected?.row.applicationId;
              return (
                <li key={item.applicationId}>
                  <Link
                    href={dossierHref(item.applicationId, q)}
                    aria-current={isOn ? "true" : undefined}
                    className={cn("flex flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-[12.5px]", isOn ? "border-[#91CAFF] bg-[#F0F7FF]" : "border-transparent hover:bg-[#F5F7FA]")}
                  >
                    <span className="font-mono font-medium">{item.applicationNumber}</span>
                    <span className="truncate text-[#475569]">{item.companyName}</span>
                    <span className="flex items-center gap-2">
                      <CategoryBadge category={item.category} />
                      <span className="text-[11px] tabular-nums text-[#64748B]">{item.ready}/6 bagian</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {cases.length === 0 && <li className="px-1 py-4 text-center text-[12.5px] text-[#64748B]">Tidak ada permohonan yang cocok.</li>}
          </ul>
        </aside>

        {!selected ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-14 text-center text-[#64748B]">
            <FolderOpen className="size-6" aria-hidden />
            <p className="text-[13px]">Pilih permohonan untuk membuka dossier-nya.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <section className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-[14px] font-semibold">Identitas Case</h2>
                <Link href={`${COMPLIANCE_HOME}/permohonan/${selected.row.applicationId}`} className={cn(INPUT_CLASS, "inline-flex h-8 items-center font-medium hover:bg-[#F5F7FA]")}>
                  Buka Compliance Case
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-[150px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-[#64748B]">No. Permohonan</dt><dd className="font-mono">{selected.row.applicationNumber}</dd>
                <dt className="text-[#64748B]">Pemohon</dt><dd>{selected.row.companyName}</dd>
                <dt className="text-[#64748B]">NIB</dt><dd className="font-mono">{selected.row.nib}</dd>
                <dt className="text-[#64748B]">Jenis VIU</dt><dd>VIU – Barang Konsumsi</dd>
                <dt className="text-[#64748B]">Tanggal Masuk</dt><dd>{formatDate(selected.row.submittedAt)}</dd>
                <dt className="text-[#64748B]">Status Compliance</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={selected.row.category} />
                  <span className="text-[12px] text-[#64748B]">{COMPLIANCE_STATUS_LABELS[selected.row.complianceStatus]} · skor {selected.row.summary.score}%</span>
                </dd>
                <dt className="text-[#64748B]">Terakhir diperbarui</dt><dd>{formatDateTime(selected.row.updatedAt)}</dd>
              </dl>
            </section>

            <AdministrativeChecks applicationId={selected.row.applicationId} records={selected.records} blockers={selected.blockers} />

            {selected.sections.map((section, index) => (
              <SectionCard key={section.key} section={section} index={index} applicationId={selected.row.applicationId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
