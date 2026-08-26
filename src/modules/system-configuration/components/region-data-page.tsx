"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search } from "lucide-react";

import { RegionDataFormDrawer } from "./region-data-form-drawer";

type RegionRow = {
  id: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  postalCode: string;
};

type RegionListResponse = {
  data: RegionRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function RegionDataPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RegionRow | null | "new">(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-configuration", "regions", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/system-configuration/regions?${params}`);
      if (!response.ok) throw new Error("Gagal memuat data wilayah");
      return (await response.json()) as RegionListResponse;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-extrabold text-[#2b2420]">Data Wilayah</div>
            <p className="mt-1 text-[12.5px] text-[#8a7565]">
              Database referensi Provinsi / Kota-Kabupaten / Kecamatan / Desa-Kelurahan beserta Kode Pos, sumber untuk
              pilihan lokasi pada form perusahaan dan aplikasi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-3.5 py-2 text-[12.5px] font-bold text-white"
          >
            <Plus className="size-3.5" />
            Tambah Data
          </button>
        </div>
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a68f80]" />
          <input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Cari provinsi, kota, kecamatan, desa, atau kode pos..."
            className="w-full rounded-lg border border-[#e8dccd] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#261813] outline-none"
          />
        </div>
      </div>

      {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat data wilayah...</p>}
      {isError && <p className="text-[13px] text-[#c1361f]">Gagal memuat data wilayah.</p>}

      {data && data.data.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[#e0d5c8] bg-white p-10 text-center">
          <p className="text-[13px] font-semibold text-[#20180f]">Tidak ada data yang cocok.</p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto rounded-[10px] border border-[#f0ded0] bg-white">
          <table className="w-full min-w-200 border-collapse text-[12px]">
            <thead>
              <tr style={{ background: "#e0662e" }}>
                {["Provinsi", "Kota / Kabupaten", "Kecamatan", "Desa / Kelurahan", "Kode Pos", "Aksi"].map((h) => (
                  <th key={h} className="whitespace-nowrap border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((row) => (
                <tr key={row.id} className="border-t border-[#efe2d4]">
                  <td className="px-3 py-2 text-[#4a4038]">{row.provinceName}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{row.cityName}</td>
                  <td className="px-3 py-2 text-[#4a4038]">{row.districtName}</td>
                  <td className="px-3 py-2 font-semibold text-[#20180f]">{row.subdistrictName}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[#4a4038]">{row.postalCode}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button type="button" onClick={() => setEditing(row)} aria-label="Edit" className="text-[#2f6fe0]">
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white px-4 py-2.5">
          <span className="text-[12px] text-[#8a7565]">
            {data.total.toLocaleString("id-ID")} data — halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#261813] disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border border-[#e1bfb3] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#261813] disabled:opacity-40"
            >
              Berikutnya
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {editing !== null && <RegionDataFormDrawer row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
