"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_PILL,
  ASSIGNMENT_STAT_CARDS,
  type AssignmentStatusValue,
} from "../status";
import type { AssignmentStatCounts } from "../assignment-stats";

type RecentAssignment = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  status: AssignmentStatusValue;
  dueDate: string | null;
};

type DashboardData = {
  stats: AssignmentStatCounts;
  recentAssignments: RecentAssignment[];
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function VerifikatorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/dashboard");
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      return (await response.json()) as DashboardData;
    },
  });

  const stats = data?.stats ?? { total: 0, waiting: 0, inReview: 0, completed: 0 };
  const recentAssignments = data?.recentAssignments ?? [];

  return (
    <div className="p-7">
      <div className="mb-[22px]">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Dashboard</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Ringkasan aktivitas verifikasi Anda.</div>
      </div>

      {isError && (
        <p className="mb-4 rounded-lg border border-[#f0ded0] bg-[#fbe4de] p-3 text-sm text-[#c1361f]">
          Gagal memuat data dashboard.
        </p>
      )}

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {ASSIGNMENT_STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4"
          >
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{card.label}</p>
              <h3 className="mt-0.5 text-2xl font-extrabold" style={{ color: card.color }}>
                {isLoading ? "—" : String(stats[card.key]).padStart(2, "0")}
              </h3>
            </div>
            <div
              className="flex size-[34px] items-center justify-center rounded-lg"
              style={{ background: card.iconBg }}
            >
              <MaterialIcon name={card.icon} className="text-[18px]" style={{ color: card.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-[22px]">
        <div className="mb-3.5 text-[15px] font-extrabold text-[#2b2420]">Assignment Terbaru</div>
        <div className="flex flex-col gap-2.5">
          {isLoading && <p className="text-sm text-[#a68f80]">Memuat...</p>}
          {!isLoading && recentAssignments.length === 0 && (
            <p className="text-sm text-[#a68f80]">Belum ada assignment.</p>
          )}
          {recentAssignments.map((assignment) => {
            const pill = ASSIGNMENT_STATUS_PILL[assignment.status];
            return (
              <Link
                key={assignment.id}
                href={`/verifikator-workspace/assignments/${assignment.assignmentNumber}`}
                className="flex items-center justify-between gap-3 rounded-[9px] border border-[#f0ded0] p-3.5 hover:bg-[#fdf5f2]"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-[#2b2420]">{assignment.companyName}</div>
                  <div className="mt-0.5 text-[11.5px] text-[#a68f80]">
                    {assignment.assignmentNumber} · {assignment.verificationType} · Due {fmtDate(assignment.dueDate)}
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold"
                  style={{ background: pill.bg, color: pill.color }}
                >
                  {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
