"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Hourglass, XCircle, type LucideIcon } from "lucide-react";

import { STATUS_LABELS, ACTIVE_STATUSES, type ApplicationStatusValue } from "@/modules/company-workspace/status";
import { APPLICATION_STATUS_STYLE } from "../status-style";
import type { VerificationType } from "../schema";

type ApplicationListItem = {
  id: string;
  applicationNumber: string;
  verificationType: VerificationType;
  applicationCategory: string;
  companyName: string;
  status: ApplicationStatusValue;
  createdAt: string;
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ApplicationTable() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<"" | VerificationType>("");
  const [status, setStatus] = useState<"" | ApplicationStatusValue>("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const response = await fetch("/api/applications");
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      const json = (await response.json()) as { data: ApplicationListItem[] };
      return json.data;
    },
  });

  const applications = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const total = applications.length;
    const dalamProses = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
    const selesai = applications.filter((a) => a.status === "COMPLETED").length;
    const ditolak = applications.filter((a) => a.status === "REJECTED").length;
    return [
      { label: "TOTAL PERMOHONAN", value: total, color: "#e0662e", bg: "#fdeadd", icon: ClipboardList },
      { label: "DALAM PROSES", value: dalamProses, color: "#4a4fb0", bg: "#e6e9fb", icon: Hourglass },
      { label: "SELESAI", value: selesai, color: "#1a7a4c", bg: "#e2f7ea", icon: CheckCircle2 },
      { label: "DITOLAK", value: ditolak, color: "#ba1a1a", bg: "#fce8e6", icon: XCircle },
    ] satisfies { label: string; value: number; color: string; bg: string; icon: LucideIcon }[];
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (q && !a.companyName.toLowerCase().includes(q) && !a.applicationNumber.toLowerCase().includes(q)) {
        return false;
      }
      if (jenis && a.verificationType !== jenis) return false;
      if (status && a.status !== status) return false;
      return true;
    });
  }, [applications, search, jenis, status]);

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">Application Management</div>
          <p className="mt-1 max-w-140 text-[13px] text-[#8a7565]">
            Kelola permohonan verifikasi yang diajukan perusahaan sebelum ditugaskan ke surveyor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/applications/new")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          + Tambah Application Baru
        </button>
      </div>

      <div className="mb-5.5 grid grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-4"
          >
            <div>
              <div className="text-[11px] font-semibold tracking-[0.03em] text-[#a68f80]">{stat.label}</div>
              <div className="mt-0.5 text-[24px] font-extrabold" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
            <div
              className="flex size-9.5 items-center justify-center rounded-lg"
              style={{ background: stat.bg, color: stat.color }}
            >
              <stat.icon className="size-4.75" />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] text-[#594138]">⚗</span>
            <span className="text-[14px] font-bold text-[#2b2420]">Filter Permohonan</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#261813]"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[#f5ebe1] pt-4">
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Cari Permohonan</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama perusahaan atau ID..."
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Jenis Verifikasi</div>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as "" | VerificationType)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Jenis</option>
                <option value="VKI">VKI</option>
                <option value="VIU">VIU</option>
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | ApplicationStatusValue)}
                className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#594138] outline-none"
              >
                <option value="">Semua Status</option>
                {(Object.keys(STATUS_LABELS) as ApplicationStatusValue[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3.5 text-[13px] text-[#8a7565]">{filtered.length} permohonan ditemukan</div>

      <div className="overflow-hidden rounded-[10px] border border-[#f0ded0] bg-white">
        <div
          className="grid gap-3 px-4.5 py-3 text-[11px] font-bold tracking-[0.03em] text-white"
          style={{ gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr 1fr 0.8fr", background: "#e0662e" }}
        >
          <div>APPLICATION ID</div>
          <div>PERUSAHAAN</div>
          <div>JENIS</div>
          <div>DIAJUKAN</div>
          <div>STATUS</div>
          <div>AKSI</div>
        </div>

        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[13px] text-[#ba1a1a]">Gagal memuat data permohonan.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="p-6 text-center text-[13px] text-[#8a7565]">
            {applications.length === 0
              ? "Belum ada permohonan yang disubmit."
              : "Tidak ada permohonan yang cocok dengan filter."}
          </p>
        )}

        {filtered.map((application) => (
          <div
            key={application.id}
            className="grid items-center gap-3 border-t border-[#f5ebe1] px-4.5 py-3.5"
            style={{ gridTemplateColumns: "1.2fr 1.8fr 1fr 1fr 1fr 0.8fr" }}
          >
            <div className="font-mono text-[12px] font-semibold text-[#4a4038]">{application.applicationNumber}</div>
            <div className="text-[12.5px] text-[#4a4038]">{application.companyName}</div>
            <div>
              <span className="rounded-md bg-[#f2f0ee] px-2.5 py-0.5 text-[11px] font-bold text-[#4a4038]">
                {application.verificationType}
              </span>
            </div>
            <div className="text-[12.5px] text-[#4a4038]">{fmtDate(application.createdAt)}</div>
            <div>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{
                  background: APPLICATION_STATUS_STYLE[application.status].bg,
                  color: APPLICATION_STATUS_STYLE[application.status].color,
                }}
              >
                {STATUS_LABELS[application.status]}
              </span>
            </div>
            <div>
              <Link href={`/applications/${application.id}`} className="text-[12.5px] font-semibold text-[#c14a1f]">
                Detail
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
