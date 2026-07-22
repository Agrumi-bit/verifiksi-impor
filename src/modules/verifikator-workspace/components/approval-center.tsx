"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { ASSIGNMENT_PRIORITY_LABELS, type AssignmentPriorityValue } from "../status";

type QueueItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  priority: AssignmentPriorityValue;
  claimedByMe: boolean;
  submittedAt: string;
  dueDate: string | null;
};

const PRIORITY_BADGE_CLASS: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#b3650c] text-white",
  HIGH: "bg-[#c1352b] text-white",
  CRITICAL: "bg-[#c1352b] text-white",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ApprovalCenter() {
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "approval-center", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const response = await fetch(`/api/verifikator-workspace/approval-center?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat approval center");
      return (await response.json()) as {
        data: QueueItem[];
        stats: { total: number; unclaimed: number; inReview: number };
      };
    },
  });

  const stats = data?.stats ?? { total: 0, unclaimed: 0, inReview: 0 };

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#1f2437]">Approval Center</div>
        <div className="mt-1 max-w-[620px] text-[13px] text-[#7d8398]">
          Antrean persetujuan (Approval Queue) — seluruh assignment yang telah selesai disurvey dan siap untuk
          diputuskan. Membuka sebuah item akan mengklaimnya untuk Anda review.
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[#e4e7f2] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-wide text-[#8891ab]">TOTAL DI ANTREAN</p>
          <h3 className="mt-0.5 text-2xl font-extrabold text-[#1f2437]">{String(stats.total).padStart(2, "0")}</h3>
        </div>
        <div className="rounded-[10px] border border-[#e4e7f2] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-wide text-[#8891ab]">BELUM DIKLAIM</p>
          <h3 className="mt-0.5 text-2xl font-extrabold text-[#b3650c]">{String(stats.unclaimed).padStart(2, "0")}</h3>
        </div>
        <div className="rounded-[10px] border border-[#e4e7f2] bg-white p-4">
          <p className="text-[11px] font-semibold tracking-wide text-[#8891ab]">SEDANG SAYA REVIEW</p>
          <h3 className="mt-0.5 text-2xl font-extrabold text-[#3454d1]">{String(stats.inReview).padStart(2, "0")}</h3>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#e4e7f2] bg-white px-3.5 py-2.5">
        <MaterialIcon name="search" className="text-sm text-[#8891ab]" />
        <input
          className="w-full border-none bg-transparent py-1 text-[13px] text-[#1f2437] outline-none placeholder:text-[#8891ab]"
          placeholder="Cari berdasarkan Assignment # atau Perusahaan"
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#8891ab]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#c1352b]">Gagal memuat approval center.</p>}
        {!isLoading && !isError && data?.data.length === 0 && (
          <p className="p-6 text-center text-[#8891ab]">Antrean approval kosong — belum ada assignment yang selesai disurvey.</p>
        )}
        {data?.data.map((item) => (
          <div key={item.id} className="rounded-[10px] border border-[#e4e7f2] bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-[#1f2437]">{item.companyName}</span>
                <span className={`rounded px-2.5 py-0.5 text-[10.5px] font-bold ${PRIORITY_BADGE_CLASS[item.priority]}`}>
                  {ASSIGNMENT_PRIORITY_LABELS[item.priority].toUpperCase()}
                </span>
                {item.claimedByMe ? (
                  <span className="rounded px-2.5 py-0.5 text-[10.5px] font-bold bg-[#e8ecfb] text-[#3454d1]">
                    Sedang Anda Review
                  </span>
                ) : (
                  <span className="rounded px-2.5 py-0.5 text-[10.5px] font-bold bg-[#fdedd6] text-[#b3650c]">
                    Belum Diklaim
                  </span>
                )}
              </div>
              <Link
                href={`/verifikator-workspace/assignments/${item.assignmentNumber}`}
                className="rounded-lg bg-[#3454d1] px-4 py-2 text-[12.5px] font-semibold text-white"
              >
                {item.claimedByMe ? "Lanjutkan Review" : "Buka & Klaim"}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-2 text-[12.5px] text-[#3d4258] md:grid-cols-3">
              <div>
                📄 <span className="text-[#8891ab]">Assignment ID</span>
                <br />
                <span className="font-semibold">{item.assignmentNumber}</span>
              </div>
              <div>
                🏛 <span className="text-[#8891ab]">Program</span>
                <br />
                <span className="font-semibold">{item.verificationType}</span>
              </div>
              <div>
                🗓 <span className="text-[#8891ab]">Survey Selesai</span>
                <br />
                <span className="font-semibold">{fmtDate(item.submittedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
