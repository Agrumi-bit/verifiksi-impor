"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Hourglass, Inbox, type LucideIcon } from "lucide-react";

type QueueApplication = {
  id: string;
  applicationNumber: string;
  company: string;
  jenis: string;
  submitted: string;
  docsLengkap: number;
  docsTotal: number;
  complete: boolean;
  status: "Menunggu Review" | "Dokumen Kurang" | "Siap Ditugaskan" | "Ditugaskan";
};

const JENIS_BADGE: Record<string, { bg: string; color: string }> = {
  VKI: { bg: "#f1e6fd", color: "#7a3fc1" },
  VIU: { bg: "#fdeadd", color: "#c14a1f" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  "Menunggu Review": { bg: "#fdf0d5", color: "#a3690a" },
  "Dokumen Kurang": { bg: "#fbe4de", color: "#c1361f" },
  "Siap Ditugaskan": { bg: "#e5f6ec", color: "#1f8a4c" },
  Ditugaskan: { bg: "#e6effa", color: "#2a5fa3" },
};

const QUEUE_STATUS_OPTIONS = ["Semua Status", "Menunggu Review", "Dokumen Kurang", "Siap Ditugaskan", "Ditugaskan"];

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function QueueView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-relation-workspace", "applications"],
    queryFn: async () => {
      const response = await fetch("/api/customer-relation-workspace/applications");
      if (!response.ok) throw new Error("Gagal memuat data permohonan");
      const json = (await response.json()) as { data: QueueApplication[] };
      return json.data;
    },
  });

  const applications = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const countByStatus = (s: string) => applications.filter((a) => a.status === s).length;
    return [
      { label: "TOTAL MASUK", value: applications.length, icon: Inbox, color: "#e0662e", bg: "#fdeadd", status: "Semua Status" },
      { label: "MENUNGGU REVIEW", value: countByStatus("Menunggu Review"), icon: Hourglass, color: "#a3690a", bg: "#fdf0d5", status: "Menunggu Review" },
      { label: "DOKUMEN KURANG", value: countByStatus("Dokumen Kurang"), icon: AlertTriangle, color: "#c1361f", bg: "#fbe4de", status: "Dokumen Kurang" },
      { label: "SIAP DITUGASKAN", value: countByStatus("Siap Ditugaskan") + countByStatus("Ditugaskan"), icon: ClipboardCheck, color: "#1f8a4c", bg: "#e5f6ec", status: "Siap Ditugaskan" },
    ] satisfies { label: string; value: number; icon: LucideIcon; color: string; bg: string; status: string }[];
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (q && !a.company.toLowerCase().includes(q) && !a.applicationNumber.toLowerCase().includes(q)) return false;
      if (statusFilter !== "Semua Status" && a.status !== statusFilter) return false;
      return true;
    });
  }, [applications, search, statusFilter]);

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Incoming Applications</div>
        <p className="mt-1 max-w-150 text-[13px] text-[#8a7565]">
          Periksa kelengkapan dokumen aplikasi yang masuk, minta dokumen tambahan bila diperlukan, dan tugaskan
          Surveyor, Verifikator, serta Technical Reviewer.
        </p>
      </div>

      <div className="mb-4.5 grid grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => setStatusFilter(stat.status)}
            className="flex items-center justify-between rounded-[10px] border-[1.5px] bg-white p-3.5 text-left"
            style={{ borderColor: statusFilter === stat.status ? stat.color : "#f0ded0" }}
          >
            <div>
              <div className="text-[24px] font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold tracking-[0.02em] text-[#a68f80]">{stat.label}</div>
            </div>
            <div className="flex size-8.5 items-center justify-center rounded-lg" style={{ background: stat.bg }}>
              <stat.icon className="size-4.5" style={{ color: stat.color }} />
            </div>
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3.5 rounded-[10px] border border-[#f0ded0] bg-white px-3.5 py-2.5">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama perusahaan atau ID aplikasi..."
            className="w-full border-none bg-transparent text-[13px] text-[#20180f] outline-none placeholder:text-[#a68f80]"
          />
        </div>
        <div className="relative border-l border-[#f0ded0] pl-3.5">
          <button
            type="button"
            onClick={() => setShowStatusMenu((v) => !v)}
            className="whitespace-nowrap text-[12.5px] font-medium text-[#4a4038]"
          >
            {statusFilter}
          </button>
          {showStatusMenu && (
            <div className="absolute right-0 top-full z-10 mt-1.5 min-w-42.5 overflow-hidden rounded-lg border border-[#f0ded0] bg-white shadow-lg">
              {QUEUE_STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatusFilter(option);
                    setShowStatusMenu(false);
                  }}
                  className="block w-full px-3.5 py-2.25 text-left text-[12.5px] text-[#261813] hover:bg-[#fbeee5]"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>}
        {isError && <p className="p-6 text-center text-[13px] text-[#ba1a1a]">Gagal memuat data permohonan.</p>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-[10px] border border-[#f0ded0] bg-white p-10 text-center text-[13px] text-[#a68f80]">
            Tidak ada aplikasi yang cocok dengan filter ini.
          </div>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold">{a.company}</span>
                <span
                  className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold"
                  style={{ background: JENIS_BADGE[a.jenis]?.bg ?? "#f2ece5", color: JENIS_BADGE[a.jenis]?.color ?? "#6b5b4c" }}
                >
                  {a.jenis}
                </span>
                <span
                  className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold"
                  style={{ background: STATUS_BADGE[a.status].bg, color: STATUS_BADGE[a.status].color }}
                >
                  {a.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/customer-relation-workspace/applications/${a.id}`)}
                className="rounded-lg bg-[#e0662e] px-4 py-2 text-[12.5px] font-semibold text-white"
              >
                Review
              </button>
            </div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-2 text-[12.5px] text-[#4a4038]">
              <div>
                <span className="text-[#a68f80]">ID Aplikasi</span>
                <br />
                <span className="font-semibold">{a.applicationNumber}</span>
              </div>
              <div>
                <span className="text-[#a68f80]">Diajukan</span>
                <br />
                <span className="font-semibold">{fmtDate(a.submitted)}</span>
              </div>
              <div>
                <span className="text-[#a68f80]">Kelengkapan Dokumen</span>
                <br />
                <span className="font-semibold" style={{ color: a.complete ? "#1f8a4c" : "#c14a1f" }}>
                  {a.docsLengkap}/{a.docsTotal} Dokumen Lengkap
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
