"use client";

import { useState } from "react";
import Link from "next/link";

import { MaterialIcon } from "../material-icon";
import { DOC_VERIFICATION_STATUS_BADGE, DOC_VERIFICATION_STATUS_LABELS, type DocVerificationStatusValue } from "@/modules/verifikator-workspace/status";
import type { PmApplicationDetail } from "./types";

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const SUB_TABS = ["checklist", "report"] as const;
type SubTab = (typeof SUB_TABS)[number];
const SUB_TAB_LABELS: Record<SubTab, string> = { checklist: "Document Checklist", report: "Document Report" };

export function DocumentsTab({ data }: { data: PmApplicationDetail }) {
  const [sub, setSub] = useState<SubTab>("checklist");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const dokumen = data.assignments.dokumen;

  const checklist = data.documentChecklist;
  const kpis = [
    { key: "total", label: "Total Documents", value: checklist.length, icon: "description", color: "#20180f" },
    { key: "verified", label: "Verified", value: checklist.filter((d) => d.status === "VALID").length, icon: "verified", color: "#1a9850" },
    { key: "pending", label: "Pending", value: checklist.filter((d) => d.status === "PENDING").length, icon: "schedule", color: "#c98a1f" },
    { key: "rejected", label: "Rejected", value: checklist.filter((d) => d.status === "REJECTED").length, icon: "cancel", color: "#e15241" },
    {
      key: "notreq",
      label: "Not Applicable",
      value: checklist.filter((d) => d.status === "NOT_APPLICABLE").length,
      icon: "remove_circle_outline",
      color: "#8a7565",
    },
  ];

  const categories = [...new Set(checklist.map((d) => d.category))];
  const q = search.trim().toLowerCase();
  const filtered = checklist.filter(
    (d) =>
      (!q || d.label.toLowerCase().includes(q)) &&
      (!statusFilter || d.status === statusFilter) &&
      (!categoryFilter || d.category === categoryFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg bg-[#f7f2ec] p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSub(t)}
            className={`rounded-md px-3.5 py-1.75 text-[12.5px] font-bold ${sub === t ? "bg-white text-[#c14a1f]" : "text-[#8a7565]"}`}
          >
            {SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {sub === "checklist" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.key} className="flex items-start justify-between rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
                <div>
                  <div className="text-[10.5px] font-semibold" style={{ color: k.color }}>
                    {k.label}
                  </div>
                  <div className="mt-1 text-[20px] font-extrabold" style={{ color: k.color }}>
                    {k.value}
                  </div>
                </div>
                <MaterialIcon name={k.icon} className="text-[18px]" style={{ color: k.color }} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search document name..."
              className="min-w-55 flex-1 rounded-lg border border-[#e8d5c5] px-3 py-2 text-[12.5px] outline-none"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#e8d5c5] px-2.5 py-2 text-[12px] text-[#5c4a3d]">
              <option value="">Status</option>
              {(Object.keys(DOC_VERIFICATION_STATUS_LABELS) as DocVerificationStatusValue[]).map((s) => (
                <option key={s} value={s}>
                  {DOC_VERIFICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-[#e8d5c5] px-2.5 py-2 text-[12px] text-[#5c4a3d]">
              <option value="">Document Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {(search || statusFilter || categoryFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setCategoryFilter("");
                }}
                className="rounded-lg border border-[#e8d5c5] bg-white px-3 py-2 text-[12px] font-semibold text-[#8a7565]"
              >
                Reset
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-[#f0ded0] bg-white">
            <table className="w-full min-w-220 border-collapse text-[12px]">
              <thead>
                <tr style={{ background: "#e0662e" }}>
                  {["No", "Document Name", "Category", "Submitted", "Verification Status", "Verified By", "Verified Date", "Action"].map((h) => (
                    <th key={h} className="whitespace-nowrap border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-[#a68f80]">
                      Tidak ada dokumen yang cocok.
                    </td>
                  </tr>
                )}
                {filtered.map((d, i) => (
                  <tr key={d.key} className="border-t border-[#efe2d4]">
                    <td className="px-3 py-2 text-[#a68f80]">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-[#c14a1f]">{d.label}</td>
                    <td className="px-3 py-2 text-[#4a4038]">{d.category}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">
                      {d.hasDocument ? <span className="text-[#1a9850]">✓ {fmtDate(d.uploadedAt)}</span> : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${DOC_VERIFICATION_STATUS_BADGE[d.status as DocVerificationStatusValue] ?? DOC_VERIFICATION_STATUS_BADGE.PENDING}`}
                      >
                        {DOC_VERIFICATION_STATUS_LABELS[d.status as DocVerificationStatusValue] ?? d.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">
                      <div>{d.verifiedByName ?? "—"}</div>
                      {d.verifiedByRole && <div className="text-[10px] text-[#a68f80]">{d.verifiedByRole}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">{fmtDate(d.verifiedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {d.documentPath ? (
                        <a href={fileHref(d.documentPath)} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#eaf1fd] px-3 py-1 text-[11px] font-bold text-[#4a7ed6]">
                          View
                        </a>
                      ) : (
                        <span className="text-[#c7b6a6]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-[#f0ded0] px-3.5 py-2.5 text-[11.5px] text-[#a68f80]">
              Showing 1 to {filtered.length} of {checklist.length} documents
            </div>
          </div>
        </>
      )}

      {sub === "report" && (
        <div>
          {!dokumen && <p className="text-[13px] text-[#a68f80]">Belum ada penugasan verifikasi dokumen untuk permohonan ini.</p>}
          {dokumen && dokumen.status !== "COMPLETED" && (
            <p className="text-[13px] text-[#a68f80]">Verifikasi dokumen masih berlangsung — laporan tersedia setelah verifikator menyelesaikan review.</p>
          )}
          {dokumen && dokumen.status === "COMPLETED" && (
            <div className="max-w-70">
              <div className="flex aspect-[1/1.414] flex-col overflow-hidden rounded-lg border border-[#f0ded0] bg-white p-4 shadow-sm">
                <div className="text-center text-[10px] font-extrabold tracking-wide text-[#20180f]">LAPORAN VERIFIKASI DOKUMEN</div>
                <div className="mt-1 text-center text-[8px] text-[#a68f80]">{data.verificationType === "VKI" ? "Verifikasi Kemampuan Industri" : "Verifikasi Importir Umum"}</div>
                <div className="my-2.5 h-px bg-[#f0ded0]" />
                <div className="flex flex-1 flex-col gap-1.5">
                  {[90, 100, 75, 95, 88, 60, 92, 70].map((w, i) => (
                    <div key={i} className="h-1.5 rounded-sm bg-[#f1e9df]" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="mt-2 text-center text-[7px] text-[#c7b6a6]">{dokumen.assignmentNumber}</div>
              </div>
              <div className="mt-2.5 flex flex-col gap-1">
                <div className="text-[12.5px] font-bold text-[#20180f]">Laporan Verifikasi Dokumen</div>
                <div className="text-[11px] text-[#a68f80]">{fmtDate(dokumen.validatedAt)}</div>
                <Link
                  href={`/project-manager-workspace/assignments/${dokumen.assignmentNumber}/document-report`}
                  className="mt-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-[#f0ded0] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#2b2420]"
                >
                  <MaterialIcon name="description" className="text-[15px]" />
                  Lihat Laporan
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
