"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_LABELS,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "../status";

type AssignmentListItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  businessType: string | null;
  productCategory: string | null;
  location: string | null;
  createdAt: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  dueDate: string | null;
};

type Stats = { total: number; assigned: number; inProgress: number; urgent: number };

const PAGE_SIZE = 10;

const STATUS_BADGE_CLASS: Record<AssignmentStatusValue, string> = {
  ASSIGNED: "bg-[#e8e6e3] text-[#4a4a4a]",
  SCHEDULED: "bg-[#e0662e] text-white",
  IN_PROGRESS: "bg-[#e8e6e3] text-[#4a4a4a]",
  SUBMITTED: "bg-[#2d2926] text-white",
  RETURNED: "bg-[#b23b3b] text-white",
  COMPLETED: "bg-[#1a9850] text-white",
};

const PRIORITY_BADGE_CLASS: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#e8933a] text-white",
  HIGH: "bg-[#b23b3b] text-white",
  CRITICAL: "bg-[#b23b3b] text-white",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({
  label,
  value,
  icon,
  valueClassName,
  iconWrapClassName,
}: {
  label: string;
  value: number;
  icon: string;
  valueClassName?: string;
  iconWrapClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{label}</p>
        <h3 className={`mt-0.5 text-2xl font-extrabold text-[#2b2420] ${valueClassName ?? ""}`}>
          {String(value).padStart(2, "0")}
        </h3>
      </div>
      <div className={`flex size-[34px] items-center justify-center rounded-lg text-base ${iconWrapClassName ?? "bg-[#f5ebe1]"}`}>
        <MaterialIcon name={icon} />
      </div>
    </div>
  );
}

export function AssignmentList() {
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AssignmentStatusValue | "ALL">("ALL");
  const [priority, setPriority] = useState<AssignmentPriorityValue | "ALL">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", { q, status, priority, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/surveyor-workspace/assignments?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data penugasan");
      return (await response.json()) as {
        data: AssignmentListItem[];
        total: number;
        page: number;
        pageSize: number;
        stats: Stats;
      };
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const stats = data?.stats ?? { total: 0, assigned: 0, inProgress: 0, urgent: 0 };

  return (
    <div className="p-7">
      {/* Page Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">My Assignments</div>
          <div className="mt-1 max-w-[520px] text-[13px] text-[#8a7565]">
            Manage your active verification pipeline. Monitor status across multiple programs and
            prioritize pending site inspections.
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => toast.info("Export List akan tersedia di iterasi berikutnya.")}
            className="rounded-lg border border-[#e8d5c5] bg-white px-4 py-[9px] text-[13px] font-semibold text-[#2b2420]"
          >
            ↓ Export List
          </button>
          <button
            type="button"
            onClick={() => toast.info("New Job Request akan tersedia di iterasi berikutnya.")}
            className="rounded-lg bg-[#e0662e] px-4 py-[9px] text-[13px] font-semibold text-white"
          >
            + New Job Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL JOBS" value={stats.total} icon="📋" iconWrapClassName="bg-[#f5ebe1]" />
        <StatCard
          label="ASSIGNED"
          value={stats.assigned}
          icon="📌"
          valueClassName="text-[#d9531f]"
          iconWrapClassName="bg-[#fdeadd]"
        />
        <StatCard label="IN PROGRESS" value={stats.inProgress} icon="⏳" iconWrapClassName="bg-[#f5ebe1]" />
        <StatCard
          label="URGENT"
          value={stats.urgent}
          icon="⚠"
          valueClassName="text-[#c0392b]"
          iconWrapClassName="bg-[#fbe4e0]"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white px-3.5 py-2.5">
        <div className="relative flex-1">
          <MaterialIcon name="search" className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[#a68f80]" />
          <input
            className="w-full border-none bg-transparent py-1 pl-6 text-[13px] text-[#2b2420] outline-none placeholder:text-[#a68f80]"
            placeholder="Search by Assignment # or Company"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AssignmentStatusValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">All Statuses</option>
          {ASSIGNMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={priority}
          onChange={(event) => {
            setPriority(event.target.value as AssignmentPriorityValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">All Priorities</option>
          {ASSIGNMENT_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap border-l border-[#f0ded0] pl-3.5 text-xs text-[#a68f80]">
          Showing {rangeStart}-{rangeEnd} of {total}
        </span>
        <div className="flex gap-1.5 border-l border-[#f0ded0] pl-2.5 text-[#a68f80]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {/* Assignment cards */}
      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#b23b3b]">Gagal memuat data penugasan.</p>}
        {!isLoading && !isError && data?.data.length === 0 && (
          <p className="p-6 text-center text-[#a68f80]">Belum ada penugasan yang sesuai.</p>
        )}
        {data?.data.map((assignment) => (
          <div
            key={assignment.id}
            className="rounded-[10px] border border-[#f0ded0] bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-[#2b2420]">{assignment.companyName}</span>
                <span
                  className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${STATUS_BADGE_CLASS[assignment.status]}`}
                >
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </span>
                <span
                  className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${PRIORITY_BADGE_CLASS[assignment.priority]}`}
                >
                  {ASSIGNMENT_PRIORITY_LABELS[assignment.priority].toUpperCase()}
                </span>
              </div>
              <Link
                href={`/surveyor-workspace/assignments/${assignment.assignmentNumber}`}
                className="rounded-lg border border-[#e8d5c5] bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-[#2b2420]"
              >
                👁 View Assignment
              </Link>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2">
              <div className="text-[12.5px] text-[#4a4038]">
                📄 <span className="text-[#a68f80]">Assignment ID</span>
                <br />
                <span className="font-semibold">{assignment.assignmentNumber}</span>
              </div>
              <div className="text-[12.5px] text-[#4a4038]">
                📄 <span className="text-[#a68f80]">Application ID</span>
                <br />
                <span className="font-semibold">{assignment.applicationNumber}</span>
              </div>
              <div className="text-[12.5px] text-[#4a4038]">💼 {assignment.businessType ?? "—"}</div>
              <div className="text-[12.5px] text-[#4a4038]">📦 {assignment.productCategory ?? "—"}</div>
            </div>
            <div className="mb-2.5 text-[12.5px] text-[#4a4038]">
              📍 {assignment.location ?? "Lokasi belum ditentukan"}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f5ebe1] pt-2.5">
              <div className="flex flex-wrap gap-4 text-xs text-[#8a7565]">
                <span>🗓 Assigned: {fmtDate(assignment.createdAt)}</span>
                <span>🗓 Verification: {fmtDate(assignment.scheduledDate)}</span>
                <span>⏰ Due: {fmtDate(assignment.dueDate)}</span>
              </div>
              <Link
                href={`/surveyor-workspace/assignments/${assignment.assignmentNumber}`}
                className="rounded-lg bg-[#e0662e] px-4 py-2 text-[12.5px] font-semibold text-white"
              >
                ▶ Start Verification
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-[#f0ded0] pt-4">
        <p className="text-[11.5px] text-[#a68f80]">Industrial Verification Platform | {total} penugasan</p>
        <nav className="flex gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(0, 6)
            .map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={
                  pageNumber === page
                    ? "flex size-[26px] items-center justify-center rounded-md bg-[#e0662e] text-xs font-semibold text-white"
                    : "flex size-[26px] items-center justify-center rounded-md text-xs font-semibold text-[#4a4038]"
                }
              >
                {pageNumber}
              </button>
            ))}
        </nav>
      </div>
    </div>
  );
}
