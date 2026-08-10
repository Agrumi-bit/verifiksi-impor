"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import {
  ASSIGNMENT_PRIORITY_BADGE,
  TECHNICAL_MODULE_STATUS_BADGE,
  TECHNICAL_MODULE_STATUS_LABELS,
  TECHNICAL_STAT_CARDS,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
  type TechnicalModuleStatusValue,
  type TechnicalStatCounts,
} from "../status";

type AssignmentListItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  createdAt: string;
  dueDate: string | null;
  validatedAt: string | null;
  overallStatus: TechnicalModuleStatusValue;
};

const PAGE_SIZE = 10;

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({ label, value, icon, color, iconBg }: { label: string; value: number; icon: string; color: string; iconBg: string }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{label}</p>
        <h3 className="mt-0.5 text-2xl font-extrabold" style={{ color }}>
          {String(value).padStart(2, "0")}
        </h3>
      </div>
      <div className="flex size-[34px] items-center justify-center rounded-lg" style={{ background: iconBg }}>
        <MaterialIcon name={icon} className="text-base" style={{ color }} />
      </div>
    </div>
  );
}

export function AssignmentList() {
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [overallFilter, setOverallFilter] = useState<TechnicalModuleStatusValue | "ALL">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["technical-analyst-workspace", "assignments", { q, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/technical-analyst-workspace/assignments?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data penugasan");
      return (await response.json()) as {
        data: AssignmentListItem[];
        total: number;
        page: number;
        pageSize: number;
        stats: TechnicalStatCounts;
      };
    },
  });

  const rows = data?.data ?? [];
  const filteredRows = overallFilter === "ALL" ? rows : rows.filter((row) => row.overallStatus === overallFilter);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = data?.stats ?? { total: 0, belumDianalisis: 0, sesuai: 0, tidakSesuai: 0 };

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">My Assignment</div>
        <div className="mt-1 max-w-[520px] text-[13px] text-[#8a7565]">
          Assignment analisis teknis yang ditugaskan kepada Anda.
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {TECHNICAL_STAT_CARDS.map((card) => (
          <StatCard key={card.key} label={card.label} value={stats[card.key]} icon={card.icon} color={card.color} iconBg={card.iconBg} />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white px-3.5 py-2.5">
        <div className="relative flex-1">
          <MaterialIcon name="search" className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[#a68f80]" />
          <input
            className="w-full border-none bg-transparent py-1 pl-6 text-[13px] text-[#2b2420] outline-none placeholder:text-[#a68f80]"
            placeholder="Cari berdasarkan Assignment # atau Perusahaan"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#594138] outline-none"
          value={overallFilter}
          onChange={(event) => setOverallFilter(event.target.value as TechnicalModuleStatusValue | "ALL")}
        >
          <option value="ALL">Semua Status Analisis</option>
          <option value="PENDING">{TECHNICAL_MODULE_STATUS_LABELS.PENDING}</option>
          <option value="SESUAI">{TECHNICAL_MODULE_STATUS_LABELS.SESUAI}</option>
          <option value="TIDAK_SESUAI">{TECHNICAL_MODULE_STATUS_LABELS.TIDAK_SESUAI}</option>
        </select>
        <span className="whitespace-nowrap border-l border-[#f0ded0] pl-3.5 text-xs text-[#a68f80]">
          {filteredRows.length} dari {total}
        </span>
        <div className="flex gap-1.5 border-l border-[#f0ded0] pl-2.5 text-[#a68f80]">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="disabled:opacity-30">
            ‹
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="disabled:opacity-30">
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#c1361f]">Gagal memuat data penugasan.</p>}
        {!isLoading && !isError && filteredRows.length === 0 && (
          <p className="p-6 text-center text-[#a68f80]">Belum ada assignment.</p>
        )}
        {filteredRows.map((assignment) => (
          <div key={assignment.id} className="rounded-[10px] border border-[#f0ded0] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-[#2b2420]">{assignment.companyName}</span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${TECHNICAL_MODULE_STATUS_BADGE[assignment.overallStatus]}`}>
                  {TECHNICAL_MODULE_STATUS_LABELS[assignment.overallStatus]}
                </span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${ASSIGNMENT_PRIORITY_BADGE[assignment.priority]}`}>
                  {assignment.priority}
                </span>
              </div>
              <Link
                href={`/technical-analyst-workspace/assignments/${assignment.assignmentNumber}`}
                className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2 text-[12.5px] font-semibold text-white"
              >
                <MaterialIcon name="play_arrow" className="text-[15px]" />
                Analisis
              </Link>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2">
              <div className="flex items-center gap-1.5 text-[12.5px] text-[#594138]">
                <MaterialIcon name="description" className="text-[15px] text-[#a68f80]" />
                <span>
                  <span className="text-[#a68f80]">Assignment ID</span>
                  <br />
                  <span className="font-semibold">{assignment.assignmentNumber}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] text-[#594138]">
                <MaterialIcon name="description" className="text-[15px] text-[#a68f80]" />
                <span>
                  <span className="text-[#a68f80]">Application ID</span>
                  <br />
                  <span className="font-semibold">{assignment.applicationNumber}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] text-[#594138]">
                <MaterialIcon name="account_balance" className="text-[15px] text-[#a68f80]" />
                {assignment.verificationType}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-[#f5ebe1] pt-2.5 text-xs text-[#8a7565]">
              <span className="flex items-center gap-1">
                <MaterialIcon name="event" className="text-sm" />
                Assigned: {fmtDate(assignment.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MaterialIcon name="schedule" className="text-sm" />
                Due: {fmtDate(assignment.dueDate)}
              </span>
              {assignment.validatedAt && (
                <span className="flex items-center gap-1">
                  <MaterialIcon name="check_circle" className="text-sm" />
                  Diputuskan: {fmtDate(assignment.validatedAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

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
                className="flex size-[26px] items-center justify-center rounded-md text-xs font-semibold"
                style={pageNumber === page ? { background: "#e0662e", color: "#fff" } : { color: "#594138" }}
              >
                {pageNumber}
              </button>
            ))}
        </nav>
      </div>
    </div>
  );
}
