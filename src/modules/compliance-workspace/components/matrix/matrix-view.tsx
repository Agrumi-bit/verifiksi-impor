import Link from "next/link";
import { FileText, Grid3x3 } from "lucide-react";

import { fileHref } from "@/lib/file-href";
import { cn } from "@/lib/utils";
import type { StepStatus } from "../../case-detail";
import type { CaseRow } from "../../case-list";
import type { MatrixRow } from "../../matrix";
import { COMPLIANCE_HOME } from "../../navigation";
import { CategoryBadge, Pill } from "../case-list/badges";
import { INPUT_CLASS } from "../styles";

const STATUS_TONE: Record<StepStatus, "green" | "orange" | "red"> = {
  Sesuai: "green",
  Completed: "green",
  "Menunggu Handover": "orange",
  "Perlu Klarifikasi": "orange",
  "Open Issue": "red",
  Conflict: "red",
};
const TH = "sticky top-0 z-10 whitespace-nowrap border-b border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748B]";
const TD = "border-b border-[#EEF2F6] px-3 py-2.5 align-top";

type CaseOption = { applicationId: string; applicationNumber: string; companyName: string };

/** Case picker: a plain GET form, so the page stays a server component. */
function CasePicker({ cases, selected }: { cases: CaseOption[]; selected: string }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <label htmlFor="matrix-case" className="text-[12px] text-[#64748B]">Case</label>
      <select id="matrix-case" name="case" defaultValue={selected} className={cn(INPUT_CLASS, "min-w-[320px]")}>
        <option value="">Pilih permohonan…</option>
        {cases.map((option) => (
          <option key={option.applicationId} value={option.applicationId}>{option.applicationNumber} · {option.companyName}</option>
        ))}
      </select>
      <button type="submit" className={cn(INPUT_CLASS, "font-medium hover:bg-[#F5F7FA]")}>Tampilkan</button>
    </form>
  );
}

export function MatrixView({
  cases,
  row,
  matrix,
  summary,
}: {
  cases: CaseOption[];
  row: CaseRow | null;
  matrix: MatrixRow[];
  summary: { status: StepStatus; count: number }[];
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Compliance Matrix</h1>
          <p className="max-w-3xl text-[13px] text-[#64748B]">
            Requirement → Workspace Source → Evidence → Result → Status. Status berasal dari hasil workspace sumber dan temuan yang
            tercatat; Compliance tidak melakukan verifikasi ulang.
          </p>
        </div>
        <CasePicker cases={cases} selected={row?.applicationId ?? ""} />
      </header>

      {!row ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-6 py-14 text-center text-[#64748B]">
          <Grid3x3 className="size-6" aria-hidden />
          <p className="text-[13px]">Pilih permohonan untuk menampilkan Compliance Matrix-nya.</p>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5EAF0] bg-white px-5 py-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <Link href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}`} className="font-mono text-[14px] font-semibold text-[#1677FF] hover:underline">
                {row.applicationNumber}
              </Link>
              <p className="text-[12.5px] text-[#64748B]">{row.companyName} · NIB {row.nib}</p>
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
              Status case
              <CategoryBadge category={row.category} />
            </span>
            <span className="h-5 w-px bg-[#E5EAF0]" aria-hidden />
            <span className="text-[12px] text-[#64748B]">Requirement</span>
            <dl className="flex flex-wrap gap-2">
              {summary.map((item) => (
                <div key={item.status} className="flex items-center gap-1.5">
                  <dt><Pill tone={STATUS_TONE[item.status]}>{item.status}</Pill></dt>
                  <dd className="text-[13px] font-semibold tabular-nums">{item.count}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-xl border border-[#E5EAF0] bg-white shadow-sm">
            <table className="w-full min-w-[1280px] border-separate border-spacing-0 text-[13px]">
              <caption className="sr-only">Compliance Matrix {row.applicationNumber}</caption>
              <thead>
                <tr>
                  {["Requirement", "Type", "Regulatory Source", "Workspace Source", "Evidence", "Result", "Compliance Status", "Verified By"].map((label) => (
                    <th key={label} className={TH}>{label}</th>
                  ))}
                  <th className={cn(TH, "w-20")}><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((item) => (
                  <tr key={item.key} className="hover:bg-[#F8FAFC]">
                    <th scope="row" className={cn(TD, "whitespace-nowrap text-left font-medium")}>{item.label}</th>
                    <td className={TD}>{item.type}</td>
                    <td className={cn(TD, "max-w-[220px] text-[12.5px] text-[#475569]")}>{item.regulation}</td>
                    <td className={cn(TD, "whitespace-nowrap")}>
                      <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-medium text-[#475569]">{item.sourceLabel}</span>
                    </td>
                    <td className={cn(TD, "max-w-[240px]")}>
                      {item.evidence.length === 0 ? (
                        <span className="text-[12.5px] text-[#64748B]">{item.status === "Menunggu Handover" ? "Belum diserahkan" : "—"}</span>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {item.evidence.map((evidence) => (
                            <li key={evidence.path}>
                              <a
                                href={fileHref(evidence.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[12.5px] text-[#1677FF] hover:underline"
                              >
                                <FileText className="size-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{evidence.label}</span>
                                <span className="sr-only">(buka di tab baru)</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={cn(TD, "max-w-[280px]")}>{item.result}</td>
                    <td className={TD}>
                      <div className="flex flex-col items-start gap-1">
                        <Pill tone={STATUS_TONE[item.status]}>{item.status}</Pill>
                        {item.finding && (
                          <Link
                            href={`${COMPLIANCE_HOME}/temuan?case=${row.applicationId}&tab=${item.finding.kind}`}
                            className="font-mono text-[11.5px] text-[#1677FF] hover:underline"
                          >
                            {item.finding.issueNumber}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className={cn(TD, "whitespace-nowrap")}>{item.verifiedBy}</td>
                    <td className={TD}>
                      <Link
                        href={`${COMPLIANCE_HOME}/permohonan/${row.applicationId}?step=${item.step}`}
                        aria-label={`Detail ${item.label}`}
                        className={cn(INPUT_CLASS, "inline-flex items-center font-medium hover:bg-[#F5F7FA]")}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
