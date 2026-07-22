"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";

import { MaterialIcon } from "./material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { ASSIGNMENT_STATUS_LABELS, type AssignmentPriorityValue, type AssignmentStatusValue } from "../status";
import { OverviewTab } from "./detail/overview-tab";
import { SurveyReportTab } from "./detail/survey-report-tab";
import { DocumentVerificationTab } from "./detail/document-verification-tab";
import { ProductVerificationTab } from "./detail/product-verification-tab";
import { DecisionPanel } from "./detail/decision-panel";

export type LocationVisitSummary = {
  id: string;
  locationType: string;
  address: string;
  city: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  submittedAt: string | null;
};

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
    payload: ApplicationWizardValues;
  };
  company: {
    companyName: string;
    nibNumber: string;
    businessAddress: string | null;
    kbliEntries: { code: string; description: string }[];
    locations: ApplicationWizardValues["locations"];
  };
  verificationProgram: {
    type: string;
    importTypes: string[];
    products: { id: string; materialType: string; hsCode: string; estimatedVolume: string; volumeUnit: string; intendedUse: string }[];
  };
  surveyInformation: {
    surveyorName: string;
    scheduledDate: string | null;
    completionDate: string | null;
    locationVisits: LocationVisitSummary[];
  };
  progress: {
    overallProgress: number;
    currentStage: string;
    timeline: { label: string; date: string; description?: string }[];
  };
  quickStats: {
    totalDocuments: number;
    documentsVerified: number;
    totalProducts: number;
    productsVerified: number;
    totalFindings: number;
    pendingReview: number;
  };
};

const TAB_NAMES = ["Overview", "Survey Report", "Document Verification", "Product Verification"] as const;
type TabName = (typeof TAB_NAMES)[number];

type Props = { id: string };

export function AssignmentDetail({ id }: Props) {
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const { data: session } = useSession();
  const initials = (session?.user.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "assignments", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${id}`);
      if (!response.ok) throw new Error("Penugasan tidak ditemukan");
      const json = (await response.json()) as { data: AssignmentDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-[#7d8398]">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Penugasan tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7fb]">
      <header className="sticky top-0 z-50 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#e4e7f2] bg-white px-6">
        <div className="flex items-center gap-10">
          <span className="text-xl font-bold text-[#3454d1]">IndustrialVerify</span>
          <div className="flex h-full items-center gap-8">
            <span className="flex h-16 items-center border-b-2 border-[#3454d1] text-base text-[#3454d1]">
              Verifikator Workspace
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <MaterialIcon name="notifications" className="text-[#3454d1]" />
          <div className="flex size-[38px] items-center justify-center rounded-full bg-[#3454d1] text-[13px] font-bold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] box-border px-6 pt-6">
        <Link
          href="/verifikator-workspace/my-assignment"
          className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[#5f6478]"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          Back to My Assignment
        </Link>

        <div className="grid grid-cols-2 gap-0 rounded-[14px] border border-[#e4e7f2] bg-white px-7 py-5 shadow-sm md:grid-cols-6">
          <div className="pr-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Assignment ID</div>
            <div className="text-sm font-bold">{data.assignmentNumber}</div>
          </div>
          <div className="border-l border-[#f0f2fa] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Application ID</div>
            <div className="text-sm font-bold">{data.application.applicationNumber}</div>
          </div>
          <div className="border-l border-[#f0f2fa] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Tanggal Assignment</div>
            <div className="text-sm font-bold">{new Date(data.createdAt).toLocaleDateString("id-ID")}</div>
          </div>
          <div className="border-l border-[#f0f2fa] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Program</div>
            <div className="text-sm font-bold">{data.application.verificationType}</div>
          </div>
          <div className="border-l border-[#f0f2fa] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Status</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8ecfb] px-2.5 py-1 text-[11.5px] font-bold text-[#3454d1]">
              <MaterialIcon name="fact_check" className="text-[13px]" />
              {ASSIGNMENT_STATUS_LABELS[data.status]}
            </span>
          </div>
          <div className="border-l border-[#f0f2fa] pl-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#8891ab]">Priority</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fce8e6] px-2.5 py-1 text-[11.5px] font-bold text-[#ba1a1a]">
              <MaterialIcon name="priority_high" className="text-[13px]" />
              {data.priority}
            </span>
          </div>
        </div>
      </div>

      <nav className="sticky top-16 z-40 mx-auto w-full max-w-[1440px] box-border overflow-x-auto bg-[#f6f7fb] px-6 pt-5">
        <div className="flex w-max min-w-full gap-0.5 rounded-full bg-[#eaecf3] p-[5px]">
          {TAB_NAMES.map((name) => {
            const isActive = activeTab === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTab(name)}
                className={
                  "whitespace-nowrap rounded-full px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors " +
                  (isActive ? "bg-white text-[#1f2437] shadow-sm" : "text-[#3d4258]")
                }
              >
                {name}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1440px] box-border flex-1 px-6 pb-10 pt-7">
        {activeTab === "Overview" && <OverviewTab data={data} />}
        {activeTab === "Survey Report" && <SurveyReportTab assignmentId={id} locationVisits={data.surveyInformation.locationVisits} />}
        {activeTab === "Document Verification" && (
          <DocumentVerificationTab assignmentId={id} assignmentStatus={data.status} />
        )}
        {activeTab === "Product Verification" && (
          <ProductVerificationTab assignmentId={id} assignmentStatus={data.status} />
        )}
      </main>

      <DecisionPanel assignmentId={id} status={data.status} quickStats={data.quickStats} />
    </div>
  );
}
