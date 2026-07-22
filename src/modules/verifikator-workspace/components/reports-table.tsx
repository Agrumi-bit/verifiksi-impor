"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import { LOCATION_TYPE_ICON, LOCATION_TYPE_LABELS } from "../status";

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
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function ReportsTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "reports"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/reports");
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: ReportItem[] };
      return json.data;
    },
  });

  const reports = data ?? [];

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#1f2437]">Reports</div>
        <div className="mt-1 max-w-[560px] text-[13px] text-[#7d8398]">
          Laporan hasil survey lapangan dari seluruh assignment yang pernah Anda tangani.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[#8891ab]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[#c1352b]">Gagal memuat laporan.</p>}
        {!isLoading && !isError && reports.length === 0 && (
          <p className="p-6 text-center text-[#8891ab]">Belum ada laporan survey yang tersedia.</p>
        )}
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e4e7f2] bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#eef0fa] text-[#3454d1]">
                <MaterialIcon name={LOCATION_TYPE_ICON[report.locationType] ?? "description"} />
              </div>
              <div>
                <div className="text-[14px] font-bold text-[#1f2437]">{report.companyName}</div>
                <div className="text-xs text-[#8891ab]">
                  {report.assignmentNumber} · {LOCATION_TYPE_LABELS[report.locationType] ?? report.locationType} ·{" "}
                  {report.address}
                  {report.city ? `, ${report.city}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-xs text-[#7d8398]">
                <div>Submitted</div>
                <div className="font-semibold text-[#1f2437]">{fmtDate(report.submittedAt)}</div>
              </div>
              {report.isOfficeReport ? (
                <Link
                  href={`/verifikator-workspace/assignments/${report.assignmentNumber}/report/${report.id}`}
                  className="rounded-lg bg-[#3454d1] px-4 py-2 text-[12.5px] font-semibold text-white"
                >
                  Lihat Laporan
                </Link>
              ) : (
                <Link
                  href={`/verifikator-workspace/assignments/${report.assignmentNumber}`}
                  className="rounded-lg border border-[#e4e7f2] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#1f2437]"
                >
                  Lihat Assignment
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
