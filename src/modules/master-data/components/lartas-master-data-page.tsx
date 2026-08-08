"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MasterDataFormDialog } from "./master-data-form-dialog";
import type { MasterDataRow } from "../types";

type HsCodeOption = { id: string; hsCode: string; description: string };

type LartasRow = MasterDataRow & {
  hsCode: {
    hsCode: string;
    description: string;
    commoditySubGroup?: { name: string } | null;
  };
  apiP: boolean;
  apiUIndustri: boolean;
  apiUNonIndustri: boolean;
  barangKonsumsi: boolean;
  ppbb: boolean;
};

const th = "border border-[#c14a1f] px-2.5 py-2 text-[11px] font-bold text-white";
const td = "border border-[#f0ded0] px-2.5 py-2.5";

function Mark({ on }: { on: boolean }) {
  return <td className={`${td} text-center font-bold text-[#1a7a4c]`}>{on ? "✓" : ""}</td>;
}

export function LartasMasterDataPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterDataRow | null>(null);

  const { data: hsCodes } = useQuery({
    queryKey: ["master-data-hs-code", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/hs-code");
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: HsCodeOption[] };
      return json.data;
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["master-data-lartas"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/lartas");
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: LartasRow[] };
      return json.data;
    },
  });

  const rows = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.hsCode.hsCode.toLowerCase().includes(q) || r.hsCode.description.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      apiP: rows.filter((r) => r.apiP).length,
      apiU: rows.filter((r) => r.apiUIndustri || r.apiUNonIndustri || r.barangKonsumsi).length,
      ppbb: rows.filter((r) => r.ppbb).length,
    }),
    [rows],
  );

  async function handleSubmit(values: Record<string, string>) {
    const isEdit = Boolean(editingRow);
    const url = isEdit ? `/api/master-data/lartas/${editingRow!.id}` : "/api/master-data/lartas";
    const response = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan data");
      throw new Error("submit-failed");
    }
    toast.success(isEdit ? "Data berhasil diperbarui." : "Data berhasil ditambahkan.");
    queryClient.invalidateQueries({ queryKey: ["master-data-lartas"] });
  }

  async function toggleStatus(row: LartasRow) {
    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(`/api/master-data/lartas/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(nextStatus === "INACTIVE" ? "Relasi dinonaktifkan." : "Relasi diaktifkan kembali.");
    queryClient.invalidateQueries({ queryKey: ["master-data-lartas"] });
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[22px] font-extrabold text-[#2b2420]">Lartas Impor</div>
          <p className="mt-1 max-w-[560px] text-[13px] text-[#8a7565]">
            Kelola relasi HS Code dengan jenis Angka Pengenal Impor (API-P/API-U) beserta ketentuan
            larangan/pembatasan impor yang berlaku.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRow(null);
            setIsDialogOpen(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          + Tambah Relasi
        </button>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {[
          { label: "TOTAL RELASI", value: stats.total, color: "#594138", iconBg: "#f5ebe1", icon: "list_alt" },
          { label: "API-P", value: stats.apiP, color: "#1a7a4c", iconBg: "#e2f7ea", icon: "task_alt" },
          { label: "API-U", value: stats.apiU, color: "#c14a1f", iconBg: "#fdeadd", icon: "business_center" },
          { label: "PPBB", value: stats.ppbb, color: "#a15a1a", iconBg: "#f5ebe1", icon: "block" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-white p-3.5"
          >
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-[#a68f80]">{stat.label}</div>
              <div className="mt-0.5 text-2xl font-extrabold" style={{ color: stat.color }}>
                {String(stat.value).padStart(2, "0")}
              </div>
              <div className="mt-0.5 text-[11px] text-[#a68f80]">Jumlah HS Code</div>
            </div>
            <div
              className="flex size-[38px] items-center justify-center rounded-lg text-[19px]"
              style={{ background: stat.iconBg, color: stat.color }}
            >
              ●
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nomor pos tarif/HS atau uraian barang..."
          className="w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none"
        />
      </div>

      <div className="mb-3.5 text-[13px] text-[#8a7565]">{filtered.length} pos tarif ditemukan</div>

      {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat...</p>}
      {isError && <p className="text-[13px] text-[#ba1a1a]">Gagal memuat data.</p>}

      {!isLoading && !isError && (
        <div className="overflow-auto rounded-[10px] border border-[#f0ded0] bg-white">
          <table className="w-full min-w-[980px] border-collapse text-[12px]">
            <thead>
              <tr style={{ background: "#e0662e" }}>
                <th rowSpan={3} className={th}>NO</th>
                <th rowSpan={3} className={th}>POS TARIF/HS</th>
                <th rowSpan={3} className={`${th} min-w-[220px]`}>URAIAN BARANG</th>
                <th rowSpan={3} className={th}>SUB KELOMPOK KOMODITAS</th>
                <th colSpan={5} className={th}>PELAKU USAHA SEBAGAI PEMOHON</th>
                <th rowSpan={3} className={th}>STATUS</th>
              </tr>
              <tr style={{ background: "#e0662e" }}>
                <th rowSpan={2} className={th}>
                  API-P
                  <br />
                  Bahan Baku dan/atau Bahan Penolong
                </th>
                <th colSpan={3} className={th}>
                  API-U
                  <br />
                  Bahan Baku dan/atau Bahan Penolong
                </th>
                <th rowSpan={2} className={th}>PPBB</th>
              </tr>
              <tr style={{ background: "#e0662e" }}>
                <th className={th}>Perusahaan Industri</th>
                <th className={th}>Perusahaan Non Industri</th>
                <th className={th}>Barang Konsumsi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[13px] text-[#8a7565]">
                    {rows.length === 0 ? "Belum ada data." : "Tidak ada data yang cocok dengan pencarian."}
                  </td>
                </tr>
              )}
              {filtered.map((row, index) => {
                const isActive = row.status === "ACTIVE";
                return (
                  <tr key={row.id}>
                    <td className={`${td} text-center text-[#4a4038]`}>{index + 1}</td>
                    <td className={`${td} font-bold text-[#261813]`}>{row.hsCode.hsCode}</td>
                    <td className={`${td} text-[#4a4038]`}>{row.hsCode.description}</td>
                    <td className={`${td} text-[#4a4038]`}>{row.hsCode.commoditySubGroup?.name ?? "—"}</td>
                    <Mark on={row.apiP} />
                    <Mark on={row.apiUIndustri} />
                    <Mark on={row.apiUNonIndustri} />
                    <Mark on={row.barangKonsumsi} />
                    <Mark on={row.ppbb} />
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(row)}
                          className="relative h-5 w-9 shrink-0 rounded-full"
                          style={{ background: isActive ? "#1a7a4c" : "#d8c9bd" }}
                          aria-label={isActive ? "Nonaktifkan" : "Aktifkan"}
                        >
                          <span
                            className="absolute top-0.5 size-4 rounded-full bg-white transition-all"
                            style={{ left: isActive ? "18px" : "2px" }}
                          />
                        </button>
                        <span className="text-[11px] font-bold" style={{ color: isActive ? "#1a7a4c" : "#8a7565" }}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRow(row);
                            setIsDialogOpen(true);
                          }}
                          className="ml-1 rounded-md border border-[#e1bfb3] bg-white px-2 py-1 text-[11px] font-semibold text-[#261813]"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <MasterDataFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingRow ? "Edit Relasi Lartas Impor" : "Tambah Relasi Lartas Impor"}
        fields={[
          {
            key: "hsCodeId",
            label: "HS Code",
            type: "searchselect",
            required: true,
            placeholder: "Cari kode atau uraian HS Code...",
            options: hsCodes?.map((h) => ({ value: h.id, label: `${h.hsCode} — ${h.description}` })) ?? [],
          },
          { key: "apiP", label: "", type: "checkbox", placeholder: "API-P — Bahan Baku dan/atau Bahan Penolong" },
          {
            key: "apiUIndustri",
            label: "",
            type: "checkbox",
            placeholder: "API-U — Bahan Baku/Penolong, Perusahaan Industri",
          },
          {
            key: "apiUNonIndustri",
            label: "",
            type: "checkbox",
            placeholder: "API-U — Bahan Baku/Penolong, Perusahaan Non Industri",
          },
          { key: "barangKonsumsi", label: "", type: "checkbox", placeholder: "API-U — Barang Konsumsi" },
          { key: "ppbb", label: "", type: "checkbox", placeholder: "PPBB" },
        ]}
        initialValues={editingRow}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
