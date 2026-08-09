"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { MasterDataPage } from "./master-data-page";
import { downloadHsCodeExcelTemplate, parseHsCodeExcelFile } from "../hs-code-excel";

type NamedOption = { id: string; name: string };

function useOptions(path: string, key: string) {
  return useQuery({
    queryKey: [key, "options"],
    queryFn: async () => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: NamedOption[] };
      return json.data;
    },
  });
}

export function HsCodeMasterDataPage() {
  const queryClient = useQueryClient();
  const { data: groups } = useOptions(
    "/api/master-data/commodity-group",
    "master-data-commodity-group",
  );
  const { data: subGroups } = useOptions(
    "/api/master-data/commodity-sub-group",
    "master-data-commodity-sub-group",
  );
  const { data: units } = useQuery({
    queryKey: ["master-data-uom", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/unit-of-measurement");
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as {
        data: { id: string; name: string; symbol: string }[];
      };
      return json.data;
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { rows, skippedRows, unmatchedReferenceRows } = await parseHsCodeExcelFile(
        file,
        groups ?? [],
        subGroups ?? [],
        units ?? [],
      );
      if (rows.length === 0) {
        toast.error(
          unmatchedReferenceRows.length > 0
            ? `Tidak ada baris valid. ${unmatchedReferenceRows.length} baris punya Kelompok/Sub Kelompok/Satuan yang tidak dikenali.`
            : "Tidak ada baris valid ditemukan. Pastikan kolom \"Pos Tarif / HS Code\" dan \"Uraian Barang\" terisi.",
        );
        return;
      }

      const response = await fetch("/api/master-data/hs-code/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal mengimpor data");
        return;
      }
      const { data } = (await response.json()) as { data: { created: number; duplicates: string[] } };

      queryClient.invalidateQueries({ queryKey: ["master-data-hs-code"] });

      const notes: string[] = [];
      if (data.duplicates.length > 0) notes.push(`${data.duplicates.length} duplikat dilewati (${data.duplicates.slice(0, 5).join(", ")}${data.duplicates.length > 5 ? ", ..." : ""})`);
      if (skippedRows > 0) notes.push(`${skippedRows} baris kosong dilewati`);
      if (unmatchedReferenceRows.length > 0) notes.push(`${unmatchedReferenceRows.length} baris Kelompok/Sub Kelompok/Satuan tidak dikenali dilewati`);

      if (data.created > 0) {
        toast.success(`${data.created} HS Code berhasil diimpor.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      } else {
        toast.error(`Tidak ada HS Code baru — semua baris duplikat.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      }
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <MasterDataPage
      title="HS Code Master Data"
      description="Database referensi HS Code untuk sektor Tekstil dan Produk Tekstil (TPT) sesuai Lampiran I Permenperin No. 27 Tahun 2025."
      apiPath="/api/master-data/hs-code"
      queryKey="master-data-hs-code"
      headerActions={
        <>
          <button
            type="button"
            onClick={downloadHsCodeExcelTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#261813]"
          >
            <Download className="size-3.5" />
            Unduh Template Excel
          </button>
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-60"
          >
            <Upload className="size-3.5" />
            {isImporting ? "Mengimpor..." : "Impor dari Excel"}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
        </>
      }
      columns={[
        { key: "hsCode", label: "Pos Tarif / HS Code" },
        { key: "description", label: "Uraian Barang" },
        {
          key: "commodityGroup",
          label: "Kelompok Komoditas",
          render: (row) =>
            (row.commodityGroup as NamedOption | undefined)?.name ?? "—",
        },
        {
          key: "commoditySubGroup",
          label: "Sub Kelompok Komoditas",
          render: (row) =>
            (row.commoditySubGroup as NamedOption | undefined)?.name ?? "—",
        },
        {
          key: "unitOfMeasurement",
          label: "Satuan",
          render: (row) =>
            (row.unitOfMeasurement as NamedOption | undefined)?.name ?? "—",
        },
      ]}
      fields={[
        {
          key: "hsCode",
          label: "Pos Tarif / HS Code",
          type: "text",
          required: true,
          placeholder: "e.g. 5205.31.00",
        },
        {
          key: "description",
          label: "Uraian Barang",
          type: "text",
          required: true,
          placeholder: "e.g. Benang katun, tunggal, dari serat tidak disikat",
        },
        {
          key: "commodityGroupId",
          label: "Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok komoditas...",
          options: groups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        {
          key: "commoditySubGroupId",
          label: "Sub Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih sub kelompok komoditas...",
          options:
            subGroups?.map((subGroup) => ({
              value: subGroup.id,
              label: subGroup.name,
            })) ?? [],
        },
        {
          key: "unitOfMeasurementId",
          label: "Satuan",
          type: "select",
          required: true,
          placeholder: "Pilih satuan...",
          options: units?.map((unit) => ({ value: unit.id, label: unit.name })) ?? [],
        },
      ]}
      addButtonLabel="Tambah HS Code"
    />
  );
}
