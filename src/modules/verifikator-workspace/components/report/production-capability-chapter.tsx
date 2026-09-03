import type { ReactNode, CSSProperties } from "react";
import DOMPurify from "dompurify";
import "@/components/form/rich-text-editor.css";
import {
  INK,
  NAVY,
  ORANGE,
  ORANGE_LIGHT,
  ORANGE_TEXT,
  GREEN,
  CARD_BORDER,
  MUTED,
  MUTED_2,
  Badge,
  DocImage,
  PageHead,
  PageFoot,
  BrandMark,
  type CapacityRow,
  type MachineRow,
  type ProductRow,
  type RawMaterialRow,
  type ProductionQtyRow,
  type RawMaterialUsageRow,
  type RawMaterialConversionRow,
  type SalesRow,
} from "./document-verification-report";
import { PRODUCTION_CAPABILITY_COMPLIANCE_ROWS } from "../../document-compliance-defs";
import { MACHINE_KONDISI_LABELS } from "@/modules/applications/schema";
import { PRODUCTION_QTY_VERIFICATION_STATUS_LABELS } from "../../status";

/** Fixed page count — divider + 12 detail pages + 1 closing visual-summary page, matching the design's one-page-per-topic layout. */
export const PRODUCTION_CAPABILITY_CHAPTER_PAGE_COUNT = 14;

const SECTION_EYEBROW = "01 · HASIL PEMERIKSAAN ADMINISTRATIF KEMAMPUAN PRODUKSI";

const MACHINE_STATUS_META: Record<MachineRow["status"], { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#eef0f6", color: "#5b6478", label: "Belum Diperiksa" },
  APPROVED: { bg: "#d2f6dd", color: "#0e3d24", label: "Sesuai" },
  REJECTED: { bg: "#ffe0dc", color: "#7a1f14", label: "Tidak Sesuai" },
};

const RAW_MATERIAL_CONVERSION_KATEGORI_LABELS: Record<string, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

const PRODUCTION_QTY_STATUS_META: Record<ProductionQtyRow["status"], { bg: string; color: string }> = {
  PENDING: { bg: "#eef0f6", color: "#5b6478" },
  SESUAI: { bg: "#1a9850", color: "#fff" },
  TIDAK_SESUAI: { bg: "#ffe0dc", color: "#7a1f14" },
};

/** Header bar shared by every detail page (matches PageHead but sized for this chapter's tighter 36px/46px padding). */
function ChapterHead() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <BrandMark />
      <div style={{ border: `1px solid ${ORANGE_LIGHT}`, color: ORANGE_TEXT, padding: "5px 12px", fontSize: 11, letterSpacing: "0.05em", borderRadius: 20 }}>
        INTERNAL — TERBATAS
      </div>
    </div>
  );
}

function SectionEyebrow({ children = SECTION_EYEBROW }: { children?: string }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: ORANGE_TEXT, margin: "20px 0 6px" }}>{children}</div>;
}

function TableCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      {title && <div style={{ fontSize: 10.5, fontWeight: 700, color: INK, textAlign: "center", padding: "10px 0 6px" }}>{title}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>{children}</table>
    </div>
  );
}

function Th({ children, width, align = "left" }: { children: ReactNode; width?: string; align?: "left" | "center" }) {
  return (
    <th style={{ textAlign: align, fontWeight: 700, padding: "7px 8px", color: "#fff", width, fontSize: 8.5 }}>{children}</th>
  );
}

function Td({ children, bold, muted }: { children: ReactNode; bold?: boolean; muted?: boolean }) {
  return <td style={{ padding: "8px", verticalAlign: "top", color: muted ? MUTED : INK, fontWeight: bold ? 600 : 400 }}>{children}</td>;
}

function Row({ index, children }: { index: number; children: ReactNode }) {
  return <tr style={{ background: index % 2 === 0 ? "#fff" : "#eef1f5", borderBottom: "1px solid #e2dccf" }}>{children}</tr>;
}

function TotalRow({ label, colSpan, value, satuan }: { label: string; colSpan: number; value: string; satuan: string }) {
  return (
    <tr style={{ fontWeight: 700, background: "#f2e9d9" }}>
      <td style={{ padding: 8 }} colSpan={colSpan}>
        {label}
      </td>
      <td style={{ padding: 8 }}>{value}</td>
      <td style={{ padding: 8 }}>{satuan}</td>
      <td style={{ padding: 8 }}>—</td>
    </tr>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 16, textAlign: "center", color: MUTED_2, fontSize: 10.5 }}>
        Tidak ada data.
      </td>
    </tr>
  );
}

function CatatanVerifikator({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: ORANGE_TEXT, marginBottom: 8 }}>Catatan Verifikator</div>
      {paragraphs.map((text, i) => (
        <p key={i} style={{ fontSize: 10, lineHeight: 1.55, color: "#1f2f26", margin: i === paragraphs.length - 1 ? 0 : "0 0 8px" }}>
          {text}
        </p>
      ))}
    </div>
  );
}

/** Renders rich-text HTML written by a verifikator via RichTextEditor (bold/lists/tables/images) — sanitized before injection. */
function SanitizedHtml({ html, style }: { html: string; style?: CSSProperties }) {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
  return <div className="rte-html" style={{ fontSize: 10, color: "#1f2f26", ...style }} dangerouslySetInnerHTML={{ __html: clean }} />;
}

function NoteBox({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div style={{ background: "#fdf6ec", border: `1px solid ${ORANGE_LIGHT}`, borderLeft: `4px solid ${ok ? GREEN : "#c1361f"}`, borderRadius: 8, padding: "14px 16px" }}>
      {children}
    </div>
  );
}

function ChecklistItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, lineHeight: 1.6, color: ok ? "#1f2f26" : "#7a1f14" }}>
      {ok ? "✓" : "✕"} {children}
    </div>
  );
}

/** hasData=false means the company never submitted anything for this aspect — distinct from hasData=true+ok=false (submitted but not sesuai/lengkap), so the recap table never claims a verdict on data that doesn't exist. */
function RecapBadge({ hasData, ok }: { hasData: boolean; ok: boolean }) {
  if (!hasData) return <Badge color="#5b6478" bg="#eef0f6">Belum Ada Data</Badge>;
  return ok ? <Badge color="#0e3d24" bg="#d2f6dd">Memenuhi</Badge> : <Badge color="#7a1f14" bg="#ffe0dc">Belum Memenuhi</Badge>;
}

function Footer({ company, pageLabel }: { company: string; pageLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED_2, borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 12, marginTop: 12 }}>
      <div>Laporan Verifikasi Dokumen — {company}</div>
      <div>{pageLabel}</div>
    </div>
  );
}

/** Detail page shell matching the design's tighter 36px/46px padding — used for every page after the compliance table. */
function DetailPage({ pageNo, totalPages, company, id, children }: { pageNo: number; totalPages: number; company: string; id?: string; children: ReactNode }) {
  return (
    <section className="rd-sheet" id={id} style={{ background: "#f9f3eb", color: INK, padding: "36px 46px", display: "flex", flexDirection: "column" }}>
      <ChapterHead />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</div>
      <Footer company={company} pageLabel={`${pageNo} dari ${totalPages}`} />
    </section>
  );
}

function fmtNum(value: string): string {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return value || "—";
  return n.toLocaleString("id-ID");
}

/** Sums a numeric field across rows — only when every row parses as a finite number, so a partial dataset never produces a fabricated total. */
function sumIfComplete(values: string[]): number | null {
  if (values.length === 0) return null;
  let total = 0;
  for (const v of values) {
    const n = Number(v);
    if (!v || !Number.isFinite(n)) return null;
    total += n;
  }
  return total;
}

type HsGroup = { hsCode: string; jenis: string; satuan: string; total: number };

/** Groups rows by HS code and sums a numeric field per group — a group is only included when every contributing value is a real, parseable number. */
function groupByHsCode(rows: { hsCode: string; jenis: string; satuan: string }[], values: string[]): HsGroup[] {
  const byHs = new Map<string, { jenis: string; satuan: string; values: string[] }>();
  rows.forEach((row, i) => {
    if (!row.hsCode) return;
    const entry = byHs.get(row.hsCode) ?? { jenis: row.jenis, satuan: row.satuan, values: [] };
    entry.values.push(values[i]);
    byHs.set(row.hsCode, entry);
  });
  const groups: HsGroup[] = [];
  for (const [hsCode, entry] of byHs) {
    const total = sumIfComplete(entry.values);
    if (total === null) continue;
    groups.push({ hsCode, jenis: entry.jenis, satuan: entry.satuan, total });
  }
  return groups;
}

type Props = {
  capacity: CapacityRow[];
  capacityDocumentPath: string | null;
  machines: MachineRow[];
  products: ProductRow[];
  rawMaterials: RawMaterialRow[];
  productionQty: ProductionQtyRow[];
  rawMaterialUsage: RawMaterialUsageRow[];
  rawMaterialConversion: RawMaterialConversionRow[];
  sales: SalesRow[];
  productionSebelumnyaConclusion: { status: string; keterangan: string; kesimpulan: string };
  penggunaanConclusion: { status: string; keterangan: string; kesimpulan: string };
  stokConclusion: { status: string; keterangan: string; kesimpulan: string };
  konversiConclusion: { status: string; keterangan: string; kesimpulan: string };
  rencanaConclusion: { status: string; keterangan: string; kesimpulan: string };
  rencanaKebutuhanConclusion: { status: string; keterangan: string; kesimpulan: string };
  penjualanConclusion: { status: string; keterangan: string; kesimpulan: string };
  company: string;
  chapterIdx: number;
  startPage: number;
  totalPages: number;
};

export function ProductionCapabilityChapter({
  capacity,
  capacityDocumentPath,
  machines,
  rawMaterialUsage,
  productionQty,
  rawMaterialConversion,
  sales,
  productionSebelumnyaConclusion,
  penggunaanConclusion,
  stokConclusion,
  konversiConclusion,
  rencanaConclusion,
  rencanaKebutuhanConclusion,
  penjualanConclusion,
  company,
  chapterIdx,
  startPage,
  totalPages,
}: Props) {
  const babLabel = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][chapterIdx + 1] ?? String(chapterIdx + 1);
  const p = (n: number) => startPage + n;

  const productionSebelumnya = productionQty.filter((r) => r.section === "sebelumnya");
  const productionRencana = productionQty.filter((r) => r.section === "rencana");
  const salesExport = sales.filter((r) => r.luarNegeri);

  const capacityOk = capacity.length > 0 && capacity.every((c) => {
    const izin = Number(c.berdasarkanIzin);
    const terpasang = Number(c.kapasitasTerpasang);
    return c.berdasarkanIzin && c.kapasitasTerpasang && Number.isFinite(izin) && Number.isFinite(terpasang) && terpasang <= izin;
  });
  const productionSebelumnyaAutoOk = productionSebelumnya.length > 0 && productionSebelumnya.every((r) => r.status === "SESUAI");
  // Verifikator's explicit whole-section conclusion (set via the "Kesimpulan" buttons in the
  // Verifikasi Jumlah Produksi tab) overrides the auto-computed per-row result when set.
  const sebelumnyaConclusionSet = productionSebelumnyaConclusion.status === "MEMENUHI" || productionSebelumnyaConclusion.status === "TIDAK_MEMENUHI";
  const productionSebelumnyaOk = sebelumnyaConclusionSet ? productionSebelumnyaConclusion.status === "MEMENUHI" : productionSebelumnyaAutoOk;
  const productionRencanaAutoOk = productionRencana.length > 0 && productionRencana.every((r) => r.status === "SESUAI");
  const rencanaConclusionSet = rencanaConclusion.status === "MEMENUHI" || rencanaConclusion.status === "TIDAK_MEMENUHI";
  const productionRencanaOk = rencanaConclusionSet ? rencanaConclusion.status === "MEMENUHI" : productionRencanaAutoOk;
  const machinesOk = machines.length > 0 && machines.every((m) => m.status === "APPROVED");
  const salesAutoOk = sales.length > 0 && sales.every((r) => r.dalamNegeri);
  const penjualanConclusionSet = penjualanConclusion.status === "MEMENUHI" || penjualanConclusion.status === "TIDAK_MEMENUHI";
  const salesOk = penjualanConclusionSet ? penjualanConclusion.status === "MEMENUHI" : salesAutoOk;

  const totalSebelumnya = sumIfComplete(productionSebelumnya.map((r) => r.jumlah));
  const totalRencana = sumIfComplete(productionRencana.map((r) => r.jumlah));
  const totalDalamNegeri = sumIfComplete(sales.map((r) => r.dalamNegeri));

  const usageHsGroups = groupByHsCode(rawMaterialUsage, rawMaterialUsage.map((r) => r.penggunaan));
  const kebutuhanHsGroups = groupByHsCode(rawMaterialUsage, rawMaterialUsage.map((r) => r.rencanaKebutuhan));

  const penggunaanAutoOk = rawMaterialUsage.length > 0 && rawMaterialUsage.every((r) => r.penggunaan);
  const penggunaanConclusionSet = penggunaanConclusion.status === "MEMENUHI" || penggunaanConclusion.status === "TIDAK_MEMENUHI";
  const penggunaanOk = penggunaanConclusionSet ? penggunaanConclusion.status === "MEMENUHI" : penggunaanAutoOk;
  const konversiAutoOk = rawMaterialConversion.length > 0 && rawMaterialConversion.every((r) => r.volumeKebutuhanJumlah && r.volumeProduksiJumlah);
  const konversiConclusionSet = konversiConclusion.status === "MEMENUHI" || konversiConclusion.status === "TIDAK_MEMENUHI";
  const konversiOk = konversiConclusionSet ? konversiConclusion.status === "MEMENUHI" : konversiAutoOk;
  const rencanaKebutuhanAutoOk = rawMaterialUsage.length > 0 && rawMaterialUsage.every((r) => r.rencanaKebutuhan);
  const rencanaKebutuhanConclusionSet = rencanaKebutuhanConclusion.status === "MEMENUHI" || rencanaKebutuhanConclusion.status === "TIDAK_MEMENUHI";
  const rencanaKebutuhanOk = rencanaKebutuhanConclusionSet ? rencanaKebutuhanConclusion.status === "MEMENUHI" : rencanaKebutuhanAutoOk;
  const stokAutoOk = rawMaterialUsage.length > 0 && rawMaterialUsage.every((r) => r.dataStock);
  const stokConclusionSet = stokConclusion.status === "MEMENUHI" || stokConclusion.status === "TIDAK_MEMENUHI";
  const stokOk = stokConclusionSet ? stokConclusion.status === "MEMENUHI" : stokAutoOk;
  const overallOk =
    capacityOk && machinesOk && productionSebelumnyaOk && penggunaanOk && konversiOk && productionRencanaOk && rencanaKebutuhanOk && salesOk && stokOk;

  // Single source of truth for both the Kesimpulan Akhir recap table and the closing Ringkasan Visual page.
  const recapItems: { no: string; label: string; hasData: boolean; ok: boolean; data: string; angka: string }[] = [
    { no: "1", label: "Kapasitas produksi berdasarkan perizinan", hasData: capacity.length > 0, ok: capacityOk, data: `${capacity.length} produk`, angka: "angka 1" },
    { no: "2", label: "Kemampuan produksi mesin per hari", hasData: machines.length > 0, ok: machinesOk, data: `${machines.length} mesin`, angka: "angka 1" },
    { no: "3", label: "Jumlah produksi & penggunaan bahan baku 1 tahun sebelumnya", hasData: productionSebelumnya.length > 0, ok: productionSebelumnyaOk && penggunaanOk, data: `${productionSebelumnya.length} produk`, angka: "angka 2" },
    { no: "4", label: "Konversi penggunaan bahan baku per jenis produk", hasData: rawMaterialConversion.length > 0, ok: konversiOk, data: `${rawMaterialConversion.length} bahan baku`, angka: "angka 3" },
    { no: "5", label: "Rencana produksi & kebutuhan bahan baku 1 tahun ke depan", hasData: productionRencana.length > 0, ok: productionRencanaOk && rencanaKebutuhanOk, data: `${productionRencana.length} produk`, angka: "angka 4" },
    { no: "6", label: "Penjualan dalam negeri dan ekspor", hasData: sales.length > 0, ok: salesOk, data: `${sales.length} produk`, angka: "angka 5" },
    { no: "7", label: "Stok terkini bahan baku", hasData: rawMaterialUsage.length > 0, ok: stokOk, data: `${rawMaterialUsage.length} pos tarif`, angka: "angka 6" },
  ];
  const recapCompliant = recapItems.filter((item) => item.hasData && item.ok).length;

  // --- narrative paragraphs, generated from real fields (never the fixed mockup text) ---

  const kapasitasParagraphs = capacity.map((c) => {
    const izin = c.berdasarkanIzin ? `${fmtNum(c.berdasarkanIzin)} ${c.satuan}` : "belum dicantumkan";
    const terpasang = c.kapasitasTerpasang ? `${fmtNum(c.kapasitasTerpasang)} ${c.satuan}` : "belum dicantumkan";
    return `Untuk produk ${c.jenisProduk || "—"} (HS ${c.hsCode || "—"}), dokumen perizinan berusaha mencantumkan kapasitas produksi sebesar ${izin}, sedangkan hasil verifikasi teknis terhadap fasilitas produksi menunjukkan kapasitas terpasang sebesar ${terpasang}.`;
  });

  const machinesByProses = new Map<string, MachineRow[]>();
  for (const m of machines) {
    const key = m.proses || "Proses Produksi";
    machinesByProses.set(key, [...(machinesByProses.get(key) ?? []), m]);
  }
  const machineParagraphs = [...machinesByProses.entries()].map(([proses, group]) => {
    const items = group
      .map((m) => `${m.quantity || "—"} unit ${m.nama || "mesin"}${m.merk ? ` merk ${m.merk}` : ""}${m.model ? ` model ${m.model}` : ""}${m.tahun ? ` tahun ${m.tahun}` : ""}`)
      .join(", ");
    const kondisiAktif = group.filter((m) => m.kondisi === "AKTIF").length;
    const kondisiText = group.length > 0 ? ` Sebanyak ${kondisiAktif} dari ${group.length} mesin tercatat dalam kondisi aktif.` : "";
    return `Pada proses ${proses}, perusahaan menggunakan ${items}.${kondisiText}`;
  });

  const sebelumnyaPeriodYear = new Date().getFullYear() - 1;
  const rencanaPeriodYear = new Date().getFullYear() + 1;
  const produksiParagraphs =
    productionSebelumnya.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data jumlah produksi untuk setiap jenis produk beserta klasifikasi Harmonized System (HS) selama periode tahun ${sebelumnyaPeriodYear}, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025.`,
          `Perusahaan memproduksi ${productionSebelumnya.length} jenis produk dengan rincian: ${productionSebelumnya
            .map((r) => `${r.jenisProduk || "—"} ${fmtNum(r.jumlah)} ${r.satuan}`)
            .join("; ")}.${totalSebelumnya !== null ? ` Total volume produksi tercatat sebanyak ${totalSebelumnya.toLocaleString("id-ID")} ${productionSebelumnya[0]?.satuan ?? ""}.` : ""}`,
        ]
      : [];

  const penggunaanParagraphs =
    rawMaterialUsage.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data penggunaan bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System selama periode tahun ${sebelumnyaPeriodYear}, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025.`,
          `Perusahaan menyampaikan data penggunaan bahan baku/penolong untuk ${rawMaterialUsage.length} pos tarif, digunakan pada produksi ${[...new Set(rawMaterialUsage.map((r) => r.productName).filter(Boolean))].join(", ") || "produk terkait"}.`,
          ...(usageHsGroups.length > 0
            ? [`Total penggunaan tercatat: ${usageHsGroups.map((g) => `${g.jenis || g.hsCode} sebanyak ${g.total.toLocaleString("id-ID")} ${g.satuan}`).join("; ")}.`]
            : []),
        ]
      : [];

  const konversiParagraphs =
    rawMaterialConversion.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data konversi penggunaan bahan baku dan/atau bahan penolong per jenis produk sebagai dasar perhitungan kebutuhan bahan baku, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 3 Permenperin Nomor 27 Tahun 2025.`,
          `Kebutuhan bahan baku untuk setiap ${rawMaterialConversion[0]?.volumeProduksiSatuan || "unit"} produk ditetapkan melalui rasio konversi sebagai berikut: ${rawMaterialConversion
            .map((r) => `${r.productName || "—"} membutuhkan ${r.volumeKebutuhanJumlah || "—"} ${r.volumeKebutuhanSatuan} ${r.jenis || r.hsCode} per ${r.volumeProduksiJumlah || "1"} ${r.volumeProduksiSatuan}`)
            .join("; ")}.`,
        ]
      : [];

  const rencanaProduksiParagraphs =
    productionRencana.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data rencana produksi untuk setiap jenis produk beserta klasifikasi Harmonized System (HS) selama periode tahun ${rencanaPeriodYear}, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025.`,
          `Perusahaan merencanakan produksi untuk ${productionRencana.length} jenis produk dengan rincian: ${productionRencana
            .map((r) => `${r.jenisProduk || "—"} ${fmtNum(r.jumlah)} ${r.satuan}`)
            .join("; ")}.${totalRencana !== null ? ` Total rencana produksi tercatat sebanyak ${totalRencana.toLocaleString("id-ID")} ${productionRencana[0]?.satuan ?? ""}.` : ""}`,
        ]
      : [];

  const rencanaKebutuhanParagraphs =
    rawMaterialUsage.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data rencana kebutuhan bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System selama periode tahun ${rencanaPeriodYear}, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025.`,
          kebutuhanHsGroups.length > 0
            ? `Rencana kebutuhan bahan baku/penolong 1 (satu) tahun ke depan: ${kebutuhanHsGroups.map((g) => `${g.jenis || g.hsCode} sebanyak ${g.total.toLocaleString("id-ID")} ${g.satuan}`).join("; ")}.`
            : "Rencana kebutuhan bahan baku/penolong 1 (satu) tahun ke depan telah disampaikan sebagaimana tercantum pada tabel di atas.",
        ]
      : [];

  const penjualanParagraphs =
    sales.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data penjualan dalam negeri dan ekspor untuk setiap jenis dan pos tarif/Harmonized System selama periode tahun ${sebelumnyaPeriodYear}, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 5 Permenperin Nomor 27 Tahun 2025.`,
          `Penjualan dalam negeri tercatat untuk ${sales.length} jenis produk: ${sales.map((r) => `${r.productName || "—"} ${fmtNum(r.dalamNegeri)} ${r.satuan}`).join("; ")}.${totalDalamNegeri !== null ? ` Total penjualan dalam negeri sebanyak ${totalDalamNegeri.toLocaleString("id-ID")} ${sales[0]?.satuan ?? ""}.` : ""}`,
          salesExport.length > 0
            ? `Penjualan ekspor tercatat untuk ${salesExport.map((r) => `${r.productName || "—"} ${fmtNum(r.luarNegeri)} ${r.satuan} ke ${r.negaraTujuan || "negara tujuan yang belum dicantumkan"}`).join("; ")}.`
            : "Perusahaan tidak menyampaikan data penjualan ekspor pada periode ini.",
        ]
      : [];

  const stokParagraphs =
    rawMaterialUsage.length > 0
      ? [
          `Berdasarkan hasil pemeriksaan administratif terhadap dokumen yang disampaikan oleh ${company}, perusahaan telah menyampaikan data stok terkini bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System, sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf a angka 6 Permenperin Nomor 27 Tahun 2025.`,
          `Data stok bahan baku/penolong terkini disampaikan untuk ${rawMaterialUsage.length} pos tarif: ${rawMaterialUsage
            .map((r) => `${r.jenis || r.hsCode} ${r.dataStock ? `${fmtNum(r.dataStock)} ${r.satuan}` : "belum dicantumkan"}`)
            .join("; ")}.`,
        ]
      : [];

  return (
    <>
      {/* BAB divider */}
      <section
        className="rd-sheet"
        id="bab-kemampuan-produksi"
        style={{ background: NAVY, color: "#fff", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        <div style={{ position: "absolute", top: 60, left: -40, fontSize: 340, fontWeight: 800, color: "#fff", opacity: 0.05, lineHeight: 1 }}>
          {String(chapterIdx + 2).padStart(2, "0")}
        </div>
        <div style={{ position: "relative", padding: "0 56px", maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 22, height: 2, background: ORANGE_LIGHT }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#f28951" }}>BAB {babLabel}</div>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: "0 0 18px" }}>Kemampuan Produksi</h1>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#b8c0cc", margin: 0 }}>
            Pemeriksaan administratif dan observasi lapangan terhadap kapasitas, mesin, bahan baku, dan realisasi produksi {company} sebagai
            dasar Verifikasi Kemampuan Industri (VKI).
          </p>
        </div>
      </section>

      {/* A. Pemeriksaan Administratif Kemampuan Produksi */}
      <DetailPage pageNo={p(1)} totalPages={totalPages} company={company}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>A. Pemeriksaan Administratif Kemampuan Produksi</h1>
        <p style={{ fontSize: 11, lineHeight: 1.55, color: MUTED, margin: "0 0 14px", maxWidth: 660 }}>
          Pemeriksaan administratif dilakukan untuk memastikan bahwa kapasitas produksi yang diajukan perusahaan memiliki dasar hukum dan
          didukung oleh dokumen perizinan yang sah. Verifikasi dilakukan terhadap dokumen perizinan berusaha, data legal perusahaan, serta
          dokumen pendukung yang memuat informasi mengenai kapasitas produksi yang diizinkan.
        </p>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 10, borderRadius: 10, overflow: "hidden", marginTop: 6 }}>
          <thead>
            <tr style={{ background: "#f2e9d9" }}>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", fontSize: 8.5, color: "#5c5346", width: "4%" }}>NO</th>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", fontSize: 8.5, color: "#5c5346", width: "22%" }}>JENIS DOKUMEN</th>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", fontSize: 8.5, color: "#5c5346", width: "9%" }}>PERSYARATAN</th>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", fontSize: 8.5, color: "#5c5346", width: "30%" }}>REFERENSI REGULASI</th>
              <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", fontSize: 8.5, color: "#5c5346" }}>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTION_CAPABILITY_COMPLIANCE_ROWS.map((row, i) => (
              <tr key={row.no} style={{ background: "#fff", borderBottom: i < PRODUCTION_CAPABILITY_COMPLIANCE_ROWS.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                <td style={{ padding: "8px 9px", verticalAlign: "top" }}>{row.no}</td>
                <td style={{ padding: "8px 9px", verticalAlign: "top", fontWeight: 600 }}>{row.jenisDokumen}</td>
                <td style={{ padding: "8px 9px", verticalAlign: "top" }}>
                  <Badge color="#7a1f14" bg="#ffe0dc">
                    {row.persyaratan}
                  </Badge>
                </td>
                <td style={{ padding: "8px 9px", verticalAlign: "top", lineHeight: 1.4, color: MUTED }}>{row.referensi}</td>
                <td style={{ padding: "8px 9px", verticalAlign: "top", lineHeight: 1.4, color: MUTED }}>{row.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DetailPage>

      {/* 1. Kapasitas Produksi Berdasarkan Perizinan */}
      <DetailPage pageNo={p(2)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 14px" }}>1. Kapasitas Produksi Berdasarkan Perizinan</h1>
        <p style={{ fontSize: 11, lineHeight: 1.6, color: "#1f2f26", margin: "0 0 16px", maxWidth: 900 }}>
          Verifikator melakukan pemeriksaan terhadap data kapasitas produksi perusahaan untuk memastikan bahwa kapasitas produksi yang diajukan
          dalam permohonan sesuai dengan dokumen perizinan berusaha yang masih berlaku sesuai dengan Pasal 30 ayat (2) huruf a angka 1
          Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Kapasitas Produksi Berdasarkan Perizinan">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="20%">JENIS PRODUKSI</Th>
              <Th width="10%">HS CODE</Th>
              <Th width="18%">KAPASITAS/TAHUN</Th>
              <Th width="10%">SATUAN</Th>
              <Th width="18%">KAPASITAS TERPASANG/TAHUN</Th>
              <Th width="10%">SATUAN</Th>
            </tr>
          </thead>
          <tbody>
            {capacity.length === 0 && <EmptyRow colSpan={7} />}
            {capacity.map((c, i) => (
              <Row key={c.productId} index={i}>
                <Td>{i + 1}</Td>
                <Td bold>{c.jenisProduk || "—"}</Td>
                <Td>{c.hsCode || "—"}</Td>
                <Td>{fmtNum(c.berdasarkanIzin)}</Td>
                <Td>{c.satuan || "—"}</Td>
                <Td>{fmtNum(c.kapasitasTerpasang)}</Td>
                <Td>{c.satuan || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        {capacity.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 165px", gap: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ChecklistItem ok={capacity.every((c) => c.jenisProduk)}>Jenis produk tercantum untuk setiap baris kapasitas produksi.</ChecklistItem>
              <ChecklistItem ok={capacity.every((c) => c.berdasarkanIzin)}>Kapasitas produksi tercantum dalam dokumen perizinan berusaha.</ChecklistItem>
              <ChecklistItem ok={capacityOk}>Kapasitas terpasang tidak melebihi kapasitas berdasarkan dokumen perizinan.</ChecklistItem>
              <ChecklistItem ok={capacity.every((c) => c.satuan)}>Satuan kapasitas produksi dicantumkan untuk setiap baris.</ChecklistItem>
            </div>
            <DocImage path={capacityDocumentPath} label="Dokumen Pembuktian Kapasitas" />
          </div>
        )}
        <CatatanVerifikator paragraphs={kapasitasParagraphs} />
        <NoteBox ok={capacityOk}>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26", margin: 0 }}>
            {capacity.length === 0
              ? "Data kapasitas produksi berdasarkan perizinan belum disampaikan oleh perusahaan."
              : capacityOk
                ? <>Berdasarkan hasil pemeriksaan, kapasitas produksi terpasang tidak melebihi kapasitas produksi yang tercantum dalam dokumen perizinan berusaha, sehingga data kapasitas produksi perusahaan dinyatakan <strong>memenuhi</strong> persyaratan sebagaimana dimaksud dalam Pasal 30 ayat (2) huruf a angka 1 Permenperin Nomor 27 Tahun 2025.</>
                : <>Berdasarkan hasil pemeriksaan, data kapasitas produksi perusahaan <strong>belum memenuhi</strong> persyaratan sebagaimana dimaksud dalam Pasal 30 ayat (2) huruf a angka 1 Permenperin Nomor 27 Tahun 2025.</>}
          </p>
        </NoteBox>
      </DetailPage>

      {/* 2. Kemampuan Produksi Setiap Mesin per Hari */}
      <DetailPage pageNo={p(3)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>2. Kemampuan Produksi Setiap Mesin per Hari</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap data kemampuan produksi setiap mesin per hari untuk memastikan bahwa mesin produksi yang
          dimiliki perusahaan tersusun sesuai alur proses produksi dan mampu mendukung target kapasitas produksi sesuai Pasal 30 ayat (2) huruf a
          angka 1 Permenperin Nomor 27 Tahun 2025.
        </p>
        <div style={{ fontSize: 10, fontWeight: 700, color: INK, textAlign: "center", marginBottom: 8 }}>Tabel Rincian Kemampuan Produksi Setiap Mesin per Hari</div>
        <div style={{ borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
            <thead>
              <tr style={{ background: ORANGE }}>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>NO</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>PROSES</th>
                <th colSpan={3} style={{ textAlign: "center", fontWeight: 700, padding: "5px 6px", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.4)" }}>NAMA MESIN</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>THN</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>KONDISI</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>QTY</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>KAP/JAM</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>JAM OP.</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>KAP/HARI</th>
                <th rowSpan={2} style={{ textAlign: "left", fontWeight: 700, padding: "7px 6px", color: "#fff", verticalAlign: "middle" }}>STATUS</th>
              </tr>
              <tr style={{ background: ORANGE }}>
                <th style={{ textAlign: "left", fontWeight: 600, padding: "5px 6px", color: "#fff", fontSize: 8 }}>JENIS MESIN</th>
                <th style={{ textAlign: "left", fontWeight: 600, padding: "5px 6px", color: "#fff", fontSize: 8 }}>MERK</th>
                <th style={{ textAlign: "left", fontWeight: 600, padding: "5px 6px", color: "#fff", fontSize: 8 }}>MODEL</th>
              </tr>
            </thead>
            <tbody>
              {machines.length === 0 && <EmptyRow colSpan={11} />}
              {machines.map((m, i) => {
                const meta = MACHINE_STATUS_META[m.status];
                return (
                  <Row key={m.id} index={i}>
                    <Td>{i + 1}</Td>
                    <Td>{m.proses || "—"}</Td>
                    <Td bold>{m.nama || "—"}</Td>
                    <Td>{m.merk || "—"}</Td>
                    <Td>{m.model || "—"}</Td>
                    <Td>{m.tahun || "—"}</Td>
                    <td style={{ padding: 6 }}>
                      {m.kondisi ? (
                        <span style={{ background: "#d2f6dd", color: "#0e3d24", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 8, display: "inline-block" }}>
                          {MACHINE_KONDISI_LABELS[m.kondisi]}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <Td>{m.quantity || "—"}</Td>
                    <Td>{m.kapasitasJam ? `${m.kapasitasJam} ${m.kapasitasJamSatuan}`.trim() : "—"}</Td>
                    <Td>{m.waktuBeroperasi ? `${m.waktuBeroperasi} Jam` : "—"}</Td>
                    <Td bold>{m.kapasitasPerHari ? `${m.kapasitasPerHari} ${m.kapasitasJamSatuan}`.trim() : "—"}</Td>
                    <td style={{ padding: 6 }}>
                      <span style={{ background: meta.bg, color: meta.color, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 8, display: "inline-block" }}>
                        {meta.label}
                      </span>
                    </td>
                  </Row>
                );
              })}
            </tbody>
          </table>
        </div>
      </DetailPage>

      {/* 2. (lanjutan) — narrative */}
      <DetailPage pageNo={p(4)} totalPages={totalPages} company={company}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: ORANGE_TEXT, margin: "20px 0 10px" }}>
          2. KEMAMPUAN PRODUKSI SETIAP MESIN PER HARI <span style={{ fontWeight: 400, color: MUTED_2 }}>(lanjutan)</span>
        </div>
        <CatatanVerifikator paragraphs={machineParagraphs} />
        <NoteBox ok={machines.length > 0}>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26", margin: 0 }}>
            {machines.length === 0
              ? "Data kemampuan produksi mesin per hari belum disampaikan oleh perusahaan."
              : "Berdasarkan hasil observasi lapangan, mesin yang tercantum pada daftar inventaris tersusun sesuai alur proses produksi dan kapasitas produksi masing-masing mesin telah dijadikan dasar dalam analisis kemampuan produksi perusahaan."}
          </p>
        </NoteBox>
      </DetailPage>

      {/* Jumlah Produksi Periode Sebelumnya */}
      <DetailPage pageNo={p(5)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Jumlah Produksi Periode Satu Tahun Sebelumnya</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap data jumlah produksi untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun
          sebelumnya sesuai dengan Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Jumlah Produksi Periode Satu Tahun Sebelumnya">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="16%">JENIS PRODUK</Th>
              <Th width="34%">DESKRIPSI PRODUK</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="14%">VOLUME</Th>
              <Th width="10%">SATUAN</Th>
              <Th>STATUS</Th>
            </tr>
          </thead>
          <tbody>
            {productionSebelumnya.length === 0 && <EmptyRow colSpan={7} />}
            {productionSebelumnya.map((r, i) => {
              const meta = PRODUCTION_QTY_STATUS_META[r.status];
              return (
                <Row key={r.key} index={i}>
                  <Td>{i + 1}</Td>
                  <Td bold>{r.jenisProduk || "—"}</Td>
                  <Td muted>{r.deskripsiProduk || "—"}</Td>
                  <Td>{r.hsCode || "—"}</Td>
                  <Td>{fmtNum(r.jumlah)}</Td>
                  <Td>{r.satuan || "—"}</Td>
                  <td style={{ padding: 8 }}>
                    <Badge color={meta.color} bg={meta.bg}>
                      {PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[r.status]}
                    </Badge>
                  </td>
                </Row>
              );
            })}
            {totalSebelumnya !== null && <TotalRow label="Total" colSpan={5} value={totalSebelumnya.toLocaleString("id-ID")} satuan={productionSebelumnya[0]?.satuan ?? ""} />}
          </tbody>
        </TableCard>
        <CatatanVerifikator paragraphs={produksiParagraphs} />
        {productionSebelumnyaConclusion.keterangan && <SanitizedHtml html={productionSebelumnyaConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={productionSebelumnyaOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {productionSebelumnya.length === 0
              ? "Data jumlah produksi periode sebelumnya belum disampaikan oleh perusahaan."
              : productionSebelumnyaConclusion.kesimpulan
                ? <SanitizedHtml html={productionSebelumnyaConclusion.kesimpulan} />
                : productionSebelumnyaOk
                  ? <>Data jumlah produksi telah diperiksa dan seluruhnya dinyatakan <strong>sesuai</strong>, sehingga memenuhi persyaratan administratif sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025.</>
                  : <>Terdapat data jumlah produksi periode sebelumnya yang <strong>belum diperiksa atau dinyatakan tidak sesuai</strong> oleh verifikator.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* Penggunaan Bahan Baku/Penolong Periode Sebelumnya */}
      <DetailPage pageNo={p(6)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Penggunaan Bahan Baku/Penolong Periode Satu Tahun Sebelumnya</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap data penggunaan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong
          untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun sebelumnya sesuai dengan Pasal 30 ayat (2) huruf a angka 2
          Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Penggunaan Bahan Baku dan/atau Bahan Penolong Periode Satu Tahun Sebelumnya">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="30%">URAIAN BARANG</Th>
              <Th width="14%">VOLUME</Th>
              <Th width="10%">SATUAN</Th>
              <Th width="20%">BAHAN BAKU UNTUK PRODUK</Th>
            </tr>
          </thead>
          <tbody>
            {rawMaterialUsage.length === 0 && <EmptyRow colSpan={6} />}
            {rawMaterialUsage.map((r, i) => (
              <Row key={r.id} index={i}>
                <Td>{i + 1}</Td>
                <Td>{r.hsCode || "—"}</Td>
                <Td muted>{r.hsDesc || "—"}</Td>
                <Td>{fmtNum(r.penggunaan)}</Td>
                <Td>{r.satuan || "—"}</Td>
                <Td bold>{r.productName || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        {usageHsGroups.length > 0 && (
          <TableCard>
            <thead>
              <tr style={{ background: "#1a9850" }}>
                <Th width="18%">HS CODE</Th>
                <Th width="42%">JENIS BAHAN</Th>
                <Th width="20%">TOTAL VOLUME</Th>
                <Th>SATUAN</Th>
              </tr>
            </thead>
            <tbody>
              {usageHsGroups.map((g) => (
                <tr key={g.hsCode} style={{ borderBottom: "1px solid #e2dccf" }}>
                  <td style={{ padding: "7px 9px" }}>{g.hsCode}</td>
                  <td style={{ padding: "7px 9px" }}>{g.jenis || "—"}</td>
                  <td style={{ padding: "7px 9px", fontWeight: 600 }}>{g.total.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "7px 9px" }}>{g.satuan || "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
        <CatatanVerifikator paragraphs={penggunaanParagraphs} />
        {penggunaanConclusion.keterangan && <SanitizedHtml html={penggunaanConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={penggunaanOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {rawMaterialUsage.length === 0
              ? "Data penggunaan bahan baku periode sebelumnya belum disampaikan oleh perusahaan."
              : penggunaanConclusion.kesimpulan
                ? <SanitizedHtml html={penggunaanConclusion.kesimpulan} />
                : penggunaanOk
                  ? <>Data penggunaan bahan baku dan/atau bahan penolong telah disusun lengkap berdasarkan jenis dan kode HS, sehingga memenuhi persyaratan administratif sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025.</>
                  : <>Terdapat data penggunaan bahan baku dan/atau bahan penolong yang <strong>belum lengkap</strong> diisi oleh perusahaan.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* Konversi Penggunaan Bahan Baku/Penolong per Jenis Produk */}
      <DetailPage pageNo={p(7)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Konversi Penggunaan Bahan Baku/Penolong per Jenis Produk</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap konversi penggunaan bahan baku dan/atau bahan penolong Tekstil dan/atau Produk Tekstil per
          jenis produk sebagai dasar perhitungan kebutuhan bahan baku sesuai dengan Pasal 30 ayat (2) huruf a angka 3 Permenperin Nomor 27 Tahun
          2025.
        </p>
        <TableCard title="Tabel Konversi Penggunaan Bahan Baku dan/atau Bahan Penolong per Jenis Produk">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="3%">NO</Th>
              <Th width="11%">JENIS PRODUK</Th>
              <Th width="8%">VOLUME PRODUKSI</Th>
              <Th width="6%">SATUAN</Th>
              <Th width="12%">NAMA ITEM/PRODUK</Th>
              <Th width="8%">HS CODE</Th>
              <Th width="9%">KATEGORI</Th>
              <Th width="8%">VOLUME KEBUTUHAN</Th>
              <Th width="6%">SATUAN</Th>
              <Th width="10%">RASIO KONVERSI</Th>
              <Th>KETERANGAN</Th>
            </tr>
          </thead>
          <tbody>
            {rawMaterialConversion.length === 0 && <EmptyRow colSpan={11} />}
            {rawMaterialConversion.map((r, i) => (
              <Row key={r.id} index={i}>
                <Td>{i + 1}</Td>
                <Td bold>{r.productName || "—"}</Td>
                <Td>{r.volumeProduksiJumlah || "—"}</Td>
                <Td muted>{r.volumeProduksiSatuan || "—"}</Td>
                <Td>{r.jenis || "—"}</Td>
                <Td muted>{r.hsCode || "—"}</Td>
                <Td muted>{RAW_MATERIAL_CONVERSION_KATEGORI_LABELS[r.kategori] || "—"}</Td>
                <Td>{r.volumeKebutuhanJumlah || "—"}</Td>
                <Td muted>{r.volumeKebutuhanSatuan || "—"}</Td>
                <Td>{r.rasioKonversi || "—"}</Td>
                <Td muted>{r.keterangan || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        <CatatanVerifikator paragraphs={konversiParagraphs} />
        {konversiConclusion.keterangan && <SanitizedHtml html={konversiConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={konversiOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {rawMaterialConversion.length === 0
              ? "Data konversi penggunaan bahan baku per jenis produk belum disampaikan oleh perusahaan."
              : konversiConclusion.kesimpulan
                ? <SanitizedHtml html={konversiConclusion.kesimpulan} />
                : konversiOk
                  ? <>Data konversi penggunaan bahan baku dan/atau bahan penolong telah memenuhi persyaratan administratif sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 3 Permenperin Nomor 27 Tahun 2025.</>
                  : <>Rasio konversi penggunaan bahan baku dan/atau bahan penolong <strong>belum dicantumkan lengkap</strong> oleh perusahaan.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* A. Rencana Produksi 1 Tahun ke Depan */}
      <DetailPage pageNo={p(8)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>A. Rencana Produksi 1 (Satu) Tahun ke Depan</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap jumlah rencana produksi Tekstil dan/atau Produk Tekstil untuk setiap jenis dan pos
          tarif/Harmonized System 1 (satu) tahun ke depan sesuai dengan Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Jumlah Rencana Produksi 1 (Satu) Tahun ke Depan">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="16%">JENIS PRODUK</Th>
              <Th width="34%">DESKRIPSI PRODUK</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="14%">VOLUME</Th>
              <Th width="10%">SATUAN</Th>
              <Th>STATUS</Th>
            </tr>
          </thead>
          <tbody>
            {productionRencana.length === 0 && <EmptyRow colSpan={7} />}
            {productionRencana.map((r, i) => {
              const meta = PRODUCTION_QTY_STATUS_META[r.status];
              return (
                <Row key={r.key} index={i}>
                  <Td>{i + 1}</Td>
                  <Td bold>{r.jenisProduk || "—"}</Td>
                  <Td muted>{r.deskripsiProduk || "—"}</Td>
                  <Td>{r.hsCode || "—"}</Td>
                  <Td>{fmtNum(r.jumlah)}</Td>
                  <Td>{r.satuan || "—"}</Td>
                  <td style={{ padding: 8 }}>
                    <Badge color={meta.color} bg={meta.bg}>
                      {PRODUCTION_QTY_VERIFICATION_STATUS_LABELS[r.status]}
                    </Badge>
                  </td>
                </Row>
              );
            })}
            {totalRencana !== null && <TotalRow label="Total" colSpan={5} value={totalRencana.toLocaleString("id-ID")} satuan={productionRencana[0]?.satuan ?? ""} />}
          </tbody>
        </TableCard>
        <CatatanVerifikator paragraphs={rencanaProduksiParagraphs} />
        {rencanaConclusion.keterangan && <SanitizedHtml html={rencanaConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={productionRencanaOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {productionRencana.length === 0
              ? "Data rencana produksi 1 tahun ke depan belum disampaikan oleh perusahaan."
              : rencanaConclusion.kesimpulan
                ? <SanitizedHtml html={rencanaConclusion.kesimpulan} />
                : productionRencanaOk
                  ? <>Dokumen rencana produksi 1 (satu) tahun ke depan telah memuat informasi mengenai jenis produk, volume produksi, dan klasifikasi HS, sehingga persyaratan sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025 dinyatakan telah <strong>memenuhi</strong> ketentuan.</>
                  : <>Terdapat data rencana produksi 1 tahun ke depan yang <strong>belum diperiksa atau dinyatakan tidak sesuai</strong> oleh verifikator.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* B. Rencana Kebutuhan Bahan Baku/Penolong 1 Tahun ke Depan */}
      <DetailPage pageNo={p(9)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>B. Rencana Kebutuhan Bahan Baku/Penolong 1 (Satu) Tahun ke Depan</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap jumlah rencana kebutuhan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan
          penolong untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun ke depan sesuai dengan Pasal 30 ayat (2) huruf a angka 4
          Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Rencana Kebutuhan Bahan Baku dan/atau Bahan Penolong 1 (Satu) Tahun ke Depan">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="30%">URAIAN BARANG</Th>
              <Th width="14%">VOLUME</Th>
              <Th width="10%">SATUAN</Th>
              <Th width="20%">BAHAN BAKU UNTUK PRODUK</Th>
            </tr>
          </thead>
          <tbody>
            {rawMaterialUsage.length === 0 && <EmptyRow colSpan={6} />}
            {rawMaterialUsage.map((r, i) => (
              <Row key={r.id} index={i}>
                <Td>{i + 1}</Td>
                <Td>{r.hsCode || "—"}</Td>
                <Td muted>{r.hsDesc || "—"}</Td>
                <Td>{fmtNum(r.rencanaKebutuhan)}</Td>
                <Td>{r.satuan || "—"}</Td>
                <Td bold>{r.productName || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        {kebutuhanHsGroups.length > 0 && (
          <TableCard title="Rekapitulasi Kebutuhan Bahan Baku 1 (Satu) Tahun ke Depan">
            <thead>
              <tr style={{ background: "#1a9850" }}>
                <Th width="18%">HS CODE</Th>
                <Th width="42%">URAIAN BARANG</Th>
                <Th width="20%">TOTAL VOLUME</Th>
                <Th>SATUAN</Th>
              </tr>
            </thead>
            <tbody>
              {kebutuhanHsGroups.map((g) => (
                <tr key={g.hsCode} style={{ borderBottom: "1px solid #e2dccf" }}>
                  <td style={{ padding: "7px 9px" }}>{g.hsCode}</td>
                  <td style={{ padding: "7px 9px" }}>{g.jenis || "—"}</td>
                  <td style={{ padding: "7px 9px", fontWeight: 600 }}>{g.total.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "7px 9px" }}>{g.satuan || "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
        <CatatanVerifikator paragraphs={rencanaKebutuhanParagraphs} />
        {rencanaKebutuhanConclusion.keterangan && <SanitizedHtml html={rencanaKebutuhanConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={rencanaKebutuhanOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {rawMaterialUsage.length === 0
              ? "Data rencana kebutuhan bahan baku belum disampaikan oleh perusahaan."
              : rencanaKebutuhanConclusion.kesimpulan
                ? <SanitizedHtml html={rencanaKebutuhanConclusion.kesimpulan} />
                : rencanaKebutuhanOk
                  ? <>Dokumen rencana kebutuhan bahan baku dan/atau bahan penolong telah memuat informasi mengenai jenis bahan baku, klasifikasi HS, dan volume kebutuhan, sehingga persyaratan sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025 dinyatakan telah <strong>memenuhi</strong> ketentuan.</>
                  : <>Terdapat data rencana kebutuhan bahan baku dan/atau bahan penolong yang <strong>belum lengkap</strong> diisi oleh perusahaan.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* Jumlah Penjualan Dalam Negeri dan Ekspor */}
      <DetailPage pageNo={p(10)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Jumlah Penjualan Dalam Negeri dan Ekspor 1 Tahun Sebelumnya</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap jumlah penjualan di dalam negeri dan tujuan ekspor untuk setiap jenis dan pos
          tarif/Harmonized System 1 (satu) tahun sebelumnya sesuai dengan Pasal 30 ayat (2) huruf a angka 5 Permenperin Nomor 27 Tahun 2025.
        </p>
        <TableCard title="Tabel Rekapitulasi Penjualan Dalam Negeri">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="20%">JENIS PRODUKSI</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="34%">URAIAN BARANG</Th>
              <Th width="16%">VOLUME PENJUALAN</Th>
              <Th>SATUAN</Th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && <EmptyRow colSpan={6} />}
            {sales.map((s, i) => (
              <Row key={s.id} index={i}>
                <Td>{i + 1}</Td>
                <Td bold>{s.productName || "—"}</Td>
                <Td>{s.hsCode || "—"}</Td>
                <Td muted>{s.deskripsi || "—"}</Td>
                <Td>{fmtNum(s.dalamNegeri)}</Td>
                <Td>{s.satuan || "—"}</Td>
              </Row>
            ))}
            {totalDalamNegeri !== null && <TotalRow label="Total Penjualan Dalam Negeri" colSpan={4} value={totalDalamNegeri.toLocaleString("id-ID")} satuan={sales[0]?.satuan ?? ""} />}
          </tbody>
        </TableCard>
        <TableCard title="Tabel Rekapitulasi Penjualan Luar Negeri">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="18%">JENIS PRODUKSI</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="14%">VOLUME PENJUALAN</Th>
              <Th width="10%">SATUAN</Th>
              <Th>NEGARA TUJUAN</Th>
            </tr>
          </thead>
          <tbody>
            {salesExport.length === 0 && <EmptyRow colSpan={6} />}
            {salesExport.map((s, i) => (
              <Row key={s.id} index={i}>
                <Td>{i + 1}</Td>
                <Td bold>{s.productName || "—"}</Td>
                <Td>{s.hsCode || "—"}</Td>
                <Td>{fmtNum(s.luarNegeri)}</Td>
                <Td>{s.satuan || "—"}</Td>
                <Td>{s.negaraTujuan || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        <CatatanVerifikator paragraphs={penjualanParagraphs} />
        {penjualanConclusion.keterangan && <SanitizedHtml html={penjualanConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={salesOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {sales.length === 0
              ? "Data penjualan dalam negeri dan ekspor belum disampaikan oleh perusahaan."
              : penjualanConclusion.kesimpulan
                ? <SanitizedHtml html={penjualanConclusion.kesimpulan} />
                : <>Data penjualan dalam negeri{salesExport.length > 0 ? " dan ekspor" : ""} telah disampaikan berdasarkan jenis produk dan kode HS, sehingga memenuhi persyaratan administratif sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 5 Permenperin Nomor 27 Tahun 2025.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* Stok Terkini Bahan Baku/Penolong */}
      <DetailPage pageNo={p(11)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Jumlah Stok Terkini Bahan Baku/Penolong</h1>
        <p style={{ fontSize: 10.5, lineHeight: 1.55, color: "#1f2f26", margin: "0 0 12px", maxWidth: 920 }}>
          Verifikator melakukan pemeriksaan terhadap jumlah stok terkini Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan
          penolong untuk setiap jenis dan pos tarif/Harmonized System sesuai dengan Pasal 30 ayat (2) huruf a angka 6 Permenperin Nomor 27 Tahun
          2025.
        </p>
        <TableCard title="Tabel Stok Terkini Bahan Baku dan/atau Bahan Penolong">
          <thead>
            <tr style={{ background: ORANGE }}>
              <Th width="4%">NO</Th>
              <Th width="12%">HS CODE</Th>
              <Th width="30%">URAIAN BARANG</Th>
              <Th width="14%">STOK TERKINI</Th>
              <Th width="10%">SATUAN</Th>
              <Th width="20%">BAHAN BAKU UNTUK PRODUK</Th>
            </tr>
          </thead>
          <tbody>
            {rawMaterialUsage.length === 0 && <EmptyRow colSpan={6} />}
            {rawMaterialUsage.map((r, i) => (
              <Row key={r.id} index={i}>
                <Td>{i + 1}</Td>
                <Td>{r.hsCode || "—"}</Td>
                <Td muted>{r.hsDesc || "—"}</Td>
                <Td>{fmtNum(r.dataStock)}</Td>
                <Td>{r.satuan || "—"}</Td>
                <Td bold>{r.productName || "—"}</Td>
              </Row>
            ))}
          </tbody>
        </TableCard>
        <CatatanVerifikator paragraphs={stokParagraphs} />
        {stokConclusion.keterangan && <SanitizedHtml html={stokConclusion.keterangan} style={{ marginBottom: 10 }} />}
        <NoteBox ok={stokOk}>
          <div style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26" }}>
            {rawMaterialUsage.length === 0
              ? "Data stok terkini bahan baku belum disampaikan oleh perusahaan."
              : stokConclusion.kesimpulan
                ? <SanitizedHtml html={stokConclusion.kesimpulan} />
                : stokOk
                  ? <>Data stok bahan baku dan/atau bahan penolong terkini telah disampaikan lengkap berdasarkan jenis material dan kode HS, sehingga memenuhi persyaratan administratif sebagaimana diatur dalam Pasal 30 ayat (2) huruf a angka 6 Permenperin Nomor 27 Tahun 2025.</>
                  : <>Terdapat data stok bahan baku dan/atau bahan penolong terkini yang <strong>belum lengkap</strong> diisi oleh perusahaan.</>}
          </div>
        </NoteBox>
      </DetailPage>

      {/* C. Kesimpulan Akhir */}
      <DetailPage pageNo={p(12)} totalPages={totalPages} company={company}>
        <SectionEyebrow />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>C. Kesimpulan Akhir Kemampuan Produksi</h1>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: INK, textAlign: "center", marginBottom: 8 }}>Tabel Rekapitulasi Hasil Pemeriksaan Kemampuan Produksi</div>
        <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: ORANGE }}>
                <Th width="4%">NO</Th>
                <Th width="36%">ASPEK KEMAMPUAN PRODUKSI</Th>
                <Th width="20%">DATA</Th>
                <Th width="18%">STATUS</Th>
                <Th>REFERENSI</Th>
              </tr>
            </thead>
            <tbody>
              {recapItems.map((item, i) => (
                <tr key={item.no} style={{ background: i % 2 === 0 ? "#fff" : "#eef1f5", borderBottom: "1px solid #e2dccf" }}>
                  <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>{item.no}</td>
                  <td style={{ padding: 10, verticalAlign: "top", fontWeight: 600 }}>{item.label}</td>
                  <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>{item.hasData ? item.data : "—"}</td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <RecapBadge hasData={item.hasData} ok={item.ok} />
                  </td>
                  <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>Pasal 30 ayat (2) huruf a {item.angka}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <NoteBox ok={overallOk}>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: "#1f2f26", margin: 0 }}>
            {overallOk ? (
              <>Berdasarkan hasil pemeriksaan administratif di atas, kemampuan produksi {company} dinyatakan <strong>memenuhi</strong> persyaratan sebagaimana diatur dalam Pasal 30 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025.</>
            ) : (
              <>Berdasarkan hasil pemeriksaan administratif di atas, kemampuan produksi {company} <strong>belum memenuhi</strong> seluruh persyaratan sebagaimana diatur dalam Pasal 30 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025 dan memerlukan tindak lanjut.</>
            )}
          </p>
        </NoteBox>
      </DetailPage>

      {/* Visual summary */}
      <section className="rd-sheet" style={{ background: NAVY, color: "#fff", padding: "36px 44px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PageHead dark />
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 4px" }}>
          <div style={{ width: 22, height: 2, background: ORANGE_LIGHT }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#f28951" }}>BAB {babLabel} · RINGKASAN VISUAL</div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Kemampuan Produksi</h1>
        <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#b8c0cc", margin: "0 0 20px", maxWidth: 640 }}>
          Rekap visual hasil pemeriksaan administratif kemampuan produksi {company}.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div style={{ background: "#0d1e30", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
              {recapCompliant} / {recapItems.length}
            </div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#8a97a8" }}>ASPEK MEMENUHI</div>
          </div>
          <div style={{ background: "#d2f6dd", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0e3d24", marginBottom: 4 }}>
              {Math.round((recapCompliant / recapItems.length) * 100)}%
            </div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#2e6b48" }}>TINGKAT KESESUAIAN</div>
          </div>
          <div style={{ background: "#0d1e30", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{recapItems.length - recapCompliant}</div>
            <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#8a97a8" }}>PERLU TINDAK LANJUT</div>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#f28951", marginBottom: 10 }}>ASPEK YANG DIPERIKSA</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {recapItems.map((item) => (
            <div key={item.no} style={{ background: "#0d1e30", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: item.hasData ? (item.ok ? GREEN : "#c1361f") : "#4a5568",
                  color: "#fff",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.hasData ? (item.ok ? "✓" : "✕") : "—"}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: 9, color: "#8a97a8" }}>{item.hasData ? item.data : "Belum ada data"}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: ORANGE, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Kesimpulan: Kemampuan Produksi</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{overallOk ? "MEMENUHI" : "PERLU TINDAK LANJUT"}</div>
        </div>
        <PageFoot companyName={company} pageNo={p(13)} totalPages={totalPages} dark />
      </section>
    </>
  );
}
