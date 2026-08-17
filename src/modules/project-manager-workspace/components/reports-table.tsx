"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";
import type { PmReportItem } from "@/app/api/project-manager-workspace/reports/route";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function ReportsTable({ jenis }: { jenis: "VKI" | "VIU" }) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "reports", jenis],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/reports?type=${jenis}`);
      if (!response.ok) throw new Error("Gagal memuat laporan");
      const json = (await response.json()) as { data: PmReportItem[] };
      return json.data;
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = (data ?? []).filter((r) => !q || r.companyName.toLowerCase().includes(q) || r.applicationNumber.toLowerCase().includes(q));

  return (
    <div>
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#20180f]">Report {jenis}</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Aplikasi {jenis} dengan minimal satu item yang telah disetujui Project Manager.</div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cari perusahaan atau nomor aplikasi..."
        className="mb-4 w-full max-w-sm rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2.5 text-[13px] outline-none"
      />

      {isLoading && <p className="p-6 text-center text-[13px] text-[#a68f80]">Memuat...</p>}
      {isError && <p className="p-6 text-center text-[13px] text-[#c1361f]">Gagal memuat laporan.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-8 text-center text-[13px] text-[#a68f80]">
          Belum ada laporan yang disetujui.
        </p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.applicationNumber} className="flex flex-col gap-1.5 rounded-xl border border-[#f0ded0] bg-white p-[18px]">
              <div className="text-[14px] font-bold text-[#20180f]">{r.companyName}</div>
              <div className="text-[11.5px] text-[#a68f80]">{r.applicationNumber}</div>
              <div className="text-[11.5px] text-[#8a7565]">{fmtDate(r.lastApprovedAt)} · {r.approvedCount} item disetujui</div>
              <Link
                href={`/project-manager-workspace/applications/${jenis}/${r.applicationNumber}`}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-[7px] border border-[#e1bfb3] bg-white px-3 py-2 text-[12px] font-semibold text-[#261813]"
              >
                <MaterialIcon name="visibility" className="text-[15px]" />
                Lihat Aplikasi
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
