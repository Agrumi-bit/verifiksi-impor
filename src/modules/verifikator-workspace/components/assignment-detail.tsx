"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "./material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  ASSIGNMENT_PRIORITY_BADGE,
  ASSIGNMENT_STATUS_PILL,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "../status";
import { OverviewTab } from "./detail/overview-tab";
import { FieldVerificationTab } from "./detail/field-verification-tab";
import { DocumentVerificationTab } from "./detail/document-verification-tab";
import { MachineVerificationTab } from "./detail/machine-verification-tab";
import { ProductVerificationTab } from "./detail/product-verification-tab";
import { ProductionQuantityTab } from "./detail/production-quantity-tab";
import { DraftReportTab } from "./detail/draft-report-tab";
import { TeamTab } from "./detail/team-tab";
import { CommunicationTab } from "./detail/communication-tab";
import { DecisionPanel } from "./detail/decision-panel";

export type LocationVisitSummary = {
  id: string;
  locationType: string;
  address: string;
  city: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  submittedAt: string | null;
};

export type TeamMemberSummary = {
  name: string;
  date: string | null;
  assignmentId: string;
  letterNumber: string | null;
  letterStatus: string;
} | null;

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
    nibIssueDate: string | null;
    businessAddress: string | null;
    kbliEntries: { code: string; description: string }[];
    locations: ApplicationWizardValues["locations"];
    notarialDeedNumber: string | null;
    notarialAmendmentNumber: string | null;
    notarialAmendmentDate: string | null;
    skNumber: string | null;
    npwpNumber: string | null;
    sktNumber: string | null;
    sktIssuer: string | null;
    sktDate: string | null;
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
  team: {
    surveyor: TeamMemberSummary;
    verifikator: TeamMemberSummary;
    technicalReviewer: TeamMemberSummary;
    teamMembers: { name: string; role?: string }[];
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

const ALL_TAB_NAMES = [
  "Overview",
  "Documents Verification",
  "Survey Lapangan",
  "Verifikasi Mesin",
  "Product Verification",
  "Verifikasi Jumlah Produksi",
  "Draft Report",
  "Team",
  "Communication",
] as const;
type TabName = (typeof ALL_TAB_NAMES)[number];

const VKI_ONLY_TABS: TabName[] = ["Verifikasi Mesin", "Verifikasi Jumlah Produksi"];

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function stubToast() {
  toast.info("Fitur ini akan tersedia di iterasi berikutnya.");
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-[#8a7565]">{label}</div>
      <div className={`mt-0.75 text-[13.5px] font-bold ${accent ? "text-[#e0662e]" : "text-[#20180f]"}`}>{value}</div>
    </div>
  );
}

type Props = { id: string };

export function AssignmentDetail({ id }: Props) {
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [rawMaterialFocus, setRawMaterialFocus] = useState<{ productId: string; conversionId: string } | null>(null);

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
    return <p className="p-8 text-sm text-[#8a7565]">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="p-8 text-sm text-[#c1361f]">Penugasan tidak ditemukan, atau bukan milik Anda.</p>;
  }

  const isVki = data.application.verificationType === "VKI";
  const tabNames = ALL_TAB_NAMES.filter((name) => isVki || !VKI_ONLY_TABS.includes(name));
  const statusStyle = ASSIGNMENT_STATUS_PILL[data.status];

  return (
    <div className="p-6">
      <Link
        href="/verifikator-workspace/my-assignment"
        className="mb-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#4a4038]"
      >
        <MaterialIcon name="arrow_back" className="text-[18px]" />
        Back to Assignments
      </Link>

      <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-white p-5 pl-6" style={{ borderLeft: "4px solid #2f6fe0" }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-[18px] font-extrabold text-[#20180f]">Assignment Detail</div>
            <span
              className="rounded-full px-3 py-1.25 text-[11px] font-bold"
              style={{ background: statusStyle.bg, color: statusStyle.color }}
            >
              {data.progress.currentStage}
            </span>
            <span className={`rounded-full px-3 py-1.25 text-[11px] font-bold ${ASSIGNMENT_PRIORITY_BADGE[data.priority]}`}>
              {data.priority}
            </span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={stubToast}
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.25 text-[12.5px] font-semibold text-[#261813]"
            >
              <MaterialIcon name="visibility" className="text-[17px]" />
              View Application
            </button>
            <button
              type="button"
              onClick={stubToast}
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.25 text-[12.5px] font-semibold text-[#261813]"
            >
              <MaterialIcon name="download" className="text-[17px]" />
              Download Application
            </button>
          </div>
        </div>
        <div className="mb-4 text-[13px] text-[#8a7565]">Review and verify application documents and field reports</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <HeaderStat label="Nomor Permohonan" value={data.application.applicationNumber} />
          <HeaderStat label="Nama Perusahaan" value={data.company.companyName} />
          <HeaderStat label="Jenis Permohonan" value={data.application.applicationCategory} />
          <HeaderStat label="Klasifikasi" value={data.application.verificationType} />
          <HeaderStat label="Assigned Date" value={fmtDate(data.createdAt)} />
          <HeaderStat label="Due Date" value={fmtDate(data.dueDate)} accent />
        </div>
      </div>

      <div className="mb-4 flex w-max max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-[#f0ede8] p-1">
        {tabNames.map((name) => {
          const isActive = activeTab === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setActiveTab(name)}
              className={
                "whitespace-nowrap rounded-lg px-4 py-2.25 text-[12.5px] font-bold transition-colors " +
                (isActive ? "bg-[#e0662e] text-white" : "text-[#6b5b4c] hover:bg-white/60")
              }
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="pb-8">
        {activeTab === "Overview" && <OverviewTab data={data} />}
        {activeTab === "Documents Verification" && (
          <DocumentVerificationTab
            assignmentId={id}
            assignmentStatus={data.status}
            verificationType={data.application.verificationType}
            companyName={data.company.companyName}
            payload={data.application.payload}
            businessAddress={data.company.businessAddress}
            companyLegal={{
              nibNumber: data.company.nibNumber,
              nibIssueDate: data.company.nibIssueDate,
              notarialDeedNumber: data.company.notarialDeedNumber,
              notarialAmendmentNumber: data.company.notarialAmendmentNumber,
              notarialAmendmentDate: data.company.notarialAmendmentDate,
              skNumber: data.company.skNumber,
              npwpNumber: data.company.npwpNumber,
              sktNumber: data.company.sktNumber,
              sktIssuer: data.company.sktIssuer,
              sktDate: data.company.sktDate,
            }}
          />
        )}
        {activeTab === "Survey Lapangan" && (
          <FieldVerificationTab
            assignmentId={id}
            locationVisits={data.surveyInformation.locationVisits}
            surveyorName={data.surveyInformation.surveyorName}
            applicationNumber={data.application.applicationNumber}
            companyName={data.company.companyName}
            locations={data.company.locations}
          />
        )}
        {activeTab === "Verifikasi Mesin" && (
          <MachineVerificationTab assignmentId={id} assignmentStatus={data.status} />
        )}
        {activeTab === "Product Verification" && (
          <ProductVerificationTab
            assignmentId={id}
            assignmentStatus={data.status}
            payload={data.application.payload}
            focusProductId={rawMaterialFocus?.productId ?? null}
            focusConversionId={rawMaterialFocus?.conversionId ?? null}
            onFocusHandled={() => setRawMaterialFocus(null)}
          />
        )}
        {activeTab === "Verifikasi Jumlah Produksi" && (
          <ProductionQuantityTab
            assignmentId={id}
            assignmentStatus={data.status}
            onNavigateToRawMaterial={(productId, conversionId) => {
              setRawMaterialFocus({ productId, conversionId });
              setActiveTab("Product Verification");
            }}
          />
        )}
        {activeTab === "Draft Report" && <DraftReportTab assignmentId={id} initialNotes={data.validationNotes} />}
        {activeTab === "Team" && (
          <TeamTab team={data.team} companyName={data.company.companyName} applicationNumber={data.application.applicationNumber} />
        )}
        {activeTab === "Communication" && <CommunicationTab assignmentId={id} />}
      </div>

      <DecisionPanel assignmentId={id} status={data.status} quickStats={data.quickStats} />
    </div>
  );
}
