"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "./material-icon";

type CompanyDocumentSummary = {
  id: string;
  companyName: string;
  pendingCount: number;
};

function CompanyCard({ company }: { company: CompanyDocumentSummary }) {
  return (
    <Link
      href={`/verifikator-workspace/document-verification/${company.id}`}
      className="flex flex-col gap-2.5 rounded-xl border border-[#f0ded0] bg-white p-[18px] hover:border-[#e0662e]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[14px] font-bold text-[#2b2420]">{company.companyName}</div>
        {company.pendingCount > 0 ? (
          <span className="shrink-0 rounded-full bg-[#fbe4de] px-2.5 py-1 text-[11px] font-bold text-[#c1361f]">
            {company.pendingCount} Belum Diverifikasi
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#e2f7ea] px-2.5 py-1 text-[11px] font-bold text-[#1a9850]">
            Semua Terverifikasi
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9531f]">
        <MaterialIcon name="visibility" className="text-[15px]" />
        Lihat Dokumen
      </div>
    </Link>
  );
}

export function DocumentVerificationList() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifikator-workspace", "company-documents"],
    queryFn: async () => {
      const response = await fetch("/api/verifikator-workspace/company-documents");
      if (!response.ok) throw new Error("Gagal memuat daftar perusahaan");
      const json = (await response.json()) as { data: CompanyDocumentSummary[] };
      return json.data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((company) => !q || company.companyName.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="p-7">
      <div className="mb-5">
        <div className="text-[22px] font-extrabold text-[#2b2420]">Verifikasi Dokumen</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">Tinjau dan verifikasi dokumen legalitas dan pajak setiap perusahaan.</div>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama perusahaan..."
          className="w-full max-w-sm rounded-lg border-none bg-[#f2f0ee] px-3.5 py-2.5 text-[13px] text-[#261813] outline-none"
        />
      </div>

      {isLoading && <p className="p-6 text-center text-[#a68f80]">Memuat...</p>}
      {isError && <p className="p-6 text-center text-[#c1361f]">Gagal memuat daftar perusahaan.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-[10px] border border-[#f0ded0] bg-white p-6 text-center text-[#a68f80]">
          Belum ada perusahaan terdaftar.
        </p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}
