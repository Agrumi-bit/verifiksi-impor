"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ExternalLink, FileText, MapPinned, X } from "lucide-react";

type ReportEntry = {
  id: string;
  type: "survey" | "dokumen";
  title: string;
  applicationNumber: string;
  verificationType: string;
  meta: string;
  date: string | null;
  href: string;
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const TYPE_STYLE: Record<ReportEntry["type"], { band: string; icon: typeof FileText; label: string }> = {
  survey: { band: "#e0662e", icon: MapPinned, label: "Survey" },
  dokumen: { band: "#20304a", icon: ClipboardCheck, label: "Dokumen" },
};

function ReportCover({ report, onOpen }: { report: ReportEntry; onOpen: () => void }) {
  const style = TYPE_STYLE[report.type];
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-[10px] border border-[#efe2d4] bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[210/297] w-full overflow-hidden" style={{ background: "#fbf7f4" }}>
        <div className="flex h-[30%] items-center justify-center" style={{ background: style.band }}>
          <Icon className="size-9 text-white/90" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: style.band }}>
            {style.label} · {report.verificationType}
          </div>
          <div className="text-[13px] font-extrabold leading-snug text-[#20180f]">{report.title}</div>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="h-[3px] w-[75%] rounded-sm bg-[#e8d5c5]" />
            <div className="h-[3px] w-[55%] rounded-sm bg-[#e8d5c5]" />
            <div className="h-[3px] w-[65%] rounded-sm bg-[#e8d5c5]" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/90 px-4 py-2 text-[10.5px] text-[#8a7565] backdrop-blur">
          <span className="truncate">{report.meta}</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#f3e9dd] px-4 py-2.5">
        <span className="text-[11.5px] text-[#8a7565]">{fmtDate(report.date)}</span>
        <span className="text-[11.5px] font-bold text-[#e0662e] opacity-0 transition-opacity group-hover:opacity-100">Lihat →</span>
      </div>
    </button>
  );
}

function ReportViewerModal({ report, onClose }: { report: ReportEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,12,8,.6)] p-6" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0ded0] px-5 py-3.5">
          <div>
            <div className="text-[14px] font-bold text-[#20180f]">{report.title}</div>
            <div className="text-[12px] text-[#8a7565]">{report.meta}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={report.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.75 text-[12px] font-semibold text-[#261813]"
            >
              <ExternalLink className="size-3.5" />
              Buka di Tab Baru
            </Link>
            <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <iframe src={report.href} title={report.title} className="flex-1 border-0" />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<ReportEntry | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "reports"],
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/reports");
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: ReportEntry[] };
      return json.data;
    },
  });

  const reports = data ?? [];
  const filtered = reports.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.applicationNumber.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-7">
      <div>
        <div className="text-[23px] font-bold tracking-tight text-[#20180f]">Reports</div>
        <p className="mt-1 text-[13.5px] text-[#8a7565]">
          Laporan hasil survey dari surveyor dan laporan verifikasi dokumen dari verifikator, tersinkron otomatis begitu selesai.
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari laporan…"
        className="w-full max-w-sm rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.5 text-[13px] text-[#261813] outline-none"
      />

      {isLoading && <p className="p-10 text-center text-[13px] text-[#a68f80]">Memuat...</p>}
      {isError && <p className="p-10 text-center text-[13px] text-[#c1361f]">Gagal memuat laporan.</p>}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-[10px] border border-[#efe2d4] bg-white p-10 text-center text-[12.5px] text-[#a68f80]">
          {reports.length === 0
            ? "Belum ada laporan yang tersedia. Laporan akan muncul di sini begitu survey atau verifikasi dokumen selesai."
            : "Tidak ada laporan yang cocok dengan pencarian."}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((report) => (
            <ReportCover key={report.id} report={report} onOpen={() => setViewing(report)} />
          ))}
        </div>
      )}

      {viewing && <ReportViewerModal report={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
