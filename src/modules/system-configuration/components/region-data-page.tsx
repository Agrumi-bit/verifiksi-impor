"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Search } from "lucide-react";

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

type RegionOption = { id: number; name: string };

function useRegionOptions(url: string | null, queryKey: unknown[]) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(url as string);
      if (!response.ok) throw new Error("Gagal memuat data wilayah");
      const json = (await response.json()) as { data: RegionOption[] };
      return json.data;
    },
    enabled: Boolean(url),
  });
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
  isLoading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: RegionOption[];
  disabled?: boolean;
  placeholder: string;
  isLoading?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[#a68f80]">{label}</div>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 pr-8 text-[12.5px] text-[#20180f] outline-none disabled:bg-[#f7f2ec] disabled:text-[#a68f80]"
        >
          <option value="">{isLoading ? "Memuat..." : placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a68f80]" />
      </div>
    </div>
  );
}

/** Drill-down list for the Provinsi/Kota/Kecamatan levels — clicking a row selects it and drills one level deeper. */
function LevelListTable({
  columnLabel,
  countLabel,
  rows,
  isLoading,
  onSelectRow,
}: {
  columnLabel: string;
  countLabel: string;
  rows: RegionOption[];
  isLoading: boolean;
  onSelectRow: (option: RegionOption) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-semibold text-[#594138]">{countLabel}</p>
      {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat...</p>}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[#e0d5c8] bg-white p-10 text-center">
          <p className="text-[13px] font-semibold text-[#20180f]">Tidak ada data.</p>
        </div>
      )}
      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-[10px] border border-[#f0ded0] bg-white">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr style={{ background: "#e0662e" }}>
                <th className="border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white">{columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-t border-[#efe2d4] hover:bg-[#fdeadd]/40" onClick={() => onSelectRow(row)}>
                  <td className="px-3 py-2 font-semibold text-[#20180f]">{row.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RegionDataPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RegionRow | null | "new">(null);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdistrictId, setSubdistrictId] = useState("");

  const provincesQuery = useRegionOptions("/api/master-data/regions/provinces", ["regions", "provinces"]);
  const citiesQuery = useRegionOptions(
    provinceId ? `/api/master-data/regions/cities?provinceId=${provinceId}` : null,
    ["regions", "cities", provinceId],
  );
  const districtsQuery = useRegionOptions(
    cityId ? `/api/master-data/regions/districts?cityId=${cityId}` : null,
    ["regions", "districts", cityId],
  );
  const subdistrictsQuery = useRegionOptions(
    districtId ? `/api/master-data/regions/subdistricts?districtId=${districtId}&distinct=1` : null,
    ["regions", "subdistricts", "distinct", districtId],
  );

  const isSearching = Boolean(search.trim());
  // With no search text, browsing drills one region level at a time (Provinsi -> Kota/Kabupaten
  // -> Kecamatan) so picking "Jawa Barat" shows only its Kota/Kabupaten list, not every
  // Kecamatan/Desa underneath — the leaf table (Desa/Kelurahan + Kode Pos) only renders once a
  // Kecamatan is chosen. A search term always shows the flat leaf table instead, since search
  // legitimately cuts across levels.
  const atLeaf = isSearching || Boolean(districtId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-configuration", "regions", search, page, provinceId, cityId, districtId, subdistrictId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (provinceId) params.set("provinceId", provinceId);
      if (cityId) params.set("cityId", cityId);
      if (districtId) params.set("districtId", districtId);
      if (subdistrictId) params.set("subdistrictId", subdistrictId);
      const response = await fetch(`/api/system-configuration/regions?${params}`);
      if (!response.ok) throw new Error("Gagal memuat data wilayah");
      return (await response.json()) as RegionListResponse;
    },
    enabled: atLeaf,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleProvinceChange(value: string) {
    setProvinceId(value);
    setCityId("");
    setDistrictId("");
    setSubdistrictId("");
    setPage(1);
  }
  function handleCityChange(value: string) {
    setCityId(value);
    setDistrictId("");
    setSubdistrictId("");
    setPage(1);
  }
  function handleDistrictChange(value: string) {
    setDistrictId(value);
    setSubdistrictId("");
    setPage(1);
  }
  function handleSubdistrictChange(value: string) {
    setSubdistrictId(value);
    setPage(1);
  }

  const provinceName = provincesQuery.data?.find((o) => String(o.id) === provinceId)?.name;
  const cityName = citiesQuery.data?.find((o) => String(o.id) === cityId)?.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-extrabold text-[#2b2420]">Data Wilayah</div>
            <p className="mt-1 text-[12.5px] text-[#8a7565]">
              Database referensi Provinsi / Kota-Kabupaten / Kecamatan / Desa-Kelurahan beserta Kode Pos, sumber untuk
              pilihan lokasi pada form perusahaan dan aplikasi. Pilih Provinsi untuk melihat jumlah Kota/Kabupaten di
              dalamnya, lalu drill down ke Kecamatan dan Desa/Kelurahan.
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
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <FilterSelect
            label="Provinsi"
            value={provinceId}
            onChange={handleProvinceChange}
            options={provincesQuery.data ?? []}
            isLoading={provincesQuery.isLoading}
            placeholder="Semua Provinsi"
          />
          <FilterSelect
            label="Kota / Kabupaten"
            value={cityId}
            onChange={handleCityChange}
            options={citiesQuery.data ?? []}
            disabled={!provinceId}
            isLoading={citiesQuery.isLoading}
            placeholder={provinceId ? "Semua Kota/Kabupaten" : "Pilih Provinsi dahulu"}
          />
          <FilterSelect
            label="Kecamatan"
            value={districtId}
            onChange={handleDistrictChange}
            options={districtsQuery.data ?? []}
            disabled={!cityId}
            isLoading={districtsQuery.isLoading}
            placeholder={cityId ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu"}
          />
          <FilterSelect
            label="Desa / Kelurahan"
            value={subdistrictId}
            onChange={handleSubdistrictChange}
            options={subdistrictsQuery.data ?? []}
            disabled={!districtId}
            isLoading={subdistrictsQuery.isLoading}
            placeholder={districtId ? "Semua Desa/Kelurahan" : "Pilih Kecamatan dahulu"}
          />
        </div>
      </div>

      {!atLeaf && !provinceId && (
        <LevelListTable
          columnLabel="Provinsi"
          countLabel={`${(provincesQuery.data?.length ?? 0).toLocaleString("id-ID")} Provinsi`}
          rows={provincesQuery.data ?? []}
          isLoading={provincesQuery.isLoading}
          onSelectRow={(option) => handleProvinceChange(String(option.id))}
        />
      )}

      {!atLeaf && provinceId && !cityId && (
        <LevelListTable
          columnLabel="Kota / Kabupaten"
          countLabel={`${(citiesQuery.data?.length ?? 0).toLocaleString("id-ID")} Kota/Kabupaten di ${provinceName ?? "..."}`}
          rows={citiesQuery.data ?? []}
          isLoading={citiesQuery.isLoading}
          onSelectRow={(option) => handleCityChange(String(option.id))}
        />
      )}

      {!atLeaf && cityId && !districtId && (
        <LevelListTable
          columnLabel="Kecamatan"
          countLabel={`${(districtsQuery.data?.length ?? 0).toLocaleString("id-ID")} Kecamatan di ${cityName ?? "..."}`}
          rows={districtsQuery.data ?? []}
          isLoading={districtsQuery.isLoading}
          onSelectRow={(option) => handleDistrictChange(String(option.id))}
        />
      )}

      {atLeaf && isLoading && <p className="text-[13px] text-[#8a7565]">Memuat data wilayah...</p>}
      {atLeaf && isError && <p className="text-[13px] text-[#c1361f]">Gagal memuat data wilayah.</p>}

      {atLeaf && data && data.data.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[#e0d5c8] bg-white p-10 text-center">
          <p className="text-[13px] font-semibold text-[#20180f]">Tidak ada data yang cocok.</p>
        </div>
      )}

      {atLeaf && data && data.data.length > 0 && (
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

      {atLeaf && data && data.total > 0 && (
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
