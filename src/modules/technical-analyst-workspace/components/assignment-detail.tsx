"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  ASSIGNMENT_PRIORITY_BADGE,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_PILL,
  TECHNICAL_MODULE_STATUS_BADGE,
  TECHNICAL_MODULE_STATUS_LABELS,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
  type TechnicalModuleStatusValue,
} from "../status";
import { SurveyorReportTab } from "./detail/surveyor-report-tab";
import { DocumentReportTab } from "./detail/document-report-tab";
import { AnalysisTab } from "./detail/analysis-tab";
import { DecisionPanel } from "./detail/decision-panel";

export type AssignmentDetailData = {
  id: string;
  assignmentNumber: string;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  createdAt: string;
  dueDate: string | null;
  validationNotes: string | null;
  validatedAt: string | null;
  application: {
    applicationNumber: string;
    verificationType: string;
    applicationCategory: string;
    createdAt: string;
    payload: ApplicationWizardValues;
  };
  company: {
    companyName: string;
    nibNumber: string;
    businessAddress: string | null;
    sktNumber: string | null;
  };
  siblings: {
    survey: {
      locationVisits: { id: string; locationType: string; address: string; city: string | null; status: string; assignmentNumber: string }[];
    } | null;
    dokumen: { assignmentNumber: string; status: string } | null;
  };
  overallStatus: TechnicalModuleStatusValue;
  readyForDecision: boolean;
};

const TAB_NAMES = ["Laporan Surveyor", "Laporan Verifikasi Dokumen", "Analisis Teknis"] as const;
type TabName = (typeof TAB_NAMES)[number];

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-[#8a7565]">{label}</div>
      <div className={`mt-0.75 text-[13.5px] font-bold ${accent ? "text-[#e0662e]" : "text-[#20180f]"}`}>{value}</div>
    </div>
  );
}

export function AssignmentDetail({ id }: { id: string }) {
  const [tab, setTab] = useState<TabName>("Laporan Surveyor");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["technical-analyst-workspace", "assignment", id],
    queryFn: async () => {
      const response = await fetch(`/api/technical-analyst-workspace/assignments/${id}`);
      if (!response.ok) throw new Error("Gagal memuat assignment");
      return ((await response.json()) as { data: AssignmentDetailData }).data;
    },
  });

  if (isLoading) return <div className="p-7 text-center text-[#a68f80]">Memuat...</div>;
  if (isError || !data) return <div className="p-7 text-center text-[#c1361f]">Gagal memuat assignment.</div>;

  const pill = ASSIGNMENT_STATUS_PILL[data.status];

  return (
    <div className="p-7">
      <Link
        href="/technical-analyst-workspace/my-assignment"
        className="mb-3.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a7565]"
      >
        <MaterialIcon name="arrow_back" className="text-base" />
        Kembali ke My Assignment
      </Link>

      <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] font-extrabold text-[#20180f]">{data.company.companyName}</span>
            <span className="rounded px-2.5 py-0.5 text-[10.5px] font-bold" style={{ background: pill.bg, color: pill.color }}>
              {ASSIGNMENT_STATUS_LABELS[data.status]}
            </span>
            <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${ASSIGNMENT_PRIORITY_BADGE[data.priority]}`}>
              {data.priority}
            </span>
            <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[data.overallStatus]}`}>
              {TECHNICAL_MODULE_STATUS_LABELS[data.overallStatus]}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <HeaderStat label="Nomor Permohonan" value={data.application.applicationNumber} />
          <HeaderStat label="Nama Perusahaan" value={data.company.companyName} />
          <HeaderStat label="Jenis Permohonan" value={data.application.verificationType} accent />
          <HeaderStat label="Klasifikasi" value={data.application.applicationCategory} />
          <HeaderStat label="Assigned Date" value={fmtDate(data.createdAt)} />
          <HeaderStat label="Due Date" value={fmtDate(data.dueDate)} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#f0ded0]">
        {TAB_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`px-4 py-2.5 text-[13px] font-semibold ${
              tab === name ? "border-b-2 border-[#e0662e] text-[#e0662e]" : "text-[#8a7565]"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Laporan Surveyor" && <SurveyorReportTab survey={data.siblings.survey} />}
      {tab === "Laporan Verifikasi Dokumen" && (
        <DocumentReportTab assignmentNumber={data.assignmentNumber} dokumen={data.siblings.dokumen} />
      )}
      {tab === "Analisis Teknis" && <AnalysisTab assignmentNumber={data.assignmentNumber} verificationType={data.application.verificationType} />}

      <div className="mt-5 -mx-7 -mb-7">
        <DecisionPanel assignmentId={data.assignmentNumber} status={data.status} readyForDecision={data.readyForDecision} />
      </div>
    </div>
  );
}
