"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { MasterDataPage } from "./master-data-page";
import { downloadHsCodeExcelTemplate, downloadHsCodeImportReport, parseHsCodeExcelFile } from "../hs-code-excel";
import {
  summarizeIssues,
  type HsCodeImportIssue,
  type RefCommodityGroup,
  type RefCommoditySubGroup,
  type RefUnit,
} from "../hs-code-import-resolver";
import { useIndustryCommodityGroups } from "../use-industry-commodity-groups";
import { useCommodityGroups } from "../use-commodity-groups";
import type { MasterDataRow } from "../types";

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
  // Kelompok Komoditas (IndustryGroup) > Sub Kelompok Komoditas (CommodityGroup) > Komoditas
  // (CommoditySubGroup) — cascading "Tambah HS Code" fields, each level's options filtered down
  // from the one above it. `industryGroupId` is a client-side filter only, never persisted on
  // HsCodeMasterData itself (its chosen Sub Kelompok Komoditas already implies which Kelompok
  // Komoditas it belongs to) — `hsCodeMasterDataSchema` strips it from the submitted body.
  const { industryGroupOptions, commodityGroupOptionsFor } = useIndustryCommodityGroups();
  const { subGroupOptionsFor } = useCommodityGroups();

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
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { rows, skippedRows, issues, issueRowCount } = await parseHsCodeExcelFile(file, {
        commodityGroups: (groups ?? []) as unknown as RefCommodityGroup[],
        commoditySubGroups: (subGroups ?? []) as unknown as RefCommoditySubGroup[],
        units: (units ?? []) as RefUnit[],
      });
      const issueSummary = summarizeIssues(issues);

      if (rows.length === 0) {
        if (issues.length > 0) {
          setImportReport({ created: 0, updated: 0, unchanged: [], duplicates: [], duplicatesInFile: [], ambiguous: [], skippedRows, issues, issueRowCount, mode: updateExisting ? "update" : "skip" });
          toast.error(`Tidak ada baris valid. ${issueRowCount} baris dilewati: ${issueSummary.join("; ")}.`);
        } else {
          toast.error("Tidak ada baris valid ditemukan. Pastikan kolom \"Pos Tarif / HS Code\" dan \"Uraian Barang\" terisi.");
        }
        return;
      }

      const mode = updateExisting ? "update" : "skip";
      const response = await fetch("/api/master-data/hs-code/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.error ?? "Gagal mengimpor data");
        return;
      }
      const { data } = (await response.json()) as { data: ImportApiResult };

      queryClient.invalidateQueries({ queryKey: ["master-data-hs-code"] });

      const notes: string[] = [];
      if (data.updated > 0) notes.push(`${data.updated} HS Code diperbarui`);
      if (data.unchanged.length > 0) notes.push(`${data.unchanged.length} sudah sesuai (tidak berubah)`);
      if (data.duplicates.length > 0) notes.push(`${data.duplicates.length} sudah terdaftar dilewati (centang "Perbarui yang sudah ada" untuk mengoreksi)`);
      if (data.duplicatesInFile.length > 0) notes.push(`${data.duplicatesInFile.length} HS Code muncul dua kali di file`);
      if (data.ambiguous.length > 0) notes.push(`${data.ambiguous.length} HS Code terdaftar lebih dari sekali, tidak diperbarui`);
      if (skippedRows > 0) notes.push(`${skippedRows} baris kosong dilewati`);
      if (issueRowCount > 0) notes.push(`${issueRowCount} baris dilewati karena data tidak dikenali: ${issueSummary.join("; ")}`);

      const changed = data.created + data.updated;
      const message = `${changed > 0 ? `${data.created} HS Code baru diimpor` : "Tidak ada HS Code baru"}.${notes.length > 0 ? " " + notes.join("; ") + "." : ""}`;
      if (changed > 0) toast.success(message);
      else toast.error(message);

      if (issues.length > 0 || data.ambiguous.length > 0 || data.duplicatesInFile.length > 0) {
        setImportReport({ ...data, skippedRows, issues, issueRowCount, mode });
      }
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
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
          <label className="flex items-center gap-1.5 text-[12px] text-[#5b4a42]" title="HS Code yang sudah terdaftar akan dikoreksi (Uraian, Sub Kelompok, Komoditas, Satuan) sesuai file">
            <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
            Perbarui yang sudah ada
          </label>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
        </>
      }
      columns={[
        { key: "hsCode", label: "Pos Tarif / HS Code" },
        { key: "description", label: "Uraian Barang" },
        {
          key: "commodityGroup",
          label: "Sub Kelompok Komoditas",
          render: (row) =>
            (row.commodityGroup as NamedOption | undefined)?.name ?? "—",
        },
        {
          key: "commoditySubGroup",
          label: "Komoditas",
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
          key: "industryGroupId",
          label: "Kelompok Komoditas",
          type: "searchselect",
          required: true,
          placeholder: "Cari kelompok komoditas...",
          options: industryGroupOptions,
          // Reconstructed from the row's own Sub Kelompok Komoditas relation when editing — this
          // filter field isn't a direct column on HsCodeMasterData (see the hook comment above).
          deriveInitialValue: (row: MasterDataRow) => {
            const commodityGroup = row.commodityGroup as { industryGroupId?: string | null } | undefined;
            return commodityGroup?.industryGroupId ?? "";
          },
        },
        {
          key: "commodityGroupId",
          label: "Sub Kelompok Komoditas",
          type: "searchselect",
          required: true,
          placeholder: "Cari sub kelompok komoditas...",
          dependsOn: "industryGroupId",
          optionsFor: commodityGroupOptionsFor,
        },
        {
          key: "commoditySubGroupId",
          label: "Komoditas",
          type: "searchselect",
          required: true,
          placeholder: "Cari komoditas...",
          dependsOn: "commodityGroupId",
          optionsFor: subGroupOptionsFor,
        },
        {
          key: "unitOfMeasurementId",
          label: "Satuan",
          type: "searchselect",
          required: true,
          placeholder: "Cari satuan...",
          options: units?.map((unit) => ({ value: unit.id, label: unit.name })) ?? [],
        },
      ]}
      addButtonLabel="Tambah HS Code"
      formNotice={({ initialValues, values }) => {
        const originalGroupId = initialValues?.commodityGroupId;
        if (!initialValues?.id || typeof originalGroupId !== "string" || !values.commodityGroupId || values.commodityGroupId === originalGroupId) {
          return null;
        }
        return <HsCodeRegroupNotice hsCodeId={String(initialValues.id)} />;
      }}
    />
    <ImportReportDialog report={importReport} onClose={() => setImportReport(null)} />
    </>
  );
}

type ImportApiResult = {
  created: number;
  updated: number;
  unchanged: string[];
  duplicates: string[];
  duplicatesInFile: string[];
  ambiguous: string[];
};

type ImportReport = ImportApiResult & {
  skippedRows: number;
  issues: HsCodeImportIssue[];
  issueRowCount: number;
  mode: "skip" | "update";
};

/** Lists exactly which rows were skipped and why (row number, column, value typed in the file), with
 * a downloadable Excel copy — instead of only a count in the toast. */
function ImportReportDialog({ report, onClose }: { report: ImportReport | null; onClose: () => void }) {
  const shown = report?.issues.slice(0, 300) ?? [];
  return (
    <Dialog open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Hasil Impor HS Code</DialogTitle>
        </DialogHeader>
        {report && (
          <div className="grid gap-3 text-[13px]">
            <p>
              Baru: <strong>{report.created}</strong> · Diperbarui: <strong>{report.updated}</strong> · Dilewati karena data
              tidak dikenali: <strong>{report.issueRowCount} baris</strong>
              {report.ambiguous.length > 0 && (
                <>
                  {" "}· Terdaftar lebih dari sekali: <strong>{report.ambiguous.length}</strong> ({report.ambiguous.slice(0, 10).join(", ")}
                  {report.ambiguous.length > 10 ? ", ..." : ""})
                </>
              )}
              {report.duplicatesInFile.length > 0 && (
                <>
                  {" "}· Dobel di file: <strong>{report.duplicatesInFile.length}</strong> ({report.duplicatesInFile.slice(0, 10).join(", ")}
                  {report.duplicatesInFile.length > 10 ? ", ..." : ""})
                </>
              )}
            </p>
            {report.mode === "update" && report.updated > 0 && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                HS Code yang Sub Kelompoknya berubah akan memindahkan produk VIU Barang Konsumsi pada draft/revisi ke Sub
                Kelompok baru saat dibuka.
              </p>
            )}
            {shown.length > 0 && (
              <div className="max-h-[50vh] overflow-auto rounded-lg border border-[#ead7cf]">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-[#faf3ef]">
                    <tr>
                      <th className="px-2 py-1.5">Baris</th>
                      <th className="px-2 py-1.5">HS Code</th>
                      <th className="px-2 py-1.5">Kolom</th>
                      <th className="px-2 py-1.5">Nilai di File</th>
                      <th className="px-2 py-1.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((issue, index) => (
                      <tr key={`${issue.rowNumber}-${issue.column}-${index}`} className="border-t border-[#f1e4de] align-top">
                        <td className="px-2 py-1.5">{issue.rowNumber}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{issue.hsCode}</td>
                        <td className="px-2 py-1.5">{issue.column}</td>
                        <td className="px-2 py-1.5">{issue.value || "(kosong)"}</td>
                        <td className="px-2 py-1.5">{issue.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.issues.length > shown.length && (
              <p className="text-[12px] text-[#8a7565]">Menampilkan {shown.length} dari {report.issues.length} masalah — unduh laporan untuk daftar lengkap.</p>
            )}
          </div>
        )}
        <DialogFooter>
          {report && (report.issues.length > 0 || report.duplicates.length > 0) && (
            <button
              type="button"
              onClick={() => downloadHsCodeImportReport(report.issues, report.duplicates)}
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2 text-[13px] font-semibold text-[#261813]"
            >
              <Download className="size-3.5" />
              Unduh Laporan
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg bg-[#e0662e] px-4 py-2 text-[13px] font-semibold text-white">
            Tutup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Warns before an HS Code moves to another Sub Kelompok Komoditas: VIU Konsumsi products using it
 * in drafts / active applications are regrouped the next time they're opened, and their new group
 * may need its own Hasil Uji Mutu certificate. */
function HsCodeRegroupNotice({ hsCodeId }: { hsCodeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["master-data-hs-code", hsCodeId, "usage"],
    queryFn: async () => {
      const response = await fetch(`/api/master-data/hs-code/${hsCodeId}/usage`);
      if (!response.ok) throw new Error("Gagal memuat pemakaian HS Code");
      const json = (await response.json()) as { data: { drafts: number; active: number; total: number } };
      return json.data;
    },
  });
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900">
      <p className="font-semibold">Sub Kelompok Komoditas HS Code ini akan diubah.</p>
      {isLoading ? (
        <p>Memeriksa pemakaian di permohonan…</p>
      ) : data && data.total > 0 ? (
        <p>
          HS Code ini dipakai di <strong>{data.drafts} draft/revisi</strong> dan <strong>{data.active} permohonan aktif</strong> VIU
          Barang Konsumsi. Produk pada draft/revisi (dan permohonan yang diedit Admin) akan dipindah ke Sub Kelompok baru saat
          dibuka, dan grup barunya mungkin memerlukan sertifikat Hasil Uji Mutu tersendiri. Permohonan aktif lainnya tetap
          seperti saat diajukan.
        </p>
      ) : (
        <p>Tidak ada draft atau permohonan aktif yang memakai HS Code ini.</p>
      )}
    </div>
  );
}
