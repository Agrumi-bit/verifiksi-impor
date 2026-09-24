"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import type { AssignmentStatusValue } from "../status";

type ReportItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  locationType: string;
  address: string;
  city: string | null;
  submittedAt: string | null;
  isOfficeReport: boolean;
  assignmentStatus: AssignmentStatusValue;
};

type ReportStatusFilter = "ALL" | "SELESAI" | "KETIDAKSESUAIAN" | "MENUNGGU";
type JenisFilter = "ALL" | "VKI" | "VIU";

const REPORT_STATUS: Record<"SELESAI" | "KETIDAKSESUAIAN" | "MENUNGGU", { label: string; bg: string; color: string }> = {
  SELESAI: { label: "Selesai", bg: "#e2f7ea", color: "#1a9850" },
  KETIDAKSESUAIAN: { label: "Ada Ketidaksesuaian", bg: "#fbe4de", color: "#c1361f" },
  MENUNGGU: { label: "Menunggu Keputusan", bg: "#f2ece5", color: "#6b5b4c" },
};

function reportStatusFor(assignmentStatus: AssignmentStatusValue): keyof typeof REPORT_STATUS {
  if (assignmentStatus === "COMPLETED") return "SELESAI";
  if (assignmentStatus === "RETURNED") return "KETIDAKSESUAIAN";
  return "MENUNGGU";
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function ReportThumbnail() {
  return (
    <div className="flex flex-col items-center border-b border-[#f0ded0] bg-[#faf1e8] px-[18px] pb-3.5 pt-[22px]">
      <div className="flex h-20 w-16 flex-col gap-1 rounded-[4px] border border-[#e8d5c5] bg-white p-2 shadow-[0_3px_8px_rgba(60,30,20,.08)]">
        <div className="h-[3px] w-[70%] rounded-sm bg-[#e0662e]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] w-[80%] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] rounded-sm bg-[#e8d5c5]" />
        <div className="h-[2px] w-[60%] rounded-sm bg-[#e8d5c5]" />
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: ReportItem }) {
  const statusKey = reportStatusFor(report.assignmentStatus);
  const status = REPORT_STATUS[statusKey];
  const href = report.isOfficeReport
    ? `/verifikator-workspace/assignments/${report.assignmentNumber}/report/${report.id}`
    : `/verifikator-workspace/assignments/${report.assignmentNumber}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#f0ded0] bg-white">
      <ReportThumbnail />
      <div className="flex flex-1 flex-col gap-1.5 p-[18px]">
        <div className="text-[14px] font-bold text-[#2b2420]">{report.companyName}</div>
        <div className="text-xs text-[#a68f80]">{report.assignmentNumber}</div>
        <div className="text-xs text-[#8a7565]">
          {fmtDate(report.submittedAt)} · {report.verificationType}
        </div>
        <div className="mt-1">
          <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
        </div>
        <Link
          href={href}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-[7px] border border-[#e1bfb3] bg-white px-3 py-2 text-xs font-semibold text-[#261813]"
        >
          <MaterialIcon name="visibility" className="text-[15px]" />
          {report.isOfficeReport ? "View Report" : "View Assignment"}
        </Link>
      </div>
    </div>
  );
}

export function ReportsTable() {
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<JenisFilter>("ALL");
  const [status, setStatus] = useState<ReportStatusFilter>("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "reports"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/reports");
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: ReportItem[] };
      return json.data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((report) => {
      if (q && !report.companyName.toLowerCase().includes(q)) return false;
      if (jenis !== "ALL" && report.verificationType !== jenis) return false;
      if (status !== "ALL" && reportStatusFor(report.assignmentStatus) !== status) return false;
      return true;
    });
  }, [data, search, jenis, status]);

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Reports</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Laporan hasil verifikasi yang telah Anda selesaikan.</div>
      </div>

      <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-[18px_22px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MaterialIcon name="filter_alt" className="text-[18px] text-[#594138]" />
            <span className="text-sm font-bold text-[#2b2420]">Filter Laporan</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-[7px] text-xs font-semibold text-[#261813]"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
            <MaterialIcon name={showFilters ? "expand_less" : "expand_more"} className="text-[15px]" />
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#f5ebe1] pt-4 sm:grid-cols-3">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Cari Perusahaan</div>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nama perusahaan..."
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Jenis Verifikasi</div>
              <select
                value={jenis}
                onChange={(event) => setJenis(event.target.value as JenisFilter)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="VKI">VKI</option>
                <option value="VIU">VIU</option>
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-[#594138]">Status</div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ReportStatusFilter)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="SELESAI">Selesai</option>
                <option value="KETIDAKSESUAIAN">Ada Ketidaksesuaian</option>
                <option value="MENUNGGU">Menunggu Keputusan</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3.5 text-[13px] text-[#8a7565]">{filtered.length} laporan ditemukan</div>

      {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
      {isError && <p className="p-6 text-center text-[#c1361f]">Gagal memuat laporan.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[#a68f80]">
          Belum ada laporan survey yang tersedia.
        </p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
