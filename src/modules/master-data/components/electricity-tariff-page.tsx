"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { MasterDataPage } from "./master-data-page";
import { downloadElectricityTariffExcelTemplate, parseElectricityTariffExcelFile } from "../electricity-tariff-excel";

const KELOMPOK_OPTIONS = [
  "Sosial",
  "Rumah Tangga",
  "Bisnis",
  "Industri",
  "Pemerintah & Penerangan Jalan Umum",
  "Traksi",
  "Curah",
  "Layanan Khusus",
];

export function ElectricityTariffPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { rows, skippedRows } = await parseElectricityTariffExcelFile(file);
      if (rows.length === 0) {
        toast.error(
          "Tidak ada baris valid ditemukan. Pastikan kolom Kelompok, Tipe Kelompok, Golongan Tarif Listrik, Batas Daya, dan Tarif per kWh terisi.",
        );
        return;
      }

      const response = await fetch("/api/master-data/electricity-tariff/import", {
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

      queryClient.invalidateQueries({ queryKey: ["master-data-electricity-tariff"] });

      const notes: string[] = [];
      if (data.duplicates.length > 0) notes.push(`${data.duplicates.length} duplikat dilewati (${data.duplicates.slice(0, 5).join(", ")}${data.duplicates.length > 5 ? ", ..." : ""})`);
      if (skippedRows > 0) notes.push(`${skippedRows} baris kosong dilewati`);

      if (data.created > 0) {
        toast.success(`${data.created} Golongan Tarif berhasil diimpor.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      } else {
        toast.error(`Tidak ada data baru — semua baris duplikat.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`);
      }
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <MasterDataPage
      title="Golongan Tarif Listrik"
      description="Referensi golongan Tarif Tenaga Listrik PLN sesuai Permen ESDM Nomor 7 Tahun 2024 — dipakai Technical Analyst untuk estimasi pembayaran listrik pada Analisis Teknis VKI."
      apiPath="/api/master-data/electricity-tariff"
      queryKey="master-data-electricity-tariff"
      headerActions={
        <>
          <button
            type="button"
            onClick={downloadElectricityTariffExcelTemplate}
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
        { key: "kelompok", label: "Kelompok" },
        { key: "tipeKelompok", label: "Tipe Kelompok" },
        { key: "golongan", label: "Golongan Tarif Listrik" },
        { key: "batasDaya", label: "Batas Daya" },
        { key: "tarifPerKwh", label: "Tarif per kWh (Rp)" },
        { key: "keterangan", label: "Keterangan" },
      ]}
      fields={[
        {
          key: "kelompok",
          label: "Kelompok",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok...",
          options: KELOMPOK_OPTIONS.map((k) => ({ value: k, label: k })),
        },
        { key: "tipeKelompok", label: "Tipe Kelompok", type: "text", required: true, placeholder: "e.g. TM" },
        { key: "golongan", label: "Golongan Tarif Listrik", type: "text", required: true, placeholder: "e.g. I-3/TM" },
        { key: "batasDaya", label: "Batas Daya", type: "text", required: true, placeholder: "e.g. lebih dari 200 kVA s.d. kurang dari 30.000 kVA" },
        { key: "tarifPerKwh", label: "Tarif per kWh (Rp)", type: "text", required: true, placeholder: "e.g. 1.035,78" },
        { key: "keterangan", label: "Keterangan", type: "textarea", placeholder: "Rincian blok WBP/LWBP, faktor K, dsb." },
      ]}
      addButtonLabel="Tambah Golongan Tarif"
    />
  );
}
