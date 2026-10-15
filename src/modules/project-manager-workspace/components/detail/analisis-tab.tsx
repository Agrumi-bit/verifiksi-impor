"use client";

import { useState } from "react";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";

import {
  technicalModuleKeysFor,
  TECHNICAL_MODULE_LABELS,
  TECHNICAL_MODULE_NAV_LABELS,
  TECHNICAL_MODULE_STATUS_BADGE,
  TECHNICAL_MODULE_STATUS_LABELS,
  type TechnicalModuleKey,
  type TechnicalModuleStatusValue,
} from "@/modules/technical-analyst-workspace/status";
import type { AnalysisData } from "@/modules/technical-analyst-workspace/components/detail/analysis-types";
import { MODULE_COMPONENT } from "@/modules/technical-analyst-workspace/components/detail/analysis-tab";
import { LhvkiSummaryPanel } from "@/modules/technical-analyst-workspace/components/detail/analysis/lhvki-summary-panel";
import type { PmApplicationDetail } from "./types";
import { formatAssignmentDate } from "@/lib/assignment-date";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_BADGE,
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
} from "@/modules/technical-analyst-workspace/document-report-review";

/** Renders rich-text HTML written by a technical analyst via RichTextEditor — sanitized before injection, same pattern as the printed report's SanitizedHtml. */
function SanitizedHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

type SubTab = "ringkasan" | "laporan" | TechnicalModuleKey;

const noop = () => undefined;

/**
 * PM — Analisis tab: the Technical Analyst's analysis, read-only, laid out like the TA workspace:
 * sub-tab Ringkasan (review laporan dokumen + Ringkasan LHVKI / hasil per modul), one sub-tab per
 * analysis module (the TA's own module view, not editable) and Laporan Analisis (the printable report).
 */
export function AnalisisTab({ data }: { data: PmApplicationDetail }) {
  const technical = data.assignments.technical;
  const moduleKeys = technicalModuleKeysFor(data.verificationType, data.payload?.importTypes);
  const [tab, setTab] = useState<SubTab>("ringkasan");
  const assignmentNumber = technical?.assignmentNumber ?? "";
  const analysis = useQuery({
    queryKey: ["project-manager-workspace", "analysis", assignmentNumber],
    enabled: Boolean(assignmentNumber),
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/assignments/${encodeURIComponent(assignmentNumber)}/analysis`);
      if (!response.ok) throw new Error("Gagal memuat data analisis");
      return ((await response.json()) as { data: AnalysisData }).data;
    },
  });

  if (!technical) {
    return (
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
        Belum ada penugasan analisis teknis untuk permohonan ini.
      </div>
    );
  }

  const docReview = technical.documentReportReview ?? null;
  const isVki = data.verificationType === "VKI";
  const reportHref = `/project-manager-workspace/assignments/${encodeURIComponent(assignmentNumber)}/technical-report`;
  const subTabs: { key: SubTab; label: string }[] = [
    { key: "ringkasan", label: "Ringkasan" },
    ...moduleKeys.map((key) => ({ key: key as SubTab, label: TECHNICAL_MODULE_NAV_LABELS[key] })),
    { key: "laporan", label: "Laporan Analisis" },
  ];

  const nav = (
    <div className="flex flex-wrap gap-2">
      {subTabs.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="rounded-lg px-4 py-2 text-[12px] font-bold"
            style={{ background: active ? "#e0662e" : "#fff", color: active ? "#fff" : "#4a4038", border: `1px solid ${active ? "#e0662e" : "#e1bfb3"}` }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  if (tab === "laporan") {
    return (
      <div className="flex flex-col gap-3.5">
        {nav}
        <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[#f0ded0] bg-white px-4 py-3">
          <div className="text-[12.5px] text-[#4a4038]">Laporan Analisis Teknis · {assignmentNumber}</div>
          <a href={reportHref} target="_blank" rel="noreferrer" className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[12px] font-bold text-[#261813]">
            Buka di tab baru
          </a>
        </div>
        <iframe title="Laporan Analisis Teknis" src={reportHref} className="h-[85vh] w-full rounded-[10px] border border-[#f0ded0] bg-[#f4efe8]" />
      </div>
    );
  }

  if (tab !== "ringkasan") {
    const moduleKey = tab;
    if (analysis.isLoading) return <div className="flex flex-col gap-3.5">{nav}<div className="p-6 text-center text-[#a68f80]">Memuat...</div></div>;
    if (analysis.isError || !analysis.data) return <div className="flex flex-col gap-3.5">{nav}<div className="p-6 text-center text-[#c1361f]">Gagal memuat data analisis.</div></div>;
    const saved = analysis.data.technicalAnalysisData[moduleKey] ?? {};
    const ModuleComponent = MODULE_COMPONENT[moduleKey];
    return (
      <div className="flex flex-col gap-3.5">
        {nav}
        <ModuleComponent
          data={analysis.data}
          inputs={saved.inputs ?? {}}
          onInputChange={noop}
          keterangan={saved.keterangan ?? ""}
          onKeteranganChange={noop}
          kesimpulan={saved.kesimpulan ?? ""}
          onKesimpulanChange={noop}
          status={(saved.status ?? "PENDING") as TechnicalModuleStatusValue}
          onMarkSesuai={noop}
          onMarkTidakSesuai={noop}
          onSubmit={noop}
          canEdit={false}
          submitting={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {nav}
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[13.5px] font-extrabold text-[#20180f]">Review Laporan Verifikasi Dokumen oleh Technical Analyst</div>
          {docReview?.decision ? (
            <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${DOCUMENT_REPORT_REVIEW_DECISION_BADGE[docReview.decision]}`}>
              {DOCUMENT_REPORT_REVIEW_DECISION_LABELS[docReview.decision]}
            </span>
          ) : (
            <span className="rounded-full bg-[#f2ece5] px-2.5 py-0.75 text-[10.5px] font-bold text-[#6b5b4c]">Belum Direview</span>
          )}
        </div>
        <div className="text-[12.5px] text-[#4a4038]">
          {docReview?.decision
            ? `Diperiksa ${formatAssignmentDate(docReview.verifiedAt)}${docReview.verifiedByName ? ` oleh ${docReview.verifiedByName}` : ""}.${docReview.note ? ` Catatan: ${docReview.note}` : ""}`
            : "Technical Analyst belum mereview Laporan Verifikasi Dokumen."}
        </div>
      </div>
      {isVki && analysis.data && <LhvkiSummaryPanel data={analysis.data} moduleKeys={moduleKeys} />}
      {isVki && analysis.isLoading && <div className="p-6 text-center text-[#a68f80]">Memuat ringkasan...</div>}
      {moduleKeys.map((key) => {
        const moduleData = technical.technicalAnalysisData[key] ?? {};
        const status = moduleData.status ?? "PENDING";
        return (
          <div key={key} className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13.5px] font-extrabold text-[#20180f]">{TECHNICAL_MODULE_LABELS[key]}</div>
              <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[status as keyof typeof TECHNICAL_MODULE_STATUS_BADGE] ?? TECHNICAL_MODULE_STATUS_BADGE.PENDING}`}>
                {TECHNICAL_MODULE_STATUS_LABELS[status as keyof typeof TECHNICAL_MODULE_STATUS_LABELS] ?? status}
              </span>
            </div>
            {moduleData.kesimpulan && (
              <div className="rounded-lg border border-dashed border-[#e8b1a3] bg-[#fbf8f4] p-3 text-[12.5px] leading-relaxed text-[#4a4038]">
                <SanitizedHtml html={moduleData.kesimpulan} />
              </div>
            )}
            {!moduleData.kesimpulan && <p className="text-[12.5px] text-[#a68f80]">Belum ada kesimpulan — lihat sub-tab modul.</p>}
          </div>
        );
      })}
    </div>
  );
}
