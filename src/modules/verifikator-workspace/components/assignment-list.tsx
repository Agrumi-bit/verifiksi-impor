"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  dueDate: string | null;
  validatedAt: string | null;
};

type Stats = { total: number; submitted: number; returned: number; completed: number };

const PAGE_SIZE = 10;

const STATUS_BADGE_CLASS: Record<AssignmentStatusValue, string> = {
  ASSIGNED: "bg-[#e8e6e3] text-[#4a4a4a]",
  SCHEDULED: "bg-[#3454d1] text-white",
  IN_PROGRESS: "bg-[#e8e6e3] text-[#4a4a4a]",
  SUBMITTED: "bg-[#2d2926] text-white",
  RETURNED: "bg-[#c1352b] text-white",
  COMPLETED: "bg-[#0f7a4d] text-white",
};

const PRIORITY_BADGE_CLASS: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#b3650c] text-white",
  HIGH: "bg-[#c1352b] text-white",
  CRITICAL: "bg-[#c1352b] text-white",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ label, value, icon, valueClassName }: { label: string; value: number; icon: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#e4e7f2] bg-white p-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#8891ab]">{label}</p>
        <h3 className={`mt-0.5 text-2xl font-extrabold text-[#1f2437] ${valueClassName ?? ""}`}>
          {String(value).padStart(2, "0")}
        </h3>
      </div>
      <div className="flex size-[34px] items-center justify-center rounded-lg bg-[#eef0fa] text-base">
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
    queryKey: ["verifikator-workspace", "assignments", { q, status, priority, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "ALL") params.set("status", status);
      if (priority !== "ALL") params.set("priority", priority);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/verifikator-workspace/assignments?${params.toString()}`);
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
  const stats = data?.stats ?? { total: 0, submitted: 0, returned: 0, completed: 0 };

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#1f2437]">My Assignment</div>
        <div className="mt-1 max-w-[520px] text-[13px] text-[#7d8398]">
          Assignment yang telah Anda klaim untuk direview — mulai dari survey report, dokumen, hingga produk.
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL" value={stats.total} icon="folder_open" />
        <StatCard label="MENUNGGU REVIEW" value={stats.submitted} icon="pending_actions" valueClassName="text-[#3454d1]" />
        <StatCard label="DIKEMBALIKAN" value={stats.returned} icon="undo" valueClassName="text-[#c1352b]" />
        <StatCard label="SELESAI" value={stats.completed} icon="task_alt" valueClassName="text-[#0f7a4d]" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#e4e7f2] bg-white px-3.5 py-2.5">
        <div className="relative flex-1">
          <MaterialIcon name="search" className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[#8891ab]" />
          <input
            className="w-full border-none bg-transparent py-1 pl-6 text-[13px] text-[#1f2437] outline-none placeholder:text-[#8891ab]"
            placeholder="Cari berdasarkan Assignment # atau Perusahaan"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          className="border-l border-[#e4e7f2] bg-transparent pl-3.5 text-[12.5px] text-[#3d4258] outline-none"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AssignmentStatusValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">Semua Status</option>
          {ASSIGNMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <select
          className="border-l border-[#e4e7f2] bg-transparent pl-3.5 text-[12.5px] text-[#3d4258] outline-none"
          value={priority}
          onChange={(event) => {
            setPriority(event.target.value as AssignmentPriorityValue | "ALL");
            setPage(1);
          }}
        >
          <option value="ALL">Semua Prioritas</option>
          {ASSIGNMENT_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {ASSIGNMENT_PRIORITY_LABELS[option]}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap border-l border-[#e4e7f2] pl-3.5 text-xs text-[#8891ab]">
          Showing {rangeStart}-{rangeEnd} of {total}
        </span>
        <div className="flex gap-1.5 border-l border-[#e4e7f2] pl-2.5 text-[#8891ab]">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="disabled:opacity-30">
            ‹
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="disabled:opacity-30">
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#8891ab]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#c1352b]">Gagal memuat data penugasan.</p>}
        {!isLoading && !isError && data?.data.length === 0 && (
          <p className="p-6 text-center text-[#8891ab]">Belum ada assignment yang Anda klaim.</p>
        )}
        {data?.data.map((assignment) => (
          <div key={assignment.id} className="rounded-[10px] border border-[#e4e7f2] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-[#1f2437]">{assignment.companyName}</span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${STATUS_BADGE_CLASS[assignment.status]}`}>
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${PRIORITY_BADGE_CLASS[assignment.priority]}`}>
                  {ASSIGNMENT_PRIORITY_LABELS[assignment.priority].toUpperCase()}
                </span>
              </div>
              <Link
                href={`/verifikator-workspace/assignments/${assignment.assignmentNumber}`}
                className="rounded-lg border border-[#e4e7f2] bg-white px-[13px] py-[7px] text-[12.5px] font-semibold text-[#1f2437]"
              >
                👁 View Assignment
              </Link>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2">
              <div className="text-[12.5px] text-[#3d4258]">
                📄 <span className="text-[#8891ab]">Assignment ID</span>
                <br />
                <span className="font-semibold">{assignment.assignmentNumber}</span>
              </div>
              <div className="text-[12.5px] text-[#3d4258]">
                📄 <span className="text-[#8891ab]">Application ID</span>
                <br />
                <span className="font-semibold">{assignment.applicationNumber}</span>
              </div>
              <div className="text-[12.5px] text-[#3d4258]">🏛 {assignment.verificationType}</div>
              <div className="text-[12.5px] text-[#3d4258]">📦 {assignment.productCategory ?? "—"}</div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f2fa] pt-2.5">
              <div className="flex flex-wrap gap-4 text-xs text-[#7d8398]">
                <span>🗓 Assigned: {fmtDate(assignment.createdAt)}</span>
                <span>⏰ Due: {fmtDate(assignment.dueDate)}</span>
                {assignment.validatedAt && <span>✔ Diputuskan: {fmtDate(assignment.validatedAt)}</span>}
              </div>
              <Link
                href={`/verifikator-workspace/assignments/${assignment.assignmentNumber}`}
                className="rounded-lg bg-[#3454d1] px-4 py-2 text-[12.5px] font-semibold text-white"
              >
                ▶ Review Assignment
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#e4e7f2] pt-4">
        <p className="text-[11.5px] text-[#8891ab]">Industrial Verification Platform | {total} penugasan</p>
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
                    ? "flex size-[26px] items-center justify-center rounded-md bg-[#3454d1] text-xs font-semibold text-white"
                    : "flex size-[26px] items-center justify-center rounded-md text-xs font-semibold text-[#3d4258]"
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
