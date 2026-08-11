"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import {
  PRODUCTION_QTY_VERIFICATION_STATUS_BADGE,
  PRODUCTION_QTY_VERIFICATION_STATUS_LABELS,
  PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY,
  PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY,
  PRODUCTION_QTY_STOK_SUMMARY_KEY,
  PRODUCTION_QTY_KONVERSI_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY,
  PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY,
  rawMaterialUsageRowKey,
  type ProductionQtyVerificationStatusValue,
} from "../../status";
import type { AssignmentStatusValue } from "../../status";
import { RichTextEditor } from "@/components/form/rich-text-editor";

type CapacityRow = {
  productId: string;
  jenisProduk: string;
  hsCode: string;
  berdasarkanIzin: string;
  kapasitasTerpasang: string;
  satuan: string;
};

type RawMaterialUsageRow = {
  id: string;
  rawMaterialId: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  productId: string | null;
  productName: string;
  conversionId: string | null;
  penggunaan: string;
  dataStock: string;
  rencanaKebutuhan: string;
  rencanaKebutuhanDalamNegeri: string;
  rencanaKebutuhanLuarNegeri: string;
  rencanaKebutuhanNegaraAsal: string;
  satuan: string;
  penggunaanStatus: ProductionQtyVerificationStatusValue;
  penggunaanKeterangan: string;
  stokStatus: ProductionQtyVerificationStatusValue;
  stokKeterangan: string;
  rencanaKebutuhanStatus: ProductionQtyVerificationStatusValue;
  rencanaKebutuhanKeterangan: string;
};

type RawMaterialUsageTopic = "penggunaan" | "stok" | "rencana-kebutuhan";

function rawMaterialTopicStatus(row: RawMaterialUsageRow, topic: RawMaterialUsageTopic): ProductionQtyVerificationStatusValue {
  if (topic === "penggunaan") return row.penggunaanStatus;
  if (topic === "stok") return row.stokStatus;
  return row.rencanaKebutuhanStatus;
}

function rawMaterialTopicKeterangan(row: RawMaterialUsageRow, topic: RawMaterialUsageTopic): string {
  if (topic === "penggunaan") return row.penggunaanKeterangan;
  if (topic === "stok") return row.stokKeterangan;
  return row.rencanaKebutuhanKeterangan;
}

type RawMaterialConversionRow = {
  id: string;
  productName: string;
  productHsCode: string;
  jenis: string;
  hsCode: string;
  kategori: string;
  volumeProduksiJumlah: string;
  volumeProduksiSatuan: string;
  volumeKebutuhanJumlah: string;
  volumeKebutuhanSatuan: string;
  rasioKonversi: string;
  keterangan: string;
};

const RAW_MATERIAL_CONVERSION_KATEGORI_LABELS: Record<string, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

type SalesRow = {
  id: string;
  productId: string;
  productName: string;
  deskripsi: string;
  hsCode: string;
  dalamNegeri: string;
  luarNegeri: string;
  negaraTujuan: string;
  satuan: string;
};

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

/** Renders a numeric string with Indonesian thousand separators (145000 -> "145.000"); non-numeric values pass through unchanged. */
function fmtNum(value: string): string {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return value || "—";
  return n.toLocaleString("id-ID");
}

type ConclusionState = { status: ProductionQtyVerificationStatusValue; keterangan: string; kesimpulan: string; verifiedAt: string | null };

type ProductionQtyRow = {
  key: string;
  section: "sebelumnya" | "rencana";
  productId: string;
  jenisProduk: string;
  deskripsiProduk: string;
  hsCode: string;
  jumlah: string;
  satuan: string;
  status: ProductionQtyVerificationStatusValue;
  keterangan: string;
  verifiedAt: string | null;
};

function CollapsibleSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex cursor-pointer items-center justify-between"
      >
        <div>
          <div className="text-[14.5px] font-extrabold text-[#20180f]">{title}</div>
          <div className="mt-0.5 text-[12px] text-[#8a7565]">{desc}</div>
        </div>
        <MaterialIcon name={open ? "expand_less" : "expand_more"} className="text-[20px] text-[#8a7565]" />
      </div>
      {open && <div className="mt-4 overflow-x-auto rounded-lg border border-[#e8dccd]">{children}</div>}
    </div>
  );
}

/** Shared Catatan Verifikator / Kesimpulan block (RTE + Memenuhi/Tidak Memenuhi) reused across the sebelumnya, penggunaan, and stok sections. */
function ConclusionEditor({
  summaryKey,
  conclusion,
  canEdit,
  savingKey,
  draft,
  onDraftChange,
  onSave,
  catatanPlaceholder,
  kesimpulanPlaceholder,
}: {
  summaryKey: string;
  conclusion: ConclusionState;
  canEdit: boolean;
  savingKey: string | null;
  draft: { keterangan?: string; kesimpulan?: string };
  onDraftChange: (field: "keterangan" | "kesimpulan", html: string) => void;
  onSave: (summaryKey: string, status: ProductionQtyVerificationStatusValue, options?: { noteOnly?: boolean }) => void;
  catatanPlaceholder: string;
  kesimpulanPlaceholder: string;
}) {
  return (
    <div className="mt-4 border-t border-[#f0ded0] pt-4">
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Catatan Verifikator / Uraian Observasi</div>
      <div className="mb-3">
        <RichTextEditor value={conclusion.keterangan} placeholder={catatanPlaceholder} disabled={!canEdit} onChange={(html) => onDraftChange("keterangan", html)} />
      </div>

      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Kesimpulan</div>
      <RichTextEditor value={conclusion.kesimpulan} placeholder={kesimpulanPlaceholder} disabled={!canEdit} onChange={(html) => onDraftChange("kesimpulan", html)} />
      {canEdit && (
        <div className="mb-3 mt-2 flex justify-end">
          <button
            type="button"
            disabled={savingKey === summaryKey || (draft.keterangan === undefined && draft.kesimpulan === undefined)}
            onClick={() => onSave(summaryKey, conclusion.status, { noteOnly: true })}
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50"
          >
            <MaterialIcon name="save" className="text-[15px]" />
            Simpan Catatan &amp; Kesimpulan
          </button>
        </div>
      )}
      {!canEdit && <div className="mb-3" />}
      <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">Status Kesimpulan</div>
      <div className="flex flex-wrap items-center gap-2.5">
        {canEdit ? (
          <>
            <button
              type="button"
              disabled={savingKey === summaryKey}
              onClick={() => onSave(summaryKey, "MEMENUHI")}
              className={
                "rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-50 " +
                (conclusion.status === "MEMENUHI" ? "border-[#16a34a] bg-[#e2f7ea] text-[#16a34a]" : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
              }
            >
              Memenuhi
            </button>
            <button
              type="button"
              disabled={savingKey === summaryKey}
              onClick={() => onSave(summaryKey, "TIDAK_MEMENUHI")}
              className={
                "rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold disabled:opacity-50 " +
                (conclusion.status === "TIDAK_MEMENUHI" ? "border-[#dc2626] bg-[#fbe4de] text-[#dc2626]" : "border-[#f0ded0] bg-white text-[#4a4038] hover:bg-[#f7f2ec]")
              }
            >
              Tidak Memenuhi
            </button>
          </>
        ) : (
          <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PRODUCTION_QTY_VERIFICATION_STATUS_BADGE[conclusion.status]}`}>
            {PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[conclusion.status]}
          </span>
        )}
      </div>
    </div>
  );
}

/** Formats digits with Indonesian thousand separators for display; empty/non-numeric passes through unchanged (unlike fmtNum, never substitutes "—" — this feeds an input's value). */
function formatNumericDisplay(value: string): string {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return value;
  return n.toLocaleString("id-ID");
}

/**
 * Inline editable cell, saves onBlur (only when the value actually changed). For numeric
 * fields (`numeric`), shows "1.000.000" while idle/typing but strips separators back to a
 * plain digit string ("1000000") before saving — DB keeps the raw number, display stays
 * formatted. Text fields (satuan, negaraTujuan) pass the typed value through untouched.
 */
function EditableValueInput({ value, onSave, numeric = false }: { value: string; onSave: (value: string) => void; numeric?: boolean }) {
  const [display, setDisplay] = useState(() => (numeric ? formatNumericDisplay(value) : value));
  return (
    <input
      type="text"
      inputMode={numeric ? "numeric" : "text"}
      value={display}
      onFocus={() => {
        if (numeric) setDisplay((current) => current.replace(/\D/g, ""));
      }}
      onChange={(event) => setDisplay(event.target.value)}
      onBlur={() => {
        const raw = numeric ? display.replace(/\D/g, "") : display;
        if (numeric) setDisplay(formatNumericDisplay(raw));
        if (raw !== value) onSave(raw);
      }}
      className={`w-full rounded-md border border-[#e8dccd] bg-white px-2 py-1 text-[11.5px] text-[#20180f] outline-none focus:border-[#e0662e] ${numeric ? "min-w-[17ch] tabular-nums" : ""}`}
    />
  );
}

type RawMaterialSortField = "hsCode" | "uraian" | "productName";

/** Sortable column header — click toggles asc/desc on that field, switching field resets to asc. */
function SortableHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
}: {
  label: string;
  field: RawMaterialSortField;
  activeField: RawMaterialSortField | null;
  direction: "asc" | "desc";
  onSort: (field: RawMaterialSortField) => void;
}) {
  const active = activeField === field;
  return (
    <th
      role="button"
      tabIndex={0}
      onClick={() => onSort(field)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSort(field);
        }
      }}
      className="cursor-pointer select-none border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white hover:bg-[#c14a1f]"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <MaterialIcon
          name={active ? (direction === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
          className={`text-[13px] ${active ? "opacity-100" : "opacity-60"}`}
        />
      </span>
    </th>
  );
}

/** Table for the Penggunaan/Stok raw-material sections — shared shape, one numeric column swapped per topic; value + satuan editable by verifikator, sortable by HS Code / Uraian Barang / Bahan Baku untuk Produk. */
type RawMaterialUsageValueField =
  | "penggunaan"
  | "dataStock"
  | "rencanaKebutuhan"
  | "rencanaKebutuhanDalamNegeri"
  | "rencanaKebutuhanLuarNegeri"
  | "rencanaKebutuhanNegaraAsal"
  | "satuan";

function RawMaterialUsageTable({
  rows,
  valueField,
  valueLabel,
  topic,
  canEdit,
  savingKey,
  onToggleStatus,
  onSaveKeterangan,
  onSaveValue,
  onNavigateToRawMaterial,
  splitRencanaKebutuhan = false,
}: {
  rows: RawMaterialUsageRow[];
  valueField: "penggunaan" | "dataStock" | "rencanaKebutuhan";
  valueLabel: string;
  topic: RawMaterialUsageTopic;
  canEdit: boolean;
  savingKey: string | null;
  onToggleStatus: (row: RawMaterialUsageRow, topic: RawMaterialUsageTopic) => void;
  onSaveKeterangan: (row: RawMaterialUsageRow, topic: RawMaterialUsageTopic, keterangan: string) => void;
  onSaveValue: (row: RawMaterialUsageRow, field: RawMaterialUsageValueField, value: string) => void;
  onNavigateToRawMaterial: (row: RawMaterialUsageRow) => void;
  /** Rencana Kebutuhan only — swaps the single value column for Dalam Negeri / Luar Negeri / Negara Asal (rencana impor). */
  splitRencanaKebutuhan?: boolean;
}) {
  const [sortField, setSortField] = useState<RawMaterialSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function handleSort(field: RawMaterialSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortField) return rows;
    const getValue = (r: RawMaterialUsageRow) => {
      if (sortField === "hsCode") return r.hsCode || "";
      if (sortField === "uraian") return r.hsDesc || r.jenis || "";
      return r.productName || "";
    };
    const sorted = [...rows].sort((a, b) => getValue(a).localeCompare(getValue(b), "id-ID"));
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [rows, sortField, sortDirection]);

  const columnCount = splitRencanaKebutuhan ? 10 : 8;

  return (
    <table className="w-full min-w-205 border-collapse text-[12px]">
      <thead>
        <tr style={{ background: "#e0662e" }}>
          <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">No</th>
          <SortableHeader label="HS Code" field="hsCode" activeField={sortField} direction={sortDirection} onSort={handleSort} />
          <SortableHeader label="Uraian Barang" field="uraian" activeField={sortField} direction={sortDirection} onSort={handleSort} />
          {splitRencanaKebutuhan ? (
            <>
              <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Jumlah Dalam Negeri</th>
              <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Jumlah Luar Negeri</th>
              <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Negara Asal</th>
            </>
          ) : (
            <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">{valueLabel}</th>
          )}
          <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Satuan</th>
          <SortableHeader
            label="Bahan Baku untuk Produk"
            field="productName"
            activeField={sortField}
            direction={sortDirection}
            onSort={handleSort}
          />
          <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Status</th>
          <th className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columnCount} className="px-3 py-3 text-center text-[#a68f80]">
              Tidak ada data.
            </td>
          </tr>
        )}
        {sortedRows.map((r, index) => {
          const status = rawMaterialTopicStatus(r, topic);
          const keterangan = rawMaterialTopicKeterangan(r, topic);
          const rowKey = rawMaterialUsageRowKey(topic, r.id);
          return (
            <tr key={r.id}>
              <td className="border border-[#efe2d4] px-3 py-2.25 text-[#6b5b4c]">{index + 1}</td>
              <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.hsCode || "—"}</td>
              <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                {r.conversionId ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateToRawMaterial(r)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onNavigateToRawMaterial(r);
                      }
                    }}
                    title="Buka di Product Verification"
                    className="cursor-pointer text-[#2f6fe0] underline decoration-dotted underline-offset-2 hover:text-[#1d4fb8]"
                  >
                    {r.hsDesc || r.jenis || "—"}
                  </span>
                ) : (
                  r.hsDesc || r.jenis || "—"
                )}
              </td>
              {splitRencanaKebutuhan ? (
                <>
                  <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">
                    {canEdit ? (
                      <EditableValueInput
                        value={r.rencanaKebutuhanDalamNegeri}
                        onSave={(value) => onSaveValue(r, "rencanaKebutuhanDalamNegeri", value)}
                        numeric
                      />
                    ) : (
                      fmtNum(r.rencanaKebutuhanDalamNegeri)
                    )}
                  </td>
                  <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">
                    {canEdit ? (
                      <EditableValueInput
                        value={r.rencanaKebutuhanLuarNegeri}
                        onSave={(value) => onSaveValue(r, "rencanaKebutuhanLuarNegeri", value)}
                        numeric
                      />
                    ) : (
                      fmtNum(r.rencanaKebutuhanLuarNegeri)
                    )}
                  </td>
                  <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                    {canEdit ? (
                      <EditableValueInput
                        value={r.rencanaKebutuhanNegaraAsal}
                        onSave={(value) => onSaveValue(r, "rencanaKebutuhanNegaraAsal", value)}
                      />
                    ) : (
                      r.rencanaKebutuhanNegaraAsal || "—"
                    )}
                  </td>
                </>
              ) : (
                <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">
                  {canEdit ? (
                    <EditableValueInput value={r[valueField]} onSave={(value) => onSaveValue(r, valueField, value)} numeric />
                  ) : (
                    fmtNum(r[valueField])
                  )}
                </td>
              )}
              <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                {canEdit ? (
                  <EditableValueInput value={r.satuan} onSave={(value) => onSaveValue(r, "satuan", value)} />
                ) : (
                  r.satuan || "—"
                )}
              </td>
              <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">{r.productName || "—"}</td>
              <td className="border border-[#efe2d4] px-3 py-2.25">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleStatus(r, topic)}
                  className={`inline-block cursor-pointer whitespace-nowrap rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PRODUCTION_QTY_VERIFICATION_STATUS_BADGE[status]} ${savingKey === rowKey ? "opacity-50" : ""}`}
                >
                  {PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[status]}
                </span>
              </td>
              <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                {status === "TIDAK_SESUAI" && canEdit ? (
                  <input
                    type="text"
                    defaultValue={keterangan}
                    onBlur={(event) => onSaveKeterangan(r, topic, event.target.value)}
                    placeholder="Jelaskan ketidaksesuaian..."
                    className="w-full rounded-md border border-[#e8b1a3] bg-white px-2 py-1 text-[11.5px] text-[#20180f] outline-none"
                  />
                ) : (
                  keterangan || "—"
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type Props = {
  assignmentId: string;
  assignmentStatus: AssignmentStatusValue;
  onNavigateToRawMaterial?: (productId: string, conversionId: string) => void;
};

export function ProductionQuantityTab({ assignmentId, assignmentStatus, onNavigateToRawMaterial }: Props) {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const canEdit = assignmentStatus === "SUBMITTED";

  const queryKey = ["verifikator-workspace", "assignments", assignmentId, "production-quantity"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`);
      if (!response.ok) throw new Error("Gagal memuat data produksi");
      const json = (await response.json()) as {
        data: {
          capacity: CapacityRow[];
          capacityDocumentPath: string | null;
          rows: ProductionQtyRow[];
          rawMaterialUsage: RawMaterialUsageRow[];
          rawMaterialConversion: RawMaterialConversionRow[];
          sales: SalesRow[];
          sebelumnyaConclusion: ConclusionState;
          penggunaanConclusion: ConclusionState;
          stokConclusion: ConclusionState;
          konversiConclusion: ConclusionState;
          rencanaConclusion: ConclusionState;
          rencanaKebutuhanConclusion: ConclusionState;
          penjualanConclusion: ConclusionState;
        };
      };
      return json.data;
    },
  });

  const capacity = data?.capacity ?? [];
  const capacityDocumentPath = data?.capacityDocumentPath ?? null;
  const rawMaterialUsage = data?.rawMaterialUsage ?? [];
  const rawMaterialConversion = data?.rawMaterialConversion ?? [];
  const sales = data?.sales ?? [];
  const sebelumnya = (data?.rows ?? []).filter((r) => r.section === "sebelumnya");
  const rencana = (data?.rows ?? []).filter((r) => r.section === "rencana");
  const emptyConclusion: ConclusionState = { status: "PENDING", keterangan: "", kesimpulan: "", verifiedAt: null };
  const sebelumnyaConclusion = data?.sebelumnyaConclusion ?? emptyConclusion;
  const penggunaanConclusion = data?.penggunaanConclusion ?? emptyConclusion;
  const stokConclusion = data?.stokConclusion ?? emptyConclusion;
  const konversiConclusion = data?.konversiConclusion ?? emptyConclusion;
  const rencanaConclusion = data?.rencanaConclusion ?? emptyConclusion;
  const rencanaKebutuhanConclusion = data?.rencanaKebutuhanConclusion ?? emptyConclusion;
  const penjualanConclusion = data?.penjualanConclusion ?? emptyConclusion;
  const [drafts, setDrafts] = useState<Record<string, { keterangan?: string; kesimpulan?: string }>>({});

  const conclusionLabels: Record<string, string> = {
    [PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY]: "jumlah produksi periode sebelumnya",
    [PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY]: "penggunaan bahan baku/penolong periode sebelumnya",
    [PRODUCTION_QTY_STOK_SUMMARY_KEY]: "stok terkini bahan baku/penolong",
    [PRODUCTION_QTY_KONVERSI_SUMMARY_KEY]: "konversi penggunaan bahan baku/penolong per jenis produk",
    [PRODUCTION_QTY_RENCANA_SUMMARY_KEY]: "rencana produksi periode tahun berikutnya",
    [PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY]: "rencana kebutuhan bahan baku/penolong 1 tahun ke depan",
    [PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY]: "penjualan dalam negeri & ekspor",
  };
  const conclusionsByKey: Record<string, ConclusionState> = {
    [PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY]: sebelumnyaConclusion,
    [PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY]: penggunaanConclusion,
    [PRODUCTION_QTY_STOK_SUMMARY_KEY]: stokConclusion,
    [PRODUCTION_QTY_KONVERSI_SUMMARY_KEY]: konversiConclusion,
    [PRODUCTION_QTY_RENCANA_SUMMARY_KEY]: rencanaConclusion,
    [PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY]: rencanaKebutuhanConclusion,
    [PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY]: penjualanConclusion,
  };

  async function saveConclusion(summaryKey: string, status: ProductionQtyVerificationStatusValue, options?: { noteOnly?: boolean }) {
    if (!canEdit) return;
    setSavingKey(summaryKey);
    const draft = drafts[summaryKey] ?? {};
    const current = conclusionsByKey[summaryKey];
    const keterangan = draft.keterangan ?? current.keterangan;
    const kesimpulan = draft.kesimpulan ?? current.kesimpulan;
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: summaryKey, status, keterangan, kesimpulan }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan catatan");
      return;
    }
    toast.success(
      options?.noteOnly
        ? `Catatan ${conclusionLabels[summaryKey]} disimpan.`
        : `Kesimpulan ${conclusionLabels[summaryKey]} ditandai ${PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[status]}.`,
    );
    queryClient.invalidateQueries({ queryKey });
  }

  async function toggleStatus(row: ProductionQtyRow) {
    if (!canEdit) return;
    const next: ProductionQtyVerificationStatusValue = row.status === "SESUAI" ? "TIDAK_SESUAI" : "SESUAI";
    setSavingKey(row.key);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: row.key, status: next, keterangan: row.keterangan }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  async function saveKeterangan(row: ProductionQtyRow, keterangan: string) {
    setSavingKey(row.key);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: row.key, status: row.status, keterangan }),
    });
    setSavingKey(null);
    if (!response.ok) {
      toast.error("Gagal menyimpan keterangan");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  /** Single write path for capacity/productionQty/rawMaterialUsage/sales source figures — see production-data route for the per-source field allowlist. */
  async function savePayloadField(
    source: "capacity" | "productionQty" | "rawMaterialUsage" | "sales",
    itemId: string,
    field: string,
    value: string,
    savingLabel: string,
  ) {
    if (!canEdit) return;
    setSavingKey(savingLabel);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-data`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, itemId, fields: { [field]: value } }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan data");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  function saveRawMaterialValue(row: RawMaterialUsageRow, field: RawMaterialUsageValueField, value: string) {
    savePayloadField("rawMaterialUsage", row.rawMaterialId, field, value, `rawMaterialUsage:${row.rawMaterialId}:${field}`);
  }

  function handleNavigateToRawMaterial(row: RawMaterialUsageRow) {
    if (!row.productId || !row.conversionId) return;
    onNavigateToRawMaterial?.(row.productId, row.conversionId);
  }

  async function toggleRawMaterialStatus(row: RawMaterialUsageRow, topic: RawMaterialUsageTopic) {
    if (!canEdit) return;
    const currentStatus = rawMaterialTopicStatus(row, topic);
    const currentKeterangan = rawMaterialTopicKeterangan(row, topic);
    const next: ProductionQtyVerificationStatusValue = currentStatus === "SESUAI" ? "TIDAK_SESUAI" : "SESUAI";
    const key = rawMaterialUsageRowKey(topic, row.id);
    setSavingKey(key);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status: next, keterangan: currentKeterangan }),
    });
    setSavingKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan status");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  async function saveRawMaterialKeterangan(row: RawMaterialUsageRow, topic: RawMaterialUsageTopic, keterangan: string) {
    const status = rawMaterialTopicStatus(row, topic);
    const key = rawMaterialUsageRowKey(topic, row.id);
    setSavingKey(key);
    const response = await fetch(`/api/verifikator-workspace/assignments/${assignmentId}/production-quantity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status, keterangan }),
    });
    setSavingKey(null);
    if (!response.ok) {
      toast.error("Gagal menyimpan keterangan");
      return;
    }
    queryClient.invalidateQueries({ queryKey });
  }

  if (isLoading) {
    return <p className="text-[13px] text-[#8a7565]">Memuat data produksi...</p>;
  }

  const dataTableHeader = (
    <thead>
      <tr style={{ background: "#e0662e" }}>
        {["No", "Jenis Produk", "Deskripsi Produk", "HS Code", "Jumlah", "Satuan", "Status", "Keterangan"].map((h) => (
          <th key={h} className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );

  function ProductionRow({ row, index }: { row: ProductionQtyRow; index: number }) {
    const jumlahField = row.section === "sebelumnya" ? "perTahunSebelumnya" : "perTahunRencana";
    return (
      <tr>
        <td className="border border-[#efe2d4] px-3 py-2.25 text-[#6b5b4c]">{index + 1}</td>
        <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">{row.jenisProduk || "—"}</td>
        <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{row.deskripsiProduk || "—"}</td>
        <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{row.hsCode || "—"}</td>
        <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">
          {canEdit ? (
            <EditableValueInput
              value={row.jumlah}
              onSave={(value) => savePayloadField("productionQty", row.productId, jumlahField, value, `productionQty:${row.key}`)}
              numeric
            />
          ) : (
            fmtNum(row.jumlah)
          )}
        </td>
        <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
          {canEdit ? (
            <EditableValueInput
              value={row.satuan}
              onSave={(value) => savePayloadField("productionQty", row.productId, "satuan", value, `productionQty:${row.key}:satuan`)}
            />
          ) : (
            row.satuan || "—"
          )}
        </td>
        <td className="border border-[#efe2d4] px-3 py-2.25">
          <span
            role="button"
            tabIndex={0}
            onClick={() => toggleStatus(row)}
            className={`inline-block cursor-pointer whitespace-nowrap rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PRODUCTION_QTY_VERIFICATION_STATUS_BADGE[row.status]} ${savingKey === row.key ? "opacity-50" : ""}`}
          >
            {PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[row.status]}
          </span>
        </td>
        <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
          {row.status === "TIDAK_SESUAI" && canEdit ? (
            <input
              type="text"
              defaultValue={row.keterangan}
              onBlur={(event) => saveKeterangan(row, event.target.value)}
              placeholder="Jelaskan ketidaksesuaian..."
              className="w-full rounded-md border border-[#e8b1a3] bg-white px-2 py-1 text-[11.5px] text-[#20180f] outline-none"
            />
          ) : (
            row.keterangan || "—"
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#8a7565]">
        Verifikasi jumlah produksi periode satu tahun sebelumnya dibandingkan dengan izin, kapasitas terpasang, dan rencana produksi tahun
        berikutnya.
      </p>

      <CollapsibleSection title="Kapasitas Produksi Berdasarkan Perizinan" desc="Kapasitas produksi berdasarkan izin dan kapasitas terpasang">
        <table className="w-full min-w-[600px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#f7f2ec]">
              {["HS Code", "Berdasarkan Izin", "Kapasitas Terpasang", "Satuan"].map((h) => (
                <th key={h} className="border-b border-[#e8dccd] px-3 py-2.25 text-left text-[11px] font-bold text-[#6b5b4c]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {capacity.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-[#a68f80]">
                  Tidak ada data kapasitas.
                </td>
              </tr>
            )}
            {capacity.map((c) => (
              <tr key={c.productId}>
                <td className="border-b border-[#f0ded0] px-3 py-2.25">
                  <div className="text-[12.5px] font-extrabold text-[#20180f]">{c.hsCode}</div>
                  <div className="mt-0.5 text-[11px] text-[#8a7565]">{c.jenisProduk}</div>
                </td>
                <td className="border-b border-[#f0ded0] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={c.berdasarkanIzin}
                      onSave={(value) => savePayloadField("capacity", c.productId, "berdasarkanIzin", value, `capacity:${c.productId}:berdasarkanIzin`)}
                      numeric
                    />
                  ) : (
                    fmtNum(c.berdasarkanIzin)
                  )}
                </td>
                <td className="border-b border-[#f0ded0] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={c.kapasitasTerpasang}
                      onSave={(value) => savePayloadField("capacity", c.productId, "kapasitasTerpasang", value, `capacity:${c.productId}:kapasitasTerpasang`)}
                      numeric
                    />
                  ) : (
                    fmtNum(c.kapasitasTerpasang)
                  )}
                </td>
                <td className="border-b border-[#f0ded0] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={c.satuan}
                      onSave={(value) => savePayloadField("capacity", c.productId, "satuan", value, `capacity:${c.productId}:satuan`)}
                    />
                  ) : (
                    c.satuan || "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {capacityDocumentPath ? (
          <a
            href={fileHref(capacityDocumentPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2f6fe0]"
          >
            <MaterialIcon name="description" className="text-[16px]" />
            Lihat Dokumen Pembuktian Kapasitas
          </a>
        ) : (
          <div className="mt-3 text-[12px] text-[#a68f80]">Dokumen pembuktian kapasitas belum diunggah.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Kapasitas Jumlah Produksi Periode Satu Tahun Sebelumnya"
        desc="Realisasi jumlah produksi pada periode satu tahun sebelumnya"
      >
        <table className="w-full min-w-205 border-collapse text-[12px]">
          {dataTableHeader}
          <tbody>
            {sebelumnya.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-3 text-center text-[#a68f80]">
                  Tidak ada data.
                </td>
              </tr>
            )}
            {sebelumnya.map((row, index) => (
              <ProductionRow key={row.key} row={row} index={index} />
            ))}
          </tbody>
        </table>

        {sebelumnya.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY}
            conclusion={sebelumnyaConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap jumlah produksi periode sebelumnya..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Penggunaan Bahan Baku/Penolong Periode Satu Tahun Sebelumnya"
        desc="Volume penggunaan bahan baku dan/atau bahan penolong pada periode satu tahun sebelumnya"
      >
        <RawMaterialUsageTable
          rows={rawMaterialUsage}
          valueField="penggunaan"
          valueLabel="Volume Penggunaan"
          topic="penggunaan"
          canEdit={canEdit}
          savingKey={savingKey}
          onToggleStatus={toggleRawMaterialStatus}
          onSaveKeterangan={saveRawMaterialKeterangan}
          onSaveValue={saveRawMaterialValue}
          onNavigateToRawMaterial={handleNavigateToRawMaterial}
        />
        {rawMaterialUsage.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY}
            conclusion={penggunaanConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap penggunaan bahan baku/penolong periode sebelumnya..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Jumlah Stok Terkini Bahan Baku/Penolong" desc="Stok bahan baku dan/atau bahan penolong yang tersedia saat ini">
        <RawMaterialUsageTable
          rows={rawMaterialUsage}
          valueField="dataStock"
          valueLabel="Stok Terkini"
          topic="stok"
          canEdit={canEdit}
          savingKey={savingKey}
          onToggleStatus={toggleRawMaterialStatus}
          onSaveKeterangan={saveRawMaterialKeterangan}
          onSaveValue={saveRawMaterialValue}
          onNavigateToRawMaterial={handleNavigateToRawMaterial}
        />
        {rawMaterialUsage.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_STOK_SUMMARY_KEY}
            conclusion={stokConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_STOK_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_STOK_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_STOK_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap stok terkini bahan baku/penolong..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Konversi Penggunaan Bahan Baku/Penolong per Jenis Produk"
        desc="Rasio konversi kebutuhan bahan baku/penolong terhadap volume produksi per jenis produk"
      >
        <table className="w-full min-w-205 border-collapse text-[12px]">
          <thead>
            <tr style={{ background: "#e0662e" }}>
              {["No", "Jenis Produk", "Volume Produksi", "Satuan", "Nama Item/Produk", "HS Code", "Kategori", "Volume Kebutuhan", "Satuan", "Rasio Konversi", "Keterangan"].map((h, i) => (
                <th key={`${h}-${i}`} className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawMaterialConversion.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-3 text-center text-[#a68f80]">
                  Tidak ada data.
                </td>
              </tr>
            )}
            {rawMaterialConversion.map((r, index) => (
              <tr key={r.id}>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#6b5b4c]">{index + 1}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">{r.productName || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{fmtNum(r.volumeProduksiJumlah)}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.volumeProduksiSatuan || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.jenis || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.hsCode || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{RAW_MATERIAL_CONVERSION_KATEGORI_LABELS[r.kategori] || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{fmtNum(r.volumeKebutuhanJumlah)}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.volumeKebutuhanSatuan || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">{r.rasioKonversi || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{r.keterangan || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rawMaterialConversion.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_KONVERSI_SUMMARY_KEY}
            conclusion={konversiConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_KONVERSI_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_KONVERSI_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_KONVERSI_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap konversi penggunaan bahan baku/penolong per jenis produk..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Kapasitas Jumlah Rencana Produksi Periode Tahun Berikutnya"
        desc="Rencana jumlah produksi pada periode tahun berikutnya"
      >
        <table className="w-full min-w-205 border-collapse text-[12px]">
          {dataTableHeader}
          <tbody>
            {rencana.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-3 text-center text-[#a68f80]">
                  Tidak ada data.
                </td>
              </tr>
            )}
            {rencana.map((row, index) => (
              <ProductionRow key={row.key} row={row} index={index} />
            ))}
          </tbody>
        </table>
        {rencana.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_RENCANA_SUMMARY_KEY}
            conclusion={rencanaConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_RENCANA_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_RENCANA_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_RENCANA_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap rencana produksi periode tahun berikutnya..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Rencana Kebutuhan Bahan Baku/Penolong 1 Tahun ke Depan"
        desc="Rencana kebutuhan bahan baku dan/atau bahan penolong untuk periode 1 tahun ke depan"
      >
        <RawMaterialUsageTable
          rows={rawMaterialUsage}
          valueField="rencanaKebutuhan"
          valueLabel="Rencana Kebutuhan"
          topic="rencana-kebutuhan"
          canEdit={canEdit}
          savingKey={savingKey}
          onToggleStatus={toggleRawMaterialStatus}
          onSaveKeterangan={saveRawMaterialKeterangan}
          onSaveValue={saveRawMaterialValue}
          onNavigateToRawMaterial={handleNavigateToRawMaterial}
          splitRencanaKebutuhan
        />
        {rawMaterialUsage.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY}
            conclusion={rencanaKebutuhanConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({
                ...prev,
                [PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY], [field]: html },
              }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap rencana kebutuhan bahan baku/penolong 1 tahun ke depan..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Penjualan Dalam Negeri & Ekspor" desc="Jumlah penjualan dalam negeri dan tujuan ekspor per jenis produk">
        <table className="w-full min-w-205 border-collapse text-[12px]">
          <thead>
            <tr style={{ background: "#e0662e" }}>
              {["No", "Jenis Produk", "HS Code", "Deskripsi", "Penjualan Dalam Negeri", "Penjualan Luar Negeri", "Negara Tujuan", "Satuan"].map((h) => (
                <th key={h} className="border border-[#c14a1f] px-3 py-2.25 text-left text-[11px] font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-3 text-center text-[#a68f80]">
                  Tidak ada data penjualan.
                </td>
              </tr>
            )}
            {sales.map((row, index) => (
              <tr key={row.id}>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#6b5b4c]">{index + 1}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 font-bold text-[#20180f]">{row.productName || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{row.hsCode || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">{row.deskripsi || "—"}</td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={row.dalamNegeri}
                      onSave={(value) => savePayloadField("sales", row.productId, "dalamNegeri", value, `sales:${row.productId}:dalamNegeri`)}
                      numeric
                    />
                  ) : (
                    fmtNum(row.dalamNegeri)
                  )}
                </td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={row.luarNegeri}
                      onSave={(value) => savePayloadField("sales", row.productId, "luarNegeri", value, `sales:${row.productId}:luarNegeri`)}
                      numeric
                    />
                  ) : (
                    fmtNum(row.luarNegeri)
                  )}
                </td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={row.negaraTujuan}
                      onSave={(value) => savePayloadField("sales", row.productId, "negaraTujuan", value, `sales:${row.productId}:negaraTujuan`)}
                    />
                  ) : (
                    row.negaraTujuan || "—"
                  )}
                </td>
                <td className="border border-[#efe2d4] px-3 py-2.25 text-[#4a4038]">
                  {canEdit ? (
                    <EditableValueInput
                      value={row.satuan}
                      onSave={(value) => savePayloadField("sales", row.productId, "satuan", value, `sales:${row.productId}:satuan`)}
                    />
                  ) : (
                    row.satuan || "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length > 0 && (
          <ConclusionEditor
            summaryKey={PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY}
            conclusion={penjualanConclusion}
            canEdit={canEdit}
            savingKey={savingKey}
            draft={drafts[PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY] ?? {}}
            onDraftChange={(field, html) =>
              setDrafts((prev) => ({ ...prev, [PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY]: { ...prev[PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY], [field]: html } }))
            }
            onSave={saveConclusion}
            catatanPlaceholder="Tuliskan uraian observasi verifikator terhadap penjualan dalam negeri & ekspor..."
            kesimpulanPlaceholder="Tuliskan kalimat kesimpulan yang akan ditampilkan pada laporan (opsional — jika kosong, laporan memakai kesimpulan baku)..."
          />
        )}
      </CollapsibleSection>
    </div>
  );
}
