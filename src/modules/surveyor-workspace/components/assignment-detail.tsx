"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";

import { MaterialIcon } from "./material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "../status";
import { OverviewTab } from "./detail/overview-tab";
import { CompanyTab } from "./detail/company-tab";
import { LocationTab } from "./detail/location-tab";
import { ScopeTab } from "./detail/scope-tab";
import { ScheduleTab } from "./detail/schedule-tab";
import { TeamTab } from "./detail/team-tab";
import { DocumentsTab } from "./detail/documents-tab";
import { ProductsTab } from "./detail/products-tab";
import { OnSiteTab } from "./detail/onsite-tab";
import { ReportTab } from "./detail/report-tab";

export type TeamMemberSummary = {
  name: string;
  date: string | null;
  assignmentId: string;
  letterNumber: string | null;
  letterStatus: string;
} | null;

export type TeamSummary = {
  surveyor: TeamMemberSummary;
  verifikator: TeamMemberSummary;
  technicalReviewer: TeamMemberSummary;
  teamMembers: { name: string; role?: string }[];
};

export type AssignmentDetailData = {
  id: string;
  assignmentNumber: string;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  scheduledDate: string | null;
  scheduledTime: string | null;
  dueDate: string | null;
  location: string | null;
  team: TeamSummary;
  createdAt: string;
  application: {
    applicationNumber: string;
    verificationType: string;
    applicationCategory: string;
    payload: ApplicationWizardValues;
  };
};

const TAB_NAMES = [
  "Overview",
  "Company",
  "Location",
  "Scope",
  "Schedule",
  "Team",
  "Documents",
  "Products",
  "On Site Verification",
  "Report",
] as const;
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
    queryKey: ["surveyor-workspace", "assignments", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${id}`);
      if (!response.ok) throw new Error("Penugasan tidak ditemukan");
      const json = (await response.json()) as { data: AssignmentDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-[#8a7565]">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Penugasan tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  const { payload } = data.application;

  return (
    <div className="flex min-h-screen flex-col bg-[#fdf5f2]">
      <header className="sticky top-0 z-50 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#e1bfb3] bg-[#fff8f6] px-6">
        <div className="flex items-center gap-10">
          <span className="font-sv-headline-lg text-xl font-bold text-sv-primary-container">
            IndustrialVerify
          </span>
          <div className="flex h-full items-center gap-8">
            <span className="flex h-16 items-center border-b-2 border-sv-primary-container font-sv-headline-lg text-base text-sv-primary-container">
              Workspace
            </span>
            <span className="flex h-16 items-center font-sv-headline-lg text-base text-[#5f5e5e]">
              Library
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <MaterialIcon name="sync" className="text-sv-primary-container" />
          <MaterialIcon name="notifications" className="text-sv-primary-container" />
          <div className="flex size-[38px] items-center justify-center rounded-full bg-sv-primary-container text-[13px] font-bold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] box-border px-6 pt-6">
        <Link
          href="/surveyor-workspace/assignments"
          className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-[#5f5e5e]"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          Back to Assignments
        </Link>

        <div className="grid grid-cols-2 gap-0 rounded-[14px] border border-[#e8d5c5] bg-white px-7 py-5 shadow-sm md:grid-cols-6">
          <div className="pr-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Assignment ID</div>
            <div className="text-sm font-bold">{data.assignmentNumber}</div>
          </div>
          <div className="border-l border-[#f0ded0] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Application ID</div>
            <div className="text-sm font-bold">{data.application.applicationNumber}</div>
          </div>
          <div className="border-l border-[#f0ded0] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Tanggal Penugasan</div>
            <div className="text-sm font-bold">
              {new Date(data.createdAt).toLocaleDateString("id-ID")}
            </div>
          </div>
          <div className="border-l border-[#f0ded0] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Jenis Penugasan</div>
            <div className="text-sm font-bold">
              Verifikasi Lapangan {data.application.verificationType}
            </div>
          </div>
          <div className="border-l border-[#f0ded0] px-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Status</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f6ee] px-2.5 py-1 text-[11.5px] font-bold text-[#027a48]">
              <MaterialIcon name="check_circle" className="text-[13px]" />
              {ASSIGNMENT_STATUS_LABELS[data.status]}
            </span>
          </div>
          <div className="border-l border-[#f0ded0] pl-5">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[#a68f80]">Priority</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fce8e6] px-2.5 py-1 text-[11.5px] font-bold text-[#ba1a1a]">
              <MaterialIcon name="priority_high" className="text-[13px]" />
              {data.priority}
            </span>
          </div>
        </div>
      </div>

      <nav className="sticky top-16 z-40 mx-auto w-full max-w-[1440px] box-border overflow-x-auto bg-[#fdf5f2] px-6 pt-5">
        <div className="flex w-max min-w-full gap-0.5 rounded-full bg-[#e9e6e3] p-[5px]">
          {TAB_NAMES.map((name) => {
            const isActive = activeTab === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveTab(name)}
                className={
                  "whitespace-nowrap rounded-full px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors " +
                  (isActive ? "bg-white text-[#261813] shadow-sm" : "text-[#4a4038]")
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
        {activeTab === "Company" && <CompanyTab payload={payload} />}
        {activeTab === "Location" && <LocationTab payload={payload} />}
        {activeTab === "Scope" && <ScopeTab />}
        {activeTab === "Schedule" && <ScheduleTab assignmentId={id} payload={payload} />}
        {activeTab === "Team" && (
          <TeamTab team={data.team} status={data.status} companyName={payload.companyName} applicationNumber={data.application.applicationNumber} />
        )}
        {activeTab === "Documents" && <DocumentsTab payload={payload} />}
        {activeTab === "Products" && <ProductsTab payload={payload} />}
        {activeTab === "On Site Verification" && <OnSiteTab assignmentId={id} />}
        {activeTab === "Report" && <ReportTab assignmentId={id} />}
      </main>

      <footer className="sticky bottom-0 flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-l-4 border-l-sv-primary-container border-t border-[#e8d5c5] bg-white px-7 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div>
          <div className="text-base font-extrabold">Ready to Start Verification?</div>
          <div className="text-[13px] text-[#594138]">
            Mulai proses verifikasi lapangan atau download surat penugasan
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/surveyor-workspace/assignments"
            className="flex items-center gap-2 rounded-full border border-[#e1bfb3] px-5 py-3 text-[13.5px] font-bold text-[#261813]"
          >
            <MaterialIcon name="arrow_back" />
            Back to Assignments
          </Link>
          <button
            type="button"
            onClick={() => setActiveTab("On Site Verification")}
            className="flex items-center gap-2 rounded-full bg-sv-primary-container px-6 py-3 text-[13.5px] font-bold text-white"
          >
            <MaterialIcon name="play_arrow" filled />
            Start Verification
          </button>
        </div>
      </footer>
    </div>
  );
}
