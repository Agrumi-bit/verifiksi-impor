"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Hourglass, XCircle, type LucideIcon } from "lucide-react";

import { CR_OUTCOMES, crOutcomeStyle } from "../status";

type ApplicationRow = {
  id: string;
  applicationNumber: string;
  company: string;
  jenis: string;
  submitted: string;
  outcome: string;
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const FINAL_OUTCOMES = ["Disetujui", "Ditolak"];

export function ApplicationListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [jenisFilter, setJenisFilter] = useState("Semua Jenis");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [showFilters, setShowFilters] = useState(true);
  const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-relation-workspace", "applications"],
    queryFn: async () => {
      const response = await fetch("/api/customer-relation-workspace/applications");
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      const json = (await response.json()) as { data: ApplicationRow[] };
      return json.data;
    },
  });

  const applications = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const inProgress = applications.filter((a) => !FINAL_OUTCOMES.includes(a.outcome)).length;
    const disetujui = applications.filter((a) => a.outcome === "Disetujui").length;
    const ditolak = applications.filter((a) => a.outcome === "Ditolak").length;
    return [
      { label: "TOTAL PERMOHONAN", value: applications.length, icon: ClipboardList, color: "#e0662e", bg: "#fdeadd" },
      { label: "DALAM PROSES", value: inProgress, icon: Hourglass, color: "#a3690a", bg: "#fdf0d5" },
      { label: "DISETUJUI", value: disetujui, icon: CheckCircle2, color: "#1f8a4c", bg: "#e5f6ec" },
      { label: "DITOLAK", value: ditolak, icon: XCircle, color: "#c1361f", bg: "#fbe4de" },
    ] satisfies { label: string; value: number; icon: LucideIcon; color: string; bg: string }[];
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (q && !a.company.toLowerCase().includes(q) && !a.applicationNumber.toLowerCase().includes(q)) return false;
      if (jenisFilter !== "Semua Jenis" && a.jenis !== jenisFilter) return false;
      if (statusFilter !== "Semua Status" && a.outcome !== statusFilter) return false;
      return true;
    });
  }, [applications, search, jenisFilter, statusFilter]);

  async function handleOutcomeChange(id: string, outcome: string) {
    const response = await fetch(`/api/customer-relation-workspace/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crOutcome: outcome }),
    });
    setOpenStatusRowId(null);
    if (!response.ok) return;
    queryClient.invalidateQueries({ queryKey: ["customer-relation-workspace", "applications"] });
  }

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Application List</div>
        <p className="mt-1 max-w-150 text-[13px] text-[#8a7565]">
          Daftar seluruh permohonan aplikasi yang masuk beserta status persetujuannya.
        </p>
      </div>

      <div className="mb-4.5 grid grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.02em] text-[#a68f80]">{stat.label}</div>
              <div className="mt-0.5 text-[24px] font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
            <div className="flex size-8.5 items-center justify-center rounded-lg" style={{ background: stat.bg }}>
              <stat.icon className="size-4.5" style={{ color: stat.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#20180f]">Filter Permohonan</div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
        {showFilters && (
          <div className="mt-3.5 grid grid-cols-3 gap-4 border-t border-[#f5ebe1] pt-3.5">
            <div>
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Cari Permohonan</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama perusahaan atau ID..."
                className="w-full rounded-lg border-none bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Jenis Verifikasi</div>
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="w-full rounded-lg border-none bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none"
              >
                <option>Semua Jenis</option>
                <option value="VKI">VKI</option>
                <option value="VIU">VIU</option>
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border-none bg-[#f7f2ec] px-3 py-2.5 text-[13px] text-[#20180f] outline-none"
              >
                <option>Semua Status</option>
                {CR_OUTCOMES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-2.5 text-[12.5px] text-[#8a7565]">{filtered.length} permohonan ditemukan</div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white">
        <div
          className="grid gap-3 rounded-t-[10px] px-4.5 py-2.75 text-[11px] font-bold tracking-[0.03em] text-[#8a5a3a]"
          style={{ gridTemplateColumns: "1.1fr 1.6fr 0.7fr 1fr 1.6fr 0.6fr", background: "#fdeadd" }}
        >
          <div>APPLICATION ID</div>
          <div>PERUSAHAAN</div>
          <div>JENIS</div>
          <div>DIAJUKAN</div>
          <div>STATUS</div>
          <div>AKSI</div>
        </div>

        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[13px] text-[#ba1a1a]">Gagal memuat data.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="p-10 text-center text-[13px] text-[#a68f80]">Tidak ada aplikasi yang cocok dengan filter ini.</p>
        )}

        {filtered.map((a) => {
          const style = crOutcomeStyle(a.outcome);
          return (
            <div
              key={a.id}
              className="grid items-center gap-3 border-t border-[#f5ebe1] px-4.5 py-3.25 text-[13px]"
              style={{ gridTemplateColumns: "1.1fr 1.6fr 0.7fr 1fr 1.6fr 0.6fr" }}
            >
              <div className="font-bold text-[#20180f]">{a.applicationNumber}</div>
              <div className="font-semibold text-[#c14a1f]">{a.company}</div>
              <div>
                <span className="rounded-md bg-[#f2ece5] px-2.25 py-0.75 text-[10.5px] font-bold text-[#6b5b4c]">{a.jenis}</span>
              </div>
              <div className="text-[#4a4038]">{fmtDate(a.submitted)}</div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenStatusRowId((cur) => (cur === a.id ? null : a.id))}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: style.bg, color: style.color }}
                >
                  {a.outcome}
                </button>
                {openStatusRowId === a.id && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-65 min-w-57.5 overflow-y-auto rounded-lg border border-[#f0ded0] bg-white shadow-lg">
                    {CR_OUTCOMES.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => handleOutcomeChange(a.id, o)}
                        className="block w-full px-3.5 py-2.25 text-left text-[12px] text-[#261813] hover:bg-[#fbeee5]"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => router.push(`/customer-relation-workspace/applications/${a.id}`)}
                  className="text-[12.5px] font-semibold text-[#c14a1f]"
                >
                  Detail
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
