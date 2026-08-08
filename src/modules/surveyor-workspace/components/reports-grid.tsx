"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { MaterialIcon } from "./material-icon";
import { LOCATION_TYPE_LABELS } from "../status";

type ReportListItem = {
  id: string;
  assignmentNumber: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  locationType: string;
  address: string;
  city: string | null;
  submittedAt: string | null;
  needsRevision: boolean;
};

type StatusFilter = "ALL" | "OK" | "ISSUE";
type LocationFilter = "ALL" | "KANTOR" | "GUDANG" | "PABRIK";

const SHORT_LOCATION_LABEL: Record<string, string> = {
  KANTOR: "Kantor",
  GUDANG: "Gudang",
  PABRIK: "Pabrik",
};

const DOC_PREFIX: Record<string, string> = {
  KANTOR: "LV-KTR",
  GUDANG: "LV-GDG",
  PABRIK: "LV-PBR",
};

const VERIFICATION_TYPE_LABELS: Record<string, string> = {
  VKI: "Verifikasi Kemampuan Industri",
  VIU: "Verifikasi Importir Umum",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[4.5px] font-semibold tracking-[0.1em]" style={{ color: "oklch(0.72 0.1 75)" }}>
        {label}
      </div>
      <div className={`truncate text-[6.5px] font-semibold text-white ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function ReportCoverThumbnail({ report, surveyorName }: { report: ReportListItem; surveyorName: string }) {
  const label = SHORT_LOCATION_LABEL[report.locationType] ?? report.locationType;
  const docCode = `${DOC_PREFIX[report.locationType] ?? "LV"}/${report.assignmentNumber}`;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(155deg, oklch(0.15 0.035 250) 0%, oklch(0.19 0.045 250) 55%, oklch(0.14 0.03 250) 100%)",
      }}
    >
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, oklch(0.75 0.14 75), oklch(0.7 0.15 45))" }} />
      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div
              className="flex size-[14px] items-center justify-center rounded-[3px] text-[7px] font-extrabold"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.68 0.15 45))", color: "oklch(0.15 0.035 250)" }}
            >
              IV
            </div>
            <div className="text-[6px] font-bold tracking-[0.12em] text-white">INDUSTRIALVERIFY</div>
          </div>
          <div className="rounded-full border border-white/30 px-1.5 py-[2px] text-[5px] font-semibold tracking-[0.14em] text-white/85">
            INTERNAL
          </div>
        </div>

        <div className="mt-auto">
          <div
            className="mb-1.5 inline-block rounded-full px-2 py-[3px] text-[5.5px] font-bold tracking-[0.14em]"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.7 0.15 55))", color: "oklch(0.2 0.05 70)" }}
          >
            LAPORAN VERIFIKASI LAPANGAN
          </div>
          <div className="font-serif text-[15px] font-extrabold leading-tight text-white">Verifikasi Lokasi {label}</div>
          <div className="mt-1 truncate text-[7px] leading-snug" style={{ color: "oklch(0.88 0.02 250)" }}>
            {report.companyName}
          </div>
          <div className="truncate text-[7px] leading-snug" style={{ color: "oklch(0.88 0.02 250)" }}>
            {report.address}
            {report.city ? `, ${report.city}` : ""}
          </div>
        </div>

        <div
          className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 rounded-[8px] px-2 py-2"
          style={{ background: "oklch(0.22 0.04 250 / 0.55)", border: "1px solid oklch(1 0 0 / 0.12)" }}
        >
          <MetaField label="NOMOR DOKUMEN" value={docCode} mono />
          <MetaField label="NOMOR PENUGASAN" value={report.assignmentNumber} mono />
          <MetaField label="NOMOR APLIKASI" value={report.applicationNumber} mono />
          <MetaField label="TANGGAL TERBIT" value={fmtDate(report.submittedAt)} />
          <MetaField label="DISUSUN OLEH" value={surveyorName} />
          <MetaField label="JENIS VERIFIKASI" value={report.verificationType} />
        </div>
      </div>
    </div>
  );
}

function isThisMonth(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
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

export function ReportsGrid() {
  const { data: session } = useSession();
  const surveyorName = session?.user.name ?? "—";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "reports"],
    queryFn: async () => {
      const response = await fetch("/api/surveyor-workspace/reports");
      if (!response.ok) throw new Error("Gagal memuat data report");
      return (await response.json()) as { data: ReportListItem[] };
    },
  });

  const reports = useMemo(() => data?.data ?? [], [data]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      ok: reports.filter((r) => !r.needsRevision).length,
      issue: reports.filter((r) => r.needsRevision).length,
      thisMonth: reports.filter((r) => isThisMonth(r.submittedAt)).length,
    }),
    [reports],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter === "OK" && r.needsRevision) return false;
      if (statusFilter === "ISSUE" && !r.needsRevision) return false;
      if (locationFilter !== "ALL" && r.locationType !== locationFilter) return false;
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.applicationNumber.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    });
  }, [reports, query, statusFilter, locationFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#2b2420]">Reports</h1>
        <p className="mt-1 text-[13px] text-[#8a7565]">Laporan hasil verifikasi yang telah Anda selesaikan.</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL REPORTS" value={stats.total} icon="description" iconWrapClassName="bg-[#f5ebe1]" />
        <StatCard
          label="SELESAI"
          value={stats.ok}
          icon="check_circle"
          valueClassName="text-[#027a48]"
          iconWrapClassName="bg-[#e2f7ea]"
        />
        <StatCard
          label="ADA KETIDAKSESUAIAN"
          value={stats.issue}
          icon="error"
          valueClassName="text-[#ba1a1a]"
          iconWrapClassName="bg-[#fbe2e0]"
        />
        <StatCard label="BULAN INI" value={stats.thisMonth} icon="calendar_month" iconWrapClassName="bg-[#f5ebe1]" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white px-3.5 py-2.5">
        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <MaterialIcon name="search" className="text-base text-[#a68f80]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full bg-transparent text-[12.5px] text-[#2b2420] placeholder:text-[#a68f80] focus:outline-none"
          />
        </div>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="ALL">Semua Status</option>
          <option value="OK">Selesai</option>
          <option value="ISSUE">Ada Ketidaksesuaian</option>
        </select>
        <select
          className="border-l border-[#f0ded0] bg-transparent pl-3.5 text-[12.5px] text-[#4a4038] outline-none"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}
        >
          <option value="ALL">Semua Lokasi</option>
          <option value="KANTOR">{LOCATION_TYPE_LABELS.KANTOR}</option>
          <option value="GUDANG">{LOCATION_TYPE_LABELS.GUDANG}</option>
          <option value="PABRIK">{LOCATION_TYPE_LABELS.PABRIK}</option>
        </select>
        <span className="whitespace-nowrap border-l border-[#f0ded0] pl-3.5 text-xs text-[#a68f80]">
          {filtered.length} dari {reports.length} report
        </span>
      </div>

      {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
      {isError && <p className="text-sm text-destructive">Gagal memuat data report.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-[#8a7565]">
          {reports.length === 0 ? "Belum ada report yang selesai." : "Tidak ada report yang cocok dengan filter."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((report) => {
          const label = SHORT_LOCATION_LABEL[report.locationType] ?? report.locationType;
          const docCode = `${DOC_PREFIX[report.locationType] ?? "LV"}/${report.assignmentNumber}`;
          const verificationLabel = VERIFICATION_TYPE_LABELS[report.verificationType] ?? report.verificationType;

          return (
            <Link
              key={report.id}
              href={`/surveyor-workspace/assignments/${report.assignmentNumber}/verify/${report.id}/report`}
              className="group block"
              style={{ perspective: "1600px" }}
            >
              <div
                className="relative aspect-[1/1.41] w-full transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:[transform:rotateY(180deg)]"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front: report cover */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-[#e0662e]/60 shadow-sm"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <ReportCoverThumbnail report={report} surveyorName={surveyorName} />
                </div>

                {/* Back: report info */}
                <div
                  className="absolute inset-0 flex flex-col gap-3 overflow-hidden rounded-2xl border-2 border-[#e0662e]/60 bg-white p-4 shadow-sm"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] leading-snug text-[#2b2420]">
                      <div>Laporan Hasil Survey</div>
                      <div>Verifikasi Lokasi {label}</div>
                      <div>{verificationLabel}</div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
                      style={
                        report.needsRevision
                          ? { background: "#fbe2e0", color: "#ba1a1a" }
                          : { background: "#e2f7ea", color: "#027a48" }
                      }
                    >
                      {report.needsRevision ? "Ada Ketidaksesuaian" : "Selesai"}
                    </span>
                  </div>

                  <div className="text-[22px] font-extrabold leading-tight text-[#e0662e]">{report.companyName}</div>

                  <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                    <div className="text-[12px] leading-snug text-[#4a4038]">
                      <div className="font-mono">{docCode}</div>
                      <div className="text-[#8a7565]">{fmtDate(report.submittedAt)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-[#e0662e] px-4 py-2.5 text-[13px] font-bold text-white">
                      <MaterialIcon name="visibility" className="text-[16px]" />
                      View Report
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
