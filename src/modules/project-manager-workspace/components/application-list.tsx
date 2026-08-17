"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import type { PmApplicationRow } from "@/app/api/project-manager-workspace/applications/route";

const STATUS_BADGE: Record<string, string> = {
  Submitted: "bg-[#f2ecff] text-[#7a5fd6]",
  "In Progress": "bg-[#eaf1fd] text-[#4a7ed6]",
  "Revision Required": "bg-[#fdeceb] text-[#e15241]",
  Overdue: "bg-[#fdeceb] text-[#e15241]",
  Completed: "bg-[#e6f6ec] text-[#1a9850]",
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Props = { jenis: "VKI" | "VIU" };

export function ApplicationList({ jenis }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "applications", jenis],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications?type=${jenis}`);
      if (!response.ok) throw new Error("Gagal memuat daftar aplikasi");
      const json = (await response.json()) as { data: { rows: PmApplicationRow[]; kpis: Record<string, number> } };
      return json.data;
    },
  });

  if (isLoading) return <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>;
  if (isError || !data) return <p className="p-6 text-center text-[13px] text-[#c1361f]">Gagal memuat daftar aplikasi.</p>;

  const q = search.trim().toLowerCase();
  const rows = data.rows.filter(
    (r) =>
      (!q || (r.applicationNumber + r.company + r.nib).toLowerCase().includes(q)) &&
      (!statusFilter || r.status === statusFilter) &&
      (!stageFilter || r.stage === stageFilter),
  );

  const kpiCards = [
    { label: "Total Applications", value: data.kpis.total, color: "#20180f" },
    { label: "Submitted", value: data.kpis.submitted, color: "#7a5fd6" },
    { label: "In Progress", value: data.kpis.inProgress, color: "#4a7ed6" },
    { label: "Revision Required", value: data.kpis.revisionRequired, color: "#e15241" },
    { label: "Overdue", value: data.kpis.overdue, color: "#e15241" },
    { label: "Completed", value: data.kpis.completed, color: "#1a9850" },
  ];

  const statuses = [...new Set(data.rows.map((r) => r.status))];
  const stages = [...new Set(data.rows.map((r) => r.stage))];

  return (
    <div>
      <div className="mb-5.5">
        <div className="text-[22px] font-extrabold">Application List {jenis}</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Seluruh permohonan {jenis} beserta status persetujuan lintas unit.</div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[10px] border border-[#f0ded0] bg-white p-3">
            <div className="text-[19px] font-extrabold" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[#8a7565]">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#f0ded0] bg-white p-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nomor aplikasi, perusahaan, NIB..."
          className="min-w-55 flex-1 rounded-lg border border-[#e8d5c5] px-3 py-2 text-[12.5px] outline-none"
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#e8d5c5] px-2.5 py-2 text-[12px] text-[#5c4a3d]">
          <option value="">Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="rounded-lg border border-[#e8d5c5] px-2.5 py-2 text-[12px] text-[#5c4a3d]">
          <option value="">Current Stage</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(search || statusFilter || stageFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setStageFilter("");
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
              {["Application ID", "Company", "Stage", "Surveyor", "Verifikator", "Technical Analis", "SLA", "Submitted", "Status", ""].map((h) => (
                <th key={h} className="whitespace-nowrap border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-[#a68f80]">
                  Tidak ada aplikasi yang cocok.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.applicationNumber} className="border-t border-[#efe2d4]">
                <td className="whitespace-nowrap px-3 py-2.5 font-bold text-[#20180f]">{r.applicationNumber}</td>
                <td className="px-3 py-2.5 text-[#4a4038]">{r.company}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4038]">{r.stage}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4038]">{r.surveyor || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4038]">{r.verifikator || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4038]">{r.technicalAnalis || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold" style={{ color: r.slaColor }}>
                  {r.slaDetail}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4038]">{fmtDate(r.submitted)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${STATUS_BADGE[r.status] ?? "bg-[#f1efe9] text-[#5c4a3d]"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Link
                    href={`/project-manager-workspace/applications/${jenis}/${r.applicationNumber}`}
                    className="flex items-center gap-1 text-[11.5px] font-bold text-[#2f6fe0]"
                  >
                    <MaterialIcon name="visibility" className="text-[14px]" />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
