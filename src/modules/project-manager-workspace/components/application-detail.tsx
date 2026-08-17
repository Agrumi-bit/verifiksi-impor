"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { CommunicationTab } from "@/modules/verifikator-workspace/components/detail/communication-tab";
import { APPLICATION_STAGE_KEYS } from "../stage";
import { OverviewTab, ApplicationInfoTab, CompanyTab, TimelineTab } from "./detail/info-tabs";
import { AssignmentTab } from "./detail/assignment-tab";
import { DocumentsTab } from "./detail/documents-tab";
import { SurveyTab } from "./detail/survey-tab";
import { VerificationTab } from "./detail/verification-tab";
import { AnalisisTab } from "./detail/analisis-tab";
import type { PmApplicationDetail } from "./detail/types";

const TAB_NAMES = ["Overview", "Assignment", "Application", "Company", "Documents", "Survey", "Verification", "Analisis", "Communication", "Timeline"] as const;
type TabName = (typeof TAB_NAMES)[number];

const STATUS_BADGE: Record<string, string> = {
  Submitted: "bg-[#f2ecff] text-[#7a5fd6]",
  "In Progress": "bg-[#eaf1fd] text-[#4a7ed6]",
  "Revision Required": "bg-[#fdeceb] text-[#e15241]",
  Overdue: "bg-[#fdeceb] text-[#e15241]",
  Completed: "bg-[#e6f6ec] text-[#1a9850]",
};

export function ApplicationDetail({ applicationNumber, jenis }: { applicationNumber: string; jenis: string }) {
  const [tab, setTab] = useState<TabName>("Overview");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "applications", jenis, applicationNumber],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${jenis}/${applicationNumber}`);
      if (!response.ok) throw new Error("Gagal memuat aplikasi");
      return ((await response.json()) as { data: PmApplicationDetail }).data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-[13px] text-[#8a7565]">Memuat...</div>;
  if (isError || !data) return <div className="p-8 text-center text-[13px] text-[#c1361f]">Gagal memuat aplikasi.</div>;

  const stageIdx = APPLICATION_STAGE_KEYS.indexOf(data.stage as (typeof APPLICATION_STAGE_KEYS)[number]);
  // Any sibling assignmentNumber resolves to the same applicationId-scoped message thread —
  // prefer dokumen (usually exists earliest), fall back to whichever sibling is actually there.
  const messageThreadAssignmentNumber =
    data.assignments.dokumen?.assignmentNumber ?? data.assignments.survey?.assignmentNumber ?? data.assignments.technical?.assignmentNumber;

  return (
    <div className="p-8">
      <Link href={`/project-manager-workspace/applications/${jenis}`} className="mb-3.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a7565]">
        <MaterialIcon name="arrow_back" className="text-base" />
        Kembali ke Application List
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[20px] font-extrabold text-[#20180f]">{data.applicationNumber}</div>
          <div className="mt-0.5 text-[12.5px] text-[#8a7565]">{data.verificationType === "VKI" ? "Verifikasi Kemampuan Industri" : "Verifikasi Importir Umum"}</div>
          <div className="mt-1.5 text-[13.5px] font-bold text-[#20180f]">{data.company.companyName}</div>
        </div>
        <div className="flex items-start gap-6">
          <div className="text-right">
            <div className="text-[10.5px] font-bold text-[#a68f80]">STATUS</div>
            <span className={`mt-1 inline-block rounded-full px-3 py-1 text-[11.5px] font-bold ${STATUS_BADGE[data.status] ?? "bg-[#f1efe9] text-[#5c4a3d]"}`}>
              {data.status}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-bold text-[#a68f80]">SLA</div>
            <div className="mt-1 text-[13px] font-extrabold" style={{ color: data.slaColor }}>
              {data.slaDetail}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
        <div className="flex items-center">
          {APPLICATION_STAGE_KEYS.map((label, i) => {
            const isDone = i < stageIdx;
            const isCurrent = i === stageIdx;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex min-w-18 flex-col items-center gap-1.5">
                  <div
                    className="flex size-6.5 items-center justify-center rounded-full border-2 text-[13px] font-extrabold"
                    style={{
                      background: isDone ? "#1a9850" : isCurrent ? "#fdeadd" : "#fff",
                      color: isDone ? "#fff" : isCurrent ? "#c14a1f" : "#c7b6a6",
                      borderColor: isDone ? "#1a9850" : isCurrent ? "#e0662e" : "#e8d5c5",
                    }}
                  >
                    {isDone ? "✓" : isCurrent ? "●" : ""}
                  </div>
                  <div className={`text-center text-[10px] leading-tight ${isCurrent ? "font-extrabold text-[#20180f]" : "text-[#a68f80]"}`}>{label}</div>
                </div>
                {i < APPLICATION_STAGE_KEYS.length - 1 && (
                  <div className="mb-4.5 mx-0.5 h-0.5 flex-1" style={{ background: isDone ? "#1a9850" : "#e8d5c5" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-[#f0ded0]">
        {TAB_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-bold ${tab === name ? "border-b-2 border-[#c14a1f] text-[#c14a1f]" : "text-[#8a7565]"}`}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab data={data} />}
      {tab === "Assignment" && <AssignmentTab data={data} applicationNumber={applicationNumber} jenis={jenis} />}
      {tab === "Application" && <ApplicationInfoTab data={data} />}
      {tab === "Company" && <CompanyTab data={data} />}
      {tab === "Documents" && <DocumentsTab data={data} />}
      {tab === "Survey" && <SurveyTab data={data} applicationNumber={applicationNumber} />}
      {tab === "Verification" && <VerificationTab data={data} />}
      {tab === "Analisis" && <AnalisisTab data={data} />}
      {tab === "Communication" && (
        messageThreadAssignmentNumber ? (
          <CommunicationTab assignmentId={messageThreadAssignmentNumber} basePath="/api/project-manager-workspace" />
        ) : (
          <div className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[13px] text-[#a68f80]">
            Belum ada penugasan untuk memulai komunikasi.
          </div>
        )
      )}
      {tab === "Timeline" && <TimelineTab data={data} />}
    </div>
  );
}
