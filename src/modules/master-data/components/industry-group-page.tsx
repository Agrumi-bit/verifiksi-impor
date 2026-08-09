"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { MasterDataPage } from "./master-data-page";
import { downloadCommodityHierarchyExcelTemplate, parseCommodityHierarchyExcelFile } from "../commodity-hierarchy-excel";

export function IndustryGroupPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { rows, skippedRows } = await parseCommodityHierarchyExcelFile(file);
      if (rows.length === 0) {
        toast.error("Tidak ada baris valid ditemukan. Pastikan kolom \"Kelompok Industri\" terisi.");
        return;
      }

      const response = await fetch("/api/master-data/commodity-hierarchy/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal mengimpor data");
        return;
      }
      const { data } = (await response.json()) as {
        data: { industryGroupsCreated: number; commodityGroupsCreated: number; subGroupsCreated: number; skipped: { row: number; reason: string }[] };
      };

      queryClient.invalidateQueries({ queryKey: ["master-data-industry-group"] });
      queryClient.invalidateQueries({ queryKey: ["master-data-commodity-group"] });
      queryClient.invalidateQueries({ queryKey: ["master-data-commodity-sub-group"] });

      const total = data.industryGroupsCreated + data.commodityGroupsCreated + data.subGroupsCreated;
      const notes: string[] = [];
      if (skippedRows > 0) notes.push(`${skippedRows} baris kosong dilewati`);
      if (data.skipped.length > 0) notes.push(`${data.skipped.length} baris gagal (butuh kode untuk data baru)`);

      if (total > 0) {
        toast.success(
          `Berhasil impor: ${data.industryGroupsCreated} Kelompok Industri, ${data.commodityGroupsCreated} Commodity Group, ${data.subGroupsCreated} Commodity Sub Group.` +
            (notes.length > 0 ? " " + notes.join("; ") + "." : ""),
        );
      } else {
        toast.error(`Tidak ada data baru — semua sudah terdaftar.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      }
      if (data.skipped.length > 0) {
        console.warn("Baris gagal diimpor:", data.skipped);
      }
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <MasterDataPage
      title="Kelompok Industri"
      description="Level tertinggi hierarki komoditas: Kelompok Industri > Commodity Group > Commodity Sub Group. Impor Excel di sini bisa mengisi ketiga level sekaligus."
      apiPath="/api/master-data/industry-group"
      queryKey="master-data-industry-group"
      headerActions={
        <>
          <button
            type="button"
            onClick={downloadCommodityHierarchyExcelTemplate}
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
        { key: "name", label: "Kelompok Industri" },
        { key: "code", label: "Kode" },
        { key: "description", label: "Deskripsi" },
      ]}
      fields={[
        { key: "name", label: "Nama Kelompok Industri", type: "text", required: true, placeholder: "e.g. Industri Tekstil" },
        { key: "code", label: "Kode", type: "text", required: true, placeholder: "e.g. IND-01" },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      addButtonLabel="Tambah Kelompok Industri"
    />
  );
}
