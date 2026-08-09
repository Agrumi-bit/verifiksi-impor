"use client";

import { useState, type ComponentType } from "react";
import { Download, Eye, FileText, Grid2x2, List } from "lucide-react";

export type LibraryVerificationStatus = "NOT_YET_VERIFIED" | "VERIFIED" | "NEED_REVISION" | "REJECTED" | "NOT_APPLICABLE" | "EXPIRED";

const VERIF_STYLE: Record<LibraryVerificationStatus, { label: string; bg: string; color: string }> = {
  NOT_YET_VERIFIED: { label: "Belum Diverifikasi", bg: "#f2ece5", color: "#8a7565" },
  VERIFIED: { label: "Terverifikasi", bg: "#e2f7ea", color: "#1a7a4c" },
  NEED_REVISION: { label: "Perlu Revisi", bg: "#fdedd6", color: "#b3650c" },
  REJECTED: { label: "Ditolak", bg: "#fbe4de", color: "#c1361f" },
  NOT_APPLICABLE: { label: "N/A", bg: "#ede9fe", color: "#6d28d9" },
  EXPIRED: { label: "Kadaluarsa", bg: "#faf1de", color: "#a6791f" },
};

export type LibraryItem = {
  key: string;
  jenis: string;
  name: string;
  uploadedAt: string | null;
  version: number;
  verification: LibraryVerificationStatus;
  path: string | null;
  icon?: ComponentType<{ className?: string }>;
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fileHref(path: string | null): string | null {
  return path ? `/api/files?path=${encodeURIComponent(path)}` : null;
}

type Props = {
  title: string;
  description: string;
  items: LibraryItem[];
  emptyMessage: string;
};

export function LibraryView({ title, description, items, emptyMessage }: Props) {
  const [mode, setMode] = useState<"list" | "card">("list");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-7">
      <div>
        <div className="text-[23px] font-bold tracking-tight text-[#20180f]">{title}</div>
        <p className="mt-1 text-[13.5px] text-[#8a7565]">{description}</p>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex rounded-lg bg-[#f2ece5] p-0.75">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="flex items-center rounded-md p-1.75"
            style={{ background: mode === "list" ? "#fff" : "transparent" }}
            aria-label="Tampilan daftar"
          >
            <List className="size-4.5 text-[#594138]" />
          </button>
          <button
            type="button"
            onClick={() => setMode("card")}
            className="flex items-center rounded-md p-1.75"
            style={{ background: mode === "card" ? "#fff" : "transparent" }}
            aria-label="Tampilan kartu"
          >
            <Grid2x2 className="size-4.5 text-[#594138]" />
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="rounded-[10px] border border-[#efe2d4] bg-white p-10 text-center text-[12.5px] text-[#a68f80]">{emptyMessage}</p>
      )}

      {items.length > 0 && mode === "list" && (
        <div className="overflow-hidden rounded-[10px] border border-[#efe2d4] bg-white">
          <div className="grid grid-cols-[1.8fr_0.9fr_0.6fr_1fr_0.7fr] gap-3 bg-[#fdf9f5] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#9c8a79]">
            <div>Nama File</div>
            <div>Tanggal Unggah</div>
            <div>Versi</div>
            <div>Verifikasi</div>
            <div />
          </div>
          {items.map((item) => {
            const style = VERIF_STYLE[item.verification];
            const Icon = item.icon ?? FileText;
            const href = fileHref(item.path);
            return (
              <div key={item.key} className="grid grid-cols-[1.8fr_0.9fr_0.6fr_1fr_0.7fr] items-center gap-3 border-t border-[#f3e9dd] px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg bg-[#fdeadd]">
                    <Icon className="size-4.5 text-[#e0662e]" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[#20180f]">{item.name}</div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#c1361f]">{item.jenis}</div>
                  </div>
                </div>
                <div className="text-[12.5px] text-[#594138]">{fmtDate(item.uploadedAt)}</div>
                <div className="text-[12px] font-bold text-[#2f6fd6]">v{item.version}</div>
                <div>
                  <span className="whitespace-nowrap rounded-full px-2.25 py-0.75 text-[10.5px] font-bold" style={{ background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  {href ? (
                    <>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.25 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#261813]">
                        <Eye className="size-3.5" />
                        View
                      </a>
                      <a href={href} download className="text-[#8a7565]" aria-label="Download">
                        <Download className="size-4" />
                      </a>
                    </>
                  ) : (
                    <span className="text-[11px] text-[#a68f80]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && mode === "card" && (
        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => {
            const style = VERIF_STYLE[item.verification];
            const Icon = item.icon ?? FileText;
            const href = fileHref(item.path);
            return (
              <div key={item.key} className="overflow-hidden rounded-xl border border-[#efe2d4] bg-white">
                <div className="flex justify-center border-b border-[#f0ded0] bg-[#faf1e8] p-5">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Icon className="size-5.5 text-[#e0662e]" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#e0662e]">{item.jenis}</div>
                    <span className="shrink-0 text-[10px] font-bold text-[#2f6fd6]">v{item.version}</span>
                  </div>
                  <div className="truncate text-[13px] font-semibold text-[#20180f]">{item.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-[#9c8a79]">{fmtDate(item.uploadedAt)}</div>
                  <div className="mt-2.5 mb-2.5">
                    <span className="rounded-full px-2.25 py-0.75 text-[10px] font-bold" style={{ background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#e0662e] py-2 text-[12px] font-bold text-white"
                    >
                      <Eye className="size-3.5" />
                      View
                    </a>
                  ) : (
                    <div className="rounded-lg bg-[#f2ece5] py-2 text-center text-[11.5px] text-[#a68f80]">Belum ada file</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
