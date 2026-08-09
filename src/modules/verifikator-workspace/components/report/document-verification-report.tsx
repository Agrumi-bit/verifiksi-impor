"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import { DOC_VERIFICATION_STATUS_LABELS, type DocVerificationStatusValue } from "../../status";
import { COMPLIANCE_SECTION_DEFS, getComplianceDef } from "../../document-compliance-defs";
import {
  LEGALITAS_DOCUMENTS,
  PERPAJAKAN_DOCUMENTS,
  TENAGA_KERJA_DOCUMENTS,
  SURAT_PERNYATAAN_DOCUMENTS,
  buildLocationDocuments,
  buildElectricityDocuments,
  type NarrativeContext,
  type DocDetail,
} from "../../report-narrative";
import type { ApplicationWizardValues, MachineKondisiValue } from "@/modules/applications/schema";
import { ProductionCapabilityChapter, PRODUCTION_CAPABILITY_CHAPTER_PAGE_COUNT } from "./production-capability-chapter";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";

const FONT_LINKS = (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </>
);

export const INK = "#1a1a1a";
export const CREAM = "#f9f3eb";
export const NAVY = "#04101f";
export const ORANGE = "#ed7b2f";
export const ORANGE_TEXT = "#c96a1f";
export const ORANGE_LIGHT = "#e88a3d";
export const MINT = "#9fd4b2";
export const MINT_INK = "#1f2f26";
export const GREEN = "#1a9850";
export const CARD_BORDER = "#e8ddcc";
export const MUTED = "#4a4238";
export const MUTED_2 = "#a89b85";
// Landscape pages are shorter than portrait (210mm vs 297mm tall), so fewer
// rows fit per page than the earlier portrait-tuned counts allowed.
const PRODUCT_ROWS_PER_PAGE = 3;
const RAW_MATERIAL_ROWS_PER_PAGE = 4;

type DocumentRow = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  hasDocument: boolean;
  status: DocVerificationStatusValue;
  note: string | null;
  verifiedAt: string | null;
};

export type ReportData = {
  assignmentNumber: string;
  applicationNumber: string;
  verificationType: string;
  status: string;
  validationNotes: string | null;
  validatedAt: string | null;
  signaturePath: string | null;
  signatureDate: string | null;
  companyName: string;
  businessAddress: string | null;
  verifikatorName: string | null;
  technicalReviewerName: string | null;
  documents: DocumentRow[];
  machines: MachineRow[];
  products: ProductRow[];
  rawMaterials: RawMaterialRow[];
  capacity: CapacityRow[];
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
  payload: ApplicationWizardValues;
  companySkt: { sktNumber: string | null; sktIssuer: string | null; sktDate: string | null; sktDocumentPath: string | null } | null;
};

export type ProductRow = {
  id: string;
  kategori: string;
  materialType: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  estimatedVolume: string;
  volumeUnit: string;
  intendedUse: string;
  photoPath: string | null;
  status: "PENDING" | "VERIFIED" | "NEED_REVISION" | "REJECTED";
};

export type RawMaterialRow = {
  id: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  deskripsi: string;
  photoPath: string | null;
};

export type MachineRow = {
  id: string;
  nama: string;
  proses: string;
  merk: string;
  model: string;
  tahun: string;
  quantity: string;
  kapasitas: string;
  kapasitasSatuan: string;
  kapasitasJam: string;
  kapasitasJamSatuan: string;
  waktuBeroperasi: string;
  kapasitasPerHari: string;
  kondisi: MachineKondisiValue | "";
  power: string;
  input: string;
  output: string;
  photoMesinPath: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type CapacityRow = {
  productId: string;
  jenisProduk: string;
  hsCode: string;
  berdasarkanIzin: string;
  kapasitasTerpasang: string;
  satuan: string;
};

export type ProductionQtyRow = {
  key: string;
  section: "sebelumnya" | "rencana";
  productId: string;
  jenisProduk: string;
  deskripsiProduk: string;
  hsCode: string;
  jumlah: string;
  satuan: string;
  status: "PENDING" | "SESUAI" | "TIDAK_SESUAI";
};

export type RawMaterialUsageRow = {
  id: string;
  rawMaterialId: string;
  jenis: string;
  hsCode: string;
  hsDesc: string;
  productName: string;
  penggunaan: string;
  dataStock: string;
  rencanaKebutuhan: string;
  satuan: string;
};

export type RawMaterialConversionRow = {
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

export type SalesRow = {
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

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `/api/files?path=${encodeURIComponent(path)}`;
}

/** Rasterized first-page preview for a PDF — real visual content without embedding the browser's PDF viewer chrome. */
function thumbnailUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `/api/files/thumbnail?path=${encodeURIComponent(path)}`;
}

export function DocImage({
  path,
  label,
  aspectRatio = "0.77",
}: {
  path: string | null | undefined;
  label: string;
  /** width/height ratio, e.g. "0.77" for A4-like documents, "18/11" for a physical card like NPWP. */
  aspectRatio?: string;
}) {
  const url = fileUrl(path);
  const isImage = path ? /\.(jpg|jpeg|png)$/i.test(path) : false;
  const [thumbFailed, setThumbFailed] = useState(false);
  if (!url) {
    return (
      <div
        style={{
          width: 200,
          aspectRatio,
          borderRadius: 10,
          background: "#fff",
          border: "1px dashed #c8dbc9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10.5,
          color: "#5a7a63",
          textAlign: "center",
          padding: 10,
        }}
      >
        Dokumen belum diunggah
      </div>
    );
  }
  const showPdfThumb = !isImage && !thumbFailed;
  return (
    <div style={{ width: 200, aspectRatio, borderRadius: 10, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
      {isImage || showPdfThumb ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isImage ? url : (thumbnailUrl(path) as string)}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={isImage ? undefined : () => setThumbFailed(true)}
          />
        </a>
      ) : (
        // A PDF <iframe> pulls in the browser's native viewer chrome — including its "digitally
        // signed / signature couldn't be verified" infobar for signed documents — which can't be
        // suppressed from the embedding page. Rendered thumbnail failed too (e.g. encrypted PDF),
        // so fall back to a plain link.
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#5a7a63",
            textDecoration: "none",
          }}
        >
          <MaterialIcon name="picture_as_pdf" style={{ fontSize: 32 }} />
          <span style={{ fontSize: 10, textAlign: "center", padding: "0 10px" }}>Lihat Dokumen PDF</span>
        </a>
      )}
    </div>
  );
}

export function Badge({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 8.5, fontWeight: 700, padding: "2px 8px", borderRadius: 9, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

const STATUS_BADGE: Record<DocVerificationStatusValue, { bg: string; color: string }> = {
  PENDING: { bg: "#ffebce", color: "#7a4a10" },
  VALID: { bg: "#d2f6dd", color: "#0e3d24" },
  NEED_REVISION: { bg: "#ffebce", color: "#7a4a10" },
  REJECTED: { bg: "#ffe0dc", color: "#7a1f14" },
  NOT_APPLICABLE: { bg: "#ede9fe", color: "#5b21b6" },
};

/** Header row shared by every page — accent + colors flip for the dark BAB-divider pages. */
export function PageHead({ dark }: { dark?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            background: dark ? "#0a3a3a" : NAVY,
            border: dark ? `1px solid ${ORANGE_LIGHT}` : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
            color: dark ? ORANGE_LIGHT : "#fff",
            borderRadius: 6,
          }}
        >
          IV
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: dark ? "#fff" : INK }}>INDUSTRIALVERIFY</div>
      </div>
      <div
        style={{
          border: `1px solid ${dark ? "#4a5568" : ORANGE_LIGHT}`,
          color: dark ? "#cbd5e0" : ORANGE_TEXT,
          padding: "5px 12px",
          fontSize: 11,
          letterSpacing: "0.05em",
          borderRadius: 20,
        }}
      >
        INTERNAL — TERBATAS
      </div>
    </div>
  );
}

export function PageFoot({ companyName, pageNo, totalPages, dark }: { companyName: string; pageNo: number; totalPages: number; dark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: dark ? "#8a97a8" : MUTED_2,
        borderTop: `1px solid ${dark ? "#1e2a38" : CARD_BORDER}`,
        paddingTop: 12,
        marginTop: 12,
      }}
    >
      <div>Laporan Verifikasi Dokumen — {companyName}</div>
      <div>
        {pageNo} dari {totalPages}
      </div>
    </div>
  );
}

export function PageShell({
  pageNo,
  totalPages,
  companyName,
  id,
  dark,
  landscape,
  children,
}: {
  pageNo: number;
  totalPages: number;
  companyName: string;
  id?: string;
  dark?: boolean;
  landscape?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={landscape ? "rd-sheet rd-sheet-landscape" : "rd-sheet"}
      id={id}
      style={{ background: dark ? NAVY : CREAM, color: dark ? "#fff" : INK, padding: "40px 48px", display: "flex", flexDirection: "column" }}
    >
      <PageHead dark={dark} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</div>
      <PageFoot companyName={companyName} pageNo={pageNo} totalPages={totalPages} dark={dark} />
    </section>
  );
}

export function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: dark ? "#f28951" : ORANGE_TEXT, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function ComplianceTable({ rows }: { rows: { key: string; label: string }[] }) {
  return (
    <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: ORANGE }}>
            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "4%" }}>NO</th>
            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "18%" }}>JENIS DOKUMEN</th>
            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "9%" }}>PERSYARATAN</th>
            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "30%" }}>REFERENSI REGULASI</th>
            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>KETERANGAN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const def = getComplianceDef(row.key);
            if (!def) return null;
            const wajib = def.persyaratan.startsWith("Wajib");
            return (
              <tr key={row.key} style={{ background: "#fff", borderBottom: i < rows.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", verticalAlign: "top", fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <Badge color={wajib ? "#7a1f14" : "#7a4a10"} bg={wajib ? "#ffe0dc" : "#ffebce"}>
                    {def.persyaratan}
                  </Badge>
                </td>
                <td style={{ padding: "8px 10px", verticalAlign: "top", lineHeight: 1.4, color: MUTED }}>{def.referensi}</td>
                <td style={{ padding: "8px 10px", verticalAlign: "top", lineHeight: 1.4, color: MUTED }}>{def.keterangan}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One field row inside a document detail's green panel — pill label + white value box with a checkmark. */
function FieldRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK }}>{label}</div>
        <Badge color="#fff" bg={ok ? GREEN : "#c1361f"}>
          {ok ? "Sesuai" : "Belum Diisi"}
        </Badge>
      </div>
      <div
        style={{
          background: ok ? "#fff" : "#ffe0dc",
          border: `1px solid ${ok ? GREEN : "#c1361f"}`,
          borderRadius: 14,
          padding: "8px 14px",
          fontSize: 11,
          fontWeight: 600,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>{value}</span>
        <span style={{ color: ok ? GREEN : "#c1361f", flexShrink: 0 }}>{ok ? "✓" : "✕"}</span>
      </div>
    </div>
  );
}

const MACHINE_STATUS_META: Record<MachineRow["status"], { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#f0e6d4", color: "#8a7455", label: "Belum Diperiksa" },
  APPROVED: { bg: "#d2f6dd", color: "#0e3d24", label: "Approved" },
  REJECTED: { bg: "#ffe0dc", color: "#7a1f14", label: "Rejected" },
};

export function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: CREAM, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 8.5, letterSpacing: "0.04em", color: MUTED_2, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: INK }}>{value || "—"}</div>
    </div>
  );
}

/** Real-fields-only prose, tied to the machine's actual verifikator review status rather than assuming good condition. */
function machineUraian(m: MachineRow, company: string): string {
  const jumlahText = m.quantity ? `${m.quantity} unit` : "sejumlah unit";
  const namaText = m.nama || m.proses || "mesin produksi";
  const merkText = m.merk ? ` merk ${m.merk}` : "";
  const modelText = m.model ? `, model ${m.model}` : "";
  const tahunText = m.tahun ? `, tahun pembuatan ${m.tahun}` : "";
  const kapasitasParts: string[] = [];
  if (m.kapasitas) kapasitasParts.push(`kapasitas produksi ${m.kapasitas} ${m.kapasitasSatuan || ""}`.trim());
  if (m.kapasitasJam) kapasitasParts.push(`kapasitas ${m.kapasitasJam} ${m.kapasitasJamSatuan || ""} per jam`.trim());
  if (m.power) kapasitasParts.push(`konsumsi daya ${m.power}`);
  const kapasitasText = kapasitasParts.length > 0 ? ` Mesin ini memiliki ${kapasitasParts.join(", ")}.` : "";
  const inputOutputText = m.input && m.output ? ` Mesin digunakan untuk mengolah ${m.input} menjadi ${m.output}.` : "";
  const statusText =
    m.status === "APPROVED"
      ? "Berdasarkan hasil observasi lapangan, mesin telah diperiksa dan dinyatakan dalam kondisi operasional sesuai dengan hasil verifikasi."
      : m.status === "REJECTED"
        ? "Berdasarkan hasil observasi lapangan, ditemukan ketidaksesuaian pada mesin ini sehingga belum dinyatakan memenuhi hasil verifikasi."
        : "Mesin ini belum diverifikasi melalui observasi lapangan sehingga kondisi operasional belum dapat dipastikan.";
  return `Berdasarkan data yang disampaikan, ${company} memiliki ${jumlahText} mesin ${namaText}${merkText}${modelText}${tahunText} yang digunakan pada proses ${m.proses || "produksi"}.${kapasitasText}${inputOutputText} ${statusText}`;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function MachineChapter({
  machines,
  company,
  chapterIdx,
  startPage,
  totalPages,
}: {
  machines: MachineRow[];
  company: string;
  chapterIdx: number;
  startPage: number;
  totalPages: number;
}) {
  const approved = machines.filter((m) => m.status === "APPROVED").length;
  const babLabel = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][chapterIdx + 1] ?? String(chapterIdx + 1);
  const photoPages = chunk(machines, 2);

  return (
    <>
      <section
        className="rd-sheet"
        id="bab-mesin"
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
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: "0 0 18px" }}>Data Mesin dan Peralatan Produksi</h1>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#b8c0cc", margin: "0 0 22px" }}>
            Observasi lapangan terhadap mesin dan peralatan produksi yang digunakan {company} pada proses produksi, mencakup jenis proses,
            spesifikasi mesin, dan kondisi operasional.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: "#0d1e30", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#8a97a8", marginBottom: 8 }}>JUMLAH MESIN</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{machines.length}</div>
            </div>
            <div style={{ background: "#d2f6dd", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#2e6b48", marginBottom: 8 }}>APPROVED</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0e3d24" }}>{approved}</div>
            </div>
            <div style={{ background: "#0d1e30", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#8a97a8", marginBottom: 8 }}>PERLU TINDAK LANJUT</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{machines.length - approved}</div>
            </div>
          </div>
        </div>
      </section>

      <PageShell pageNo={startPage + 1} totalPages={totalPages} companyName={company}>
        <Eyebrow>DATA MESIN DAN PERALATAN PRODUKSI</Eyebrow>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Data Mesin</h1>
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ background: ORANGE }}>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "4%" }}>NO</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "17%" }}>PROSES</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "15%" }}>JENIS MESIN</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "10%" }}>MERK</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "11%" }}>MODEL</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "8%" }}>TAHUN</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "9%" }}>QUANTITY</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m, i) => {
                const meta = MACHINE_STATUS_META[m.status];
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? "#eef1f5" : "#fff", borderBottom: "1px solid #e2dccf" }}>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{i + 1}</td>
                    <td style={{ padding: "11px 10px", fontWeight: 700 }}>{m.proses || "—"}</td>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{m.nama || "—"}</td>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{m.merk || "—"}</td>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{m.model || "—"}</td>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{m.tahun || "—"}</td>
                    <td style={{ padding: "11px 10px", color: MUTED }}>{m.quantity || "—"}</td>
                    <td style={{ padding: "11px 10px" }}>
                      <Badge color={meta.color} bg={meta.bg}>
                        {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageShell>

      {photoPages.map((pair, pageIdx) => (
        <PageShell key={pageIdx} pageNo={startPage + 2 + pageIdx} totalPages={totalPages} companyName={company}>
          <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: "center", margin: "4px 0 16px" }}>Photo Mesin</h1>
          {pair.map((m) => (
            <div key={m.id} style={{ border: `1px solid ${ORANGE_LIGHT}`, borderRadius: 16, padding: "18px 20px", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
                <DocImage path={m.photoMesinPath} label={m.nama || m.proses} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{m.proses || "—"}</div>
                    <Badge color={MACHINE_STATUS_META[m.status].color} bg={MACHINE_STATUS_META[m.status].bg}>
                      {MACHINE_STATUS_META[m.status].label}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8 }}>{m.nama || "—"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MiniField label="MERK" value={m.merk} />
                    <MiniField label="MODEL" value={m.model} />
                    <MiniField label="TAHUN PEMBUATAN" value={m.tahun} />
                    <MiniField label="QUANTITY" value={m.quantity} />
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                <MiniField label="KAPASITAS PRODUKSI" value={m.kapasitas ? `${m.kapasitas} ${m.kapasitasSatuan}`.trim() : ""} />
                <MiniField label="KAPASITAS PRODUKSI PER JAM" value={m.kapasitasJam ? `${m.kapasitasJam} ${m.kapasitasJamSatuan}`.trim() : ""} />
                <MiniField label="POWER CONSUMPTION" value={m.power} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <MiniField label="INPUT / RAW MATERIAL" value={m.input} />
                <MiniField label="OUTPUT / PRODUK" value={m.output} />
              </div>
              <div style={{ border: "1px dashed #b8ab90", borderLeft: "4px solid #1a9850", borderRadius: 6, padding: "9px 12px", marginTop: 10, background: "#fff" }}>
                <p style={{ fontSize: 9.5, lineHeight: 1.5, color: INK, margin: 0 }}>
                  <strong>Uraian observasi:</strong> {machineUraian(m, company)}
                </p>
              </div>
            </div>
          ))}
        </PageShell>
      ))}
    </>
  );
}

const PRODUCT_STATUS_META: Record<ProductRow["status"], { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#eef0f6", color: "#5b6478", label: "Belum Diperiksa" },
  VERIFIED: { bg: "#e1f3ea", color: "#0f7a4d", label: "Verified" },
  NEED_REVISION: { bg: "#fdedd6", color: "#b3650c", label: "Need Revision" },
  REJECTED: { bg: "#fbe4e4", color: "#c1352b", label: "Rejected" },
};

export function TableThumb({ path, label }: { path: string | null | undefined; label: string }) {
  const url = fileUrl(path);
  const isImage = path ? /\.(jpg|jpeg|png)$/i.test(path) : false;
  const [thumbFailed, setThumbFailed] = useState(false);
  if (!url) {
    return <span style={{ fontSize: 9.5, color: MUTED_2 }}>Belum diunggah</span>;
  }
  const showPdfThumb = !isImage && !thumbFailed;
  return (
    <div style={{ width: 50, height: 50, borderRadius: 6, overflow: "hidden", background: "#fff", border: `1px solid ${CARD_BORDER}` }}>
      {isImage || showPdfThumb ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isImage ? url : (thumbnailUrl(path) as string)}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={isImage ? undefined : () => setThumbFailed(true)}
          />
        </a>
      ) : (
        // See DocImage — a PDF <iframe> drags in the browser's signature-verification infobar.
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7a63" }}
        >
          <MaterialIcon name="picture_as_pdf" style={{ fontSize: 20 }} />
        </a>
      )}
    </div>
  );
}

function ProductChapter({
  products,
  rawMaterials,
  company,
  chapterIdx,
  startPage,
  totalPages,
}: {
  products: ProductRow[];
  rawMaterials: RawMaterialRow[];
  company: string;
  chapterIdx: number;
  startPage: number;
  totalPages: number;
}) {
  const babLabel = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][chapterIdx + 1] ?? String(chapterIdx + 1);
  const productPages = chunk(products, PRODUCT_ROWS_PER_PAGE);
  const rawMaterialPages = chunk(rawMaterials, RAW_MATERIAL_ROWS_PER_PAGE);

  return (
    <>
      <section
        className="rd-sheet rd-sheet-landscape"
        id="bab-produk"
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
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: "0 0 18px" }}>Data Produk</h1>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#b8c0cc", margin: 0 }}>
            Klasifikasi produk yang diproduksi {company} beserta deskripsi produk dan pos tarif/Harmonized System (HS Code) yang berlaku, serta
            bahan baku yang digunakan dalam proses produksi.
          </p>
        </div>
      </section>

      {productPages.map((rows, pageIdx) => (
        <PageShell key={`product-${pageIdx}`} pageNo={startPage + 1 + pageIdx} totalPages={totalPages} companyName={company} landscape>
          <Eyebrow>DATA PRODUK</Eyebrow>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "0 0 10px" }}>Tabel Produk yang Diproduksi</div>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: ORANGE }}>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "3%" }}>NO</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "11%" }}>JENIS PRODUK</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "16%" }}>DESKRIPSI PRODUK</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "8%" }}>HS CODE</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "29%" }}>DESKRIPSI HS CODE</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff", width: "14%" }}>PHOTO PRODUK</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", color: "#fff" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const meta = PRODUCT_STATUS_META[p.status];
                  return (
                    <tr key={p.id} style={{ background: "#fff", borderBottom: "1px solid #e2dccf" }}>
                      <td style={{ padding: "12px", verticalAlign: "top", color: MUTED }}>{pageIdx * PRODUCT_ROWS_PER_PAGE + i + 1}</td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700 }}>{p.materialType || "—"}</div>
                        {p.kategori && <div style={{ fontSize: 9.5, color: MUTED_2, marginTop: 2 }}>{p.kategori}</div>}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top", lineHeight: 1.5, color: MUTED }}>{p.deskripsi || "—"}</td>
                      <td style={{ padding: "12px", verticalAlign: "top", color: MUTED }}>{p.hsCode || "—"}</td>
                      <td style={{ padding: "12px", verticalAlign: "top", lineHeight: 1.5, color: MUTED }}>{p.hsDesc || "—"}</td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <TableThumb path={p.photoPath} label={p.materialType} />
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <Badge color={meta.color} bg={meta.bg}>
                          {meta.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageShell>
      ))}

      {rawMaterialPages.map((rows, pageIdx) => (
        <PageShell key={`rawmat-${pageIdx}`} pageNo={startPage + 1 + productPages.length + pageIdx} totalPages={totalPages} companyName={company} landscape>
          <Eyebrow>DATA PRODUK</Eyebrow>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "0 0 10px" }}>Tabel Bahan Baku yang Digunakan</div>
          <div style={{ borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
              <thead>
                <tr style={{ background: ORANGE }}>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "4%" }}>NO</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "16%" }}>JENIS BAHAN BAKU</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "16%" }}>DESKRIPSI</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "10%" }}>HS CODE</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "38%" }}>DESKRIPSI HS CODE</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>PHOTO</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rm, i) => (
                  <tr key={rm.id} style={{ background: "#fff", borderBottom: "1px solid #e2dccf" }}>
                    <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>{pageIdx * RAW_MATERIAL_ROWS_PER_PAGE + i + 1}</td>
                    <td style={{ padding: 10, verticalAlign: "top", fontWeight: 700 }}>{rm.jenis || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>{rm.deskripsi || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top", color: MUTED }}>{rm.hsCode || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top", lineHeight: 1.5, color: MUTED }}>{rm.hsDesc || "—"}</td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <TableThumb path={rm.photoPath} label={rm.jenis} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageShell>
      ))}
    </>
  );
}

type Props = {
  assignmentId: string;
  backHref?: string;
  /** Which workspace's API scope to read the report through — verifikator's own, or a company reading its own finished report. */
  basePath?: string;
};

export function DocumentVerificationReport({ assignmentId, backHref, basePath = "/api/verifikator-workspace" }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [basePath, "assignments", assignmentId, "document-report"],
    queryFn: async () => {
      const response = await fetch(`${basePath}/assignments/${assignmentId}/document-report`);
      if (!response.ok) throw new Error("Laporan tidak ditemukan");
      const json = (await response.json()) as { data: ReportData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat laporan...</p>;
  }
  if (isError || !data) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">Laporan tidak ditemukan.</p>;
  }

  const company = data.companyName;
  const ctx: NarrativeContext = { payload: data.payload, company, businessAddress: data.businessAddress, companySkt: data.companySkt };

  const verified = data.documents.filter((d) => d.status === "VALID").length;
  const needsRevision = data.documents.filter((d) => d.status === "NEED_REVISION").length;
  const rejected = data.documents.filter((d) => d.status === "REJECTED").length;
  const notApplicable = data.documents.filter((d) => d.status === "NOT_APPLICABLE").length;
  const pending = data.documents.filter((d) => d.status === "PENDING").length;
  const applicable = data.documents.length - notApplicable;
  const completionPct = applicable > 0 ? Math.round((verified / applicable) * 100) : 0;
  const isFinal = data.status === "COMPLETED" || data.status === "RETURNED";

  const categories = [...new Set(data.documents.map((d) => d.category))];

  // Every category gets the full narrative-page treatment (divider + compliance/
  // list page + one page per document + kesimpulan/rekap + visual summary) when
  // real narrative content exists for it; categories with no narrative content
  // yet (e.g. VIU's "Dokumen Pendukung") fall back to the compact compliance
  // table + flat document list treatment.
  const categoryDocsMap: Record<string, DocDetail[]> = {};
  for (const category of categories) {
    const realKeys = new Set(data.documents.filter((d) => d.category === category).map((d) => d.key));
    if (category === "Legalitas Perusahaan") categoryDocsMap[category] = LEGALITAS_DOCUMENTS;
    else if (category === "Perpajakan") categoryDocsMap[category] = PERPAJAKAN_DOCUMENTS.filter((d) => realKeys.has(d.key));
    else if (category === "Surat Pernyataan") categoryDocsMap[category] = SURAT_PERNYATAAN_DOCUMENTS.filter((d) => realKeys.has(d.key));
    else if (category === "Tenaga Kerja") categoryDocsMap[category] = TENAGA_KERJA_DOCUMENTS.filter((d) => realKeys.has(d.key));
    else if (category === "Dokumen Lokasi") categoryDocsMap[category] = buildLocationDocuments(ctx);
    else if (category === "Dokumen Pendukung VKI") categoryDocsMap[category] = buildElectricityDocuments(ctx);
    else categoryDocsMap[category] = [];
  }

  // Page numbering: 1 approval, 2 toc, 3 ringkasan, 4 ringkasan-dokumen, 5 info,
  // then each chapter (divider + A + N detail pages + kesimpulan + visual = N+4
  // when narrative content exists, else divider + compliance + list = 3), then lampiran.
  const categoryPageCount = (category: string): number => {
    const docs = categoryDocsMap[category] ?? [];
    return docs.length > 0 ? docs.length + 4 : 3;
  };
  const categoryStartPages: Record<string, number> = {};
  let cursor = 6; // after fixed pages 1-5
  for (const category of categories) {
    categoryStartPages[category] = cursor;
    cursor += categoryPageCount(category);
  }

  // "Data Mesin dan Peralatan Produksi" — VKI-only, not a document-checklist
  // category (machines are technical spec rows, not upload/verify documents),
  // so it's appended as its own fixed chapter after all document categories:
  // 1 divider + 1 "Data Mesin" table + 1 "Photo Mesin" page per 2 machines.
  const machines = data.machines;
  const machineChapterPageCount = machines.length > 0 ? 2 + Math.ceil(machines.length / 2) : 0;
  const machineChapterStartPage = cursor;
  cursor += machineChapterPageCount;

  // "Data Produk" — divider + a paginated "Produk yang Diproduksi" table
  // (real verifikator status) + a paginated "Bahan Baku yang Digunakan" table
  // (no status column — no verifikator review system exists for raw
  // materials yet, so showing one would be fabricated).
  const products = data.products;
  const rawMaterials = data.rawMaterials;
  const productPages = chunk(products, PRODUCT_ROWS_PER_PAGE);
  const rawMaterialPages = chunk(rawMaterials, RAW_MATERIAL_ROWS_PER_PAGE);
  const hasProductChapter = products.length > 0 || rawMaterials.length > 0;
  const productChapterPageCount = hasProductChapter ? 1 + productPages.length + rawMaterialPages.length : 0;
  const productChapterStartPage = cursor;
  cursor += productChapterPageCount;

  // "Kemampuan Produksi" — capacity/machine-daily-output/production-qty/
  // raw-material-usage/conversion/sales, appended after "Data Produk". Fixed
  // page count: every sub-table renders on a single page, same convention as
  // the Data Mesin table (no per-row pagination).
  const capacity = data.capacity;
  const productionQty = data.productionQty;
  const rawMaterialUsage = data.rawMaterialUsage;
  const rawMaterialConversion = data.rawMaterialConversion;
  const sales = data.sales;
  const hasProductionCapabilityChapter =
    capacity.length > 0 || machines.length > 0 || products.length > 0 || rawMaterials.length > 0 || productionQty.length > 0 || rawMaterialUsage.length > 0 || rawMaterialConversion.length > 0 || sales.length > 0;
  const productionCapabilityChapterPageCount = hasProductionCapabilityChapter ? PRODUCTION_CAPABILITY_CHAPTER_PAGE_COUNT : 0;
  const productionCapabilityChapterStartPage = cursor;
  cursor += productionCapabilityChapterPageCount;

  const lampiranPage = cursor;
  const totalPages = lampiranPage;

  return (
    <div className="report-doc" style={{ fontFamily: "'Archivo', sans-serif" }}>
      {FONT_LINKS}
      <div className="rd-topbar">
        <Link href={backHref ?? `/verifikator-workspace/assignments/${assignmentId}`} className="rd-back">
          <MaterialIcon name="arrow_back" className="text-base" />
          Kembali ke Assignment
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Laporan Verifikasi Dokumen{" "}
            <span className="rd-topbar-sub">
              &middot; {company} &middot; {data.assignmentNumber} &middot; {isFinal ? "Final" : "Draf (belum disubmit)"}
            </span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Cetak
          </button>
          <button type="button" className="rd-btn rd-btn-primary" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Unduh PDF
          </button>
        </div>
      </div>

      <main className="rd-main">
        {/* COVER */}
        <section className="rd-sheet" style={{ background: NAVY, color: "#fff", position: "relative", padding: "48px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />
          <PageHead dark />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18 }}>
            <div style={{ display: "inline-flex", background: ORANGE_LIGHT, color: NAVY, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", padding: "6px 14px", width: "fit-content", borderRadius: 20 }}>
              LAPORAN VERIFIKASI DOKUMEN
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>Verifikasi Kelengkapan Dokumen</h1>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {company.split(" ")[0]} <span style={{ color: ORANGE_LIGHT }}>{company.split(" ").slice(1).join(" ")}</span>
            </div>
            <div style={{ border: "1px solid #2d3a4a", padding: "22px 26px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 24px", marginTop: 8, borderRadius: 14 }}>
              {[
                ["NOMOR DOKUMEN", `LV-DOK/${data.assignmentNumber}`],
                ["NOMOR PENUGASAN", data.assignmentNumber],
                ["NOMOR APLIKASI", data.applicationNumber],
                ["TANGGAL TERBIT", fmtDate(data.validatedAt ?? new Date().toISOString())],
                ["DISUSUN OLEH", data.verifikatorName ?? "—"],
                ["JENIS VERIFIKASI", data.verificationType],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, letterSpacing: "0.05em", color: ORANGE_LIGHT, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8a97a8", borderTop: "1px solid #1e2a38", paddingTop: 14, marginTop: 24 }}>
            <div>Lembaga Verifikasi &amp; Survey — VKI / VIU</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>

        {/* APPROVAL */}
        <PageShell pageNo={1} totalPages={totalPages} companyName={company} id="approval">
          <Eyebrow>HALAMAN PERSETUJUAN</Eyebrow>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 14px" }}>Persetujuan Dokumen</h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: 0 }}>
            Laporan dokumen ini disusun berdasarkan hasil pemeriksaan kelengkapan dan kesesuaian dokumen permohonan oleh verifikator, sebagai
            bagian dari proses Verifikasi Kemampuan Industri (VKI) / Verifikasi Importir Umum (VIU) sebelum diteruskan kepada pihak terkait.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 36 }}>
            <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, padding: 20, borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#4a8c6a", marginBottom: 10 }}>DISUSUN OLEH</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{data.verifikatorName ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#7a7166", marginBottom: 22 }}>Verifikator Dokumen</div>
              <div style={{ borderTop: "1px dashed #d8cdb8", paddingTop: 10, fontSize: 11, color: MUTED_2, marginBottom: 8 }}>Tanda tangan</div>
              {data.signaturePath ? (
                <>
                  <img
                    src={fileUrl(data.signaturePath) ?? undefined}
                    alt={`Tanda tangan ${data.verifikatorName ?? "verifikator"}`}
                    style={{ height: 44, maxWidth: "100%", objectFit: "contain", marginBottom: 6 }}
                  />
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: GREEN }}>
                    ● {fmtDate(data.signatureDate ?? data.validatedAt)}
                  </div>
                </>
              ) : (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: isFinal ? GREEN : ORANGE_TEXT }}>
                  ● {isFinal ? `${fmtDate(data.validatedAt)}` : "Draf"}
                </div>
              )}
            </div>
            <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, padding: 20, borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: ORANGE_TEXT, marginBottom: 10 }}>DIPERIKSA OLEH</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{data.technicalReviewerName ?? "Menunggu penunjukan"}</div>
              <div style={{ fontSize: 12, color: "#7a7166", marginBottom: 22 }}>Technical Reviewer</div>
              <div style={{ borderTop: "1px dashed #d8cdb8", paddingTop: 10, fontSize: 11, color: MUTED_2, marginBottom: 8 }}>Tanda tangan</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: MUTED_2 }}>● Menunggu</div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, padding: 20, borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: ORANGE_TEXT, marginBottom: 10 }}>DISETUJUI OLEH</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Menunggu penunjukan</div>
              <div style={{ fontSize: 12, color: "#7a7166", marginBottom: 22 }}>Project Manager</div>
              <div style={{ borderTop: "1px dashed #d8cdb8", paddingTop: 10, fontSize: 11, color: MUTED_2, marginBottom: 8 }}>Tanda tangan</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: MUTED_2 }}>● Menunggu</div>
            </div>
          </div>
          <div style={{ marginTop: 40 }}>
            <Eyebrow>RIWAYAT DOKUMEN</Eyebrow>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12, borderRadius: 10, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#f2e9d9" }}>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", fontSize: 10, color: "#5c5346" }}>VERSI</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", fontSize: 10, color: "#5c5346" }}>STATUS</th>
                  <th style={{ textAlign: "left", fontWeight: 700, padding: "10px 12px", fontSize: 10, color: "#5c5346" }}>KLASIFIKASI</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td style={{ padding: 12, color: "#4a8c6a", fontWeight: 600 }}>1.0 — Draf Verifikator</td>
                  <td style={{ padding: 12 }}>
                    <Badge color={isFinal ? "#0e3d24" : "#7a4a10"} bg={isFinal ? "#d2f6dd" : "#f5cf9a"}>
                      {isFinal ? "Sudah Disubmit" : "Menunggu Persetujuan"}
                    </Badge>
                  </td>
                  <td style={{ padding: 12, color: ORANGE_TEXT, fontWeight: 600 }}>Internal — Terbatas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </PageShell>

        {/* TOC */}
        <PageShell pageNo={2} totalPages={totalPages} companyName={company} id="toc">
          <Eyebrow>DAFTAR ISI</Eyebrow>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 20px" }}>Daftar Isi</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["1", "Halaman Persetujuan", "approval"],
              ["2", "Daftar Isi", "toc"],
              ["3", "Ringkasan Eksekutif", "ringkasan"],
              ["4", "Ringkasan Verifikasi Dokumen", "ringkasan-dokumen"],
              ["5", "Informasi Verifikasi", "info"],
            ].map(([num, label, anchor]) => (
              <a key={anchor} href={`#${anchor}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {num}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b" }}>{label}</div>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: ORANGE_TEXT, margin: "24px 0 10px" }}>ISI LAPORAN VERIFIKASI DOKUMEN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map((category, i) => {
              const startPage = categoryStartPages[category];
              return (
                <a key={category} href={`#bab-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>{category}</div>
                  <div style={{ fontSize: 12, color: MUTED_2 }}>{String(startPage).padStart(2, "0")}</div>
                </a>
              );
            })}
            {machines.length > 0 && (
              <a href="#bab-mesin" style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {categories.length + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>Data Mesin dan Peralatan Produksi</div>
                <div style={{ fontSize: 12, color: MUTED_2 }}>{String(machineChapterStartPage).padStart(2, "0")}</div>
              </a>
            )}
            {hasProductChapter && (
              <a href="#bab-produk" style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {categories.length + (machines.length > 0 ? 2 : 1)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>Data Produk</div>
                <div style={{ fontSize: 12, color: MUTED_2 }}>{String(productChapterStartPage).padStart(2, "0")}</div>
              </a>
            )}
            {hasProductionCapabilityChapter && (
              <a href="#bab-kemampuan-produksi" style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: ORANGE, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {categories.length + (machines.length > 0 ? 1 : 0) + (hasProductChapter ? 1 : 0) + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>Kemampuan Produksi</div>
                <div style={{ fontSize: 12, color: MUTED_2 }}>{String(productionCapabilityChapterStartPage).padStart(2, "0")}</div>
              </a>
            )}
            <a href="#lampiran" style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                A
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>Lampiran</div>
              <div style={{ fontSize: 12, color: MUTED_2 }}>{String(lampiranPage).padStart(2, "0")}</div>
            </a>
          </div>
        </PageShell>

        {/* RINGKASAN EKSEKUTIF */}
        <PageShell pageNo={3} totalPages={totalPages} companyName={company} id="ringkasan">
          <Eyebrow>RINGKASAN EKSEKUTIF</Eyebrow>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px" }}>Ringkasan Eksekutif</h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: 0 }}>
            Verifikasi dokumen permohonan {data.verificationType} milik {company} meliputi pemeriksaan kelengkapan legalitas, perpajakan,
            lokasi, dan dokumen pendukung terhadap data permohonan yang diajukan oleh verifikator dokumen.
          </p>

          <div style={{ background: ORANGE, color: "#fff", padding: "22px 26px", marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: isFinal ? GREEN : "#c96a1f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                ●
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#ffe3cc", marginBottom: 6 }}>Status Laporan</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{isFinal ? "TERBIT" : "DRAF"}</div>
                <div style={{ fontSize: 11, color: "#ffe3cc", lineHeight: 1.5 }}>
                  Laporan verifikasi dokumen {isFinal ? `telah disusun oleh verifikator pada tanggal ${fmtDate(data.validatedAt)}.` : "masih dalam proses pengerjaan oleh verifikator."}
                </div>
              </div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.35)", paddingLeft: 24 }}>
              <div style={{ fontSize: 11, color: "#ffe3cc", marginBottom: 6 }}>Objek Verifikasi</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{company.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "#ffe3cc" }}>Permohonan {data.verificationType}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginTop: 20 }}>
            <div style={{ background: NAVY, color: "#fff", padding: 18, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{data.documents.length}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.04em", color: "#a8b3c2" }}>TOTAL DOKUMEN</div>
            </div>
            <div style={{ background: "#d2f6dd", color: "#0e3d24", padding: 18, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{verified}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.04em", color: "#2e6b48" }}>VERIFIED</div>
            </div>
            <div style={{ background: "#ffe0dc", color: "#7a1f14", padding: 18, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{needsRevision + rejected}</div>
              <div style={{ fontSize: 10, letterSpacing: "0.04em", color: "#a8443a" }}>PERLU TINDAK LANJUT</div>
            </div>
            <div style={{ background: "#ffebce", color: "#7a4a10", padding: 18, borderRadius: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.03em", marginBottom: 8 }}>N/A &amp; BELUM DIPERIKSA</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{notApplicable + pending}</div>
            </div>
          </div>

          <div style={{ background: NAVY, color: "#fff", padding: "24px 26px", marginTop: 20, borderRadius: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE, marginBottom: 10 }}>Status Keseluruhan</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "#b8c0cc", marginBottom: 20, maxWidth: 560 }}>
              Verifikator memberikan kesimpulan atas hasil pemeriksaan kelengkapan dan kesesuaian dokumen permohonan berdasarkan pemeriksaan
              yang telah dilakukan.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${ORANGE}`, color: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  ?
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#8a97a8", marginBottom: 4 }}>Status Kelengkapan Dokumen</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ORANGE }}>{needsRevision + rejected > 0 ? "PERLU TINDAK LANJUT" : "LENGKAP & SESUAI"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${GREEN}`, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  %
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#8a97a8", marginBottom: 4 }}>Persentase Dokumen Verified</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{completionPct}%</div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #1e2a38", marginTop: 20, paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color: ORANGE }}>✓</div>
              <div style={{ fontSize: 12, color: "#e8ecef" }}>{data.validationNotes || "Belum ada kesimpulan yang diisi verifikator."}</div>
            </div>
          </div>
        </PageShell>

        {/* RINGKASAN VERIFIKASI DOKUMEN */}
        <PageShell pageNo={4} totalPages={totalPages} companyName={company} id="ringkasan-dokumen">
          <Eyebrow>RINGKASAN VERIFIKASI DOKUMEN</Eyebrow>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px" }}>Ringkasan Verifikasi Dokumen</h1>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11, borderRadius: 10, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#f2e9d9" }}>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", fontSize: 9, color: "#5c5346", width: "5%" }}>NO</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", fontSize: 9, color: "#5c5346", width: "26%" }}>DOKUMEN</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", fontSize: 9, color: "#5c5346", width: "55%" }}>KATEGORI</th>
                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", fontSize: 9, color: "#5c5346", width: "14%" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.map((doc, i) => (
                <tr key={doc.key} style={{ borderBottom: `1px solid ${CARD_BORDER}`, background: "#fff" }}>
                  <td style={{ padding: 10, verticalAlign: "top" }}>{i + 1}</td>
                  <td style={{ padding: 10, verticalAlign: "top", fontWeight: 600 }}>{doc.label}</td>
                  <td style={{ padding: 10, verticalAlign: "top", lineHeight: 1.5, color: MUTED }}>{doc.category}</td>
                  <td style={{ padding: 10, verticalAlign: "top" }}>
                    <Badge color={STATUS_BADGE[doc.status].color} bg={STATUS_BADGE[doc.status].bg}>
                      {DOC_VERIFICATION_STATUS_LABELS[doc.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PageShell>

        {/* INFORMASI VERIFIKASI */}
        <PageShell pageNo={5} totalPages={totalPages} companyName={company} id="info">
          <Eyebrow>INFORMASI VERIFIKASI</Eyebrow>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 20px" }}>Informasi Verifikasi</h1>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {[
              ["Nama Perusahaan", company, "#1a3a6b"],
              ["Nomor Penugasan", data.assignmentNumber, ORANGE_TEXT],
              ["Nomor Aplikasi", data.applicationNumber, ORANGE_TEXT],
              ["Jenis Verifikasi", data.verificationType, "#1a3a6b"],
              ["Jumlah Kategori Dokumen", String(categories.length), INK],
              ["Verifikator Dokumen", data.verifikatorName ?? "—", "#1a3a6b"],
              ["Technical Reviewer", data.technicalReviewerName ?? "—", INK],
              ["Tanggal Laporan Diterbitkan", fmtDate(data.validatedAt), INK],
              ["Klasifikasi Dokumen", "Internal — Terbatas", "#1a3a6b"],
            ].map(([label, value, color], i, arr) => (
              <div
                key={label}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f2ece0" : undefined }}
              >
                <div style={{ fontSize: 12, color: "#8a7d68" }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </PageShell>

        {/* ===== CHAPTERS ===== */}
        {categories.map((category, chapterIdx) => {
          const catDocs = data.documents.filter((d) => d.category === category);
          const sectionDef = COMPLIANCE_SECTION_DEFS.find((s) => s.category === category);
          const complianceRows = catDocs.filter((d) => getComplianceDef(d.key));
          const narrativeDocs = categoryDocsMap[category] ?? [];
          const startPage = categoryStartPages[category];
          const catCompliant = narrativeDocs.filter((d) => d.kesimpulan(ctx).memenuhi).length;
          const catVerified = catDocs.filter((d) => d.status === "VALID").length;
          const catFlagged = catDocs.filter((d) => d.status === "REJECTED" || d.status === "NEED_REVISION").length;

          return (
            <div key={category}>
              {/* BAB divider */}
              <section
                className="rd-sheet"
                id={`bab-${chapterIdx}`}
                style={{ background: NAVY, color: "#fff", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}
              >
                <div style={{ position: "absolute", top: 60, left: -40, fontSize: 340, fontWeight: 800, color: "#fff", opacity: 0.05, lineHeight: 1 }}>
                  {String(chapterIdx + 2).padStart(2, "0")}
                </div>
                <div style={{ position: "relative", padding: "0 56px", maxWidth: 520 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 22, height: 2, background: ORANGE_LIGHT }} />
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#f28951" }}>
                      BAB {["I", "II", "III", "IV", "V", "VI", "VII"][chapterIdx + 1]}
                    </div>
                  </div>
                  <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: "0 0 18px" }}>{category}</h1>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "#b8c0cc", margin: "0 0 22px" }}>
                    {sectionDef?.intro[0] ?? `Pemeriksaan kelengkapan dan kesesuaian dokumen kategori ${category} milik ${company}.`}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#0d1e30", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#8a97a8", marginBottom: 8 }}>JUMLAH DOKUMEN</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{catDocs.length}</div>
                    </div>
                    <div style={{ background: "#d2f6dd", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#2e6b48", marginBottom: 8 }}>VERIFIED</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#0e3d24" }}>{catVerified}</div>
                    </div>
                    <div style={{ background: "#0d1e30", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.05em", color: "#8a97a8", marginBottom: 8 }}>PERLU TINDAK LANJUT</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{catFlagged}</div>
                    </div>
                  </div>
                </div>
              </section>

              {narrativeDocs.length > 0 ? (
                <>
                  {/* A. Compliance table (or plain doc list when no fixed regulation citation applies) */}
                  <PageShell pageNo={startPage + 1} totalPages={totalPages} companyName={company}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "24px 0 14px 0" }}>A. {sectionDef?.title ?? `Pemeriksaan Administratif ${category}`}</h1>
                    {(sectionDef?.intro ?? []).map((p, i) => (
                      <p key={i} style={{ fontSize: 10.5, lineHeight: 1.5, color: MUTED, margin: "0 0 8px" }}>
                        {p}
                      </p>
                    ))}
                    {complianceRows.length > 0 ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "14px 0 10px" }}>
                          Tabel Pemeriksaan Dokumen {sectionDef?.title ?? category}
                        </div>
                        <ComplianceTable rows={complianceRows.map((d) => ({ key: d.key, label: d.label }))} />
                        <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: ORANGE_TEXT, marginBottom: 6, letterSpacing: "0.04em" }}>KETERANGAN</div>
                          <div style={{ fontSize: 10, lineHeight: 1.5, color: MUTED, marginBottom: 5 }}>
                            Persyaratan Wajib → dokumen yang memang dipersyaratkan atau menjadi dasar pemenuhan VKI.
                          </div>
                          <div style={{ fontSize: 10, lineHeight: 1.5, color: MUTED }}>
                            Dokumen Pendukung → dokumen yang tidak diwajibkan untuk diunggah, tetapi diperiksa oleh verifikator untuk memastikan
                            keabsahan dan konsistensi dokumen kategori ini.
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 10.5, lineHeight: 1.5, color: MUTED_2, margin: "8px 0 14px" }}>
                          Kategori ini tidak memiliki referensi Pasal tetap — dokumen bersifat dinamis mengikuti lokasi/periode permohonan, dan
                          diperiksa berdasarkan kesesuaian dengan data permohonan yang diajukan.
                        </p>
                        <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "14px 0 10px" }}>
                          Daftar Dokumen {category}
                        </div>
                        <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                            <thead>
                              <tr style={{ background: ORANGE }}>
                                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "6%" }}>NO</th>
                                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>DOKUMEN</th>
                                <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "18%" }}>KELENGKAPAN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {narrativeDocs.map((doc, i) => (
                                <tr key={doc.key} style={{ background: "#fff", borderBottom: i < narrativeDocs.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                                  <td style={{ padding: 8, verticalAlign: "top" }}>{i + 1}</td>
                                  <td style={{ padding: 8, verticalAlign: "top", fontWeight: 600 }}>{doc.title}</td>
                                  <td style={{ padding: 8, verticalAlign: "top" }}>
                                    <Badge color={doc.documentPath(ctx) ? "#0e3d24" : "#7a1f14"} bg={doc.documentPath(ctx) ? "#d2f6dd" : "#ffe0dc"}>
                                      {doc.documentPath(ctx) ? "Diunggah" : "Belum Diunggah"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </PageShell>

                  {/* B. Per-document narrative pages */}
                  {narrativeDocs.map((doc, i) => {
                    const k = doc.kesimpulan(ctx);
                    return (
                      <PageShell key={doc.key} pageNo={startPage + 2 + i} totalPages={totalPages} companyName={company}>
                        <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.3, margin: "24px 0 12px", textTransform: "uppercase" }}>
                          Hasil Pemeriksaan Administratif {category}
                        </h1>
                        <p style={{ fontSize: 11, lineHeight: 1.5, color: MUTED, margin: "0 0 18px", maxWidth: 680 }}>
                          Berdasarkan hasil pemeriksaan terhadap dokumen kategori {category.toLowerCase()} yang ditunjukkan oleh {company}, uraian
                          berikut memuat hasil pemeriksaan atas dokumen {doc.title.toLowerCase()}.
                        </p>
                        <div style={{ background: MINT, borderRadius: 16, padding: "22px 24px", flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 10 }}>
                            {doc.no}. {doc.title}
                          </div>
                          {doc.intro(ctx).map((p, pi) => (
                            <p key={pi} style={{ fontSize: 10.5, lineHeight: 1.5, color: MINT_INK, margin: pi === doc.intro(ctx).length - 1 ? "0 0 14px" : "0 0 10px", maxWidth: 660 }}>
                              {p}
                            </p>
                          ))}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 20 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {doc.fields(ctx).map((f) => (
                                <FieldRow key={f.label} label={f.label} value={f.value} ok={f.ok} />
                              ))}
                            </div>
                            <DocImage path={doc.documentPath(ctx)} label={doc.title} aspectRatio={doc.imageAspectRatio} />
                          </div>
                          {doc.findings(ctx).map((p, pi) => (
                            <p key={pi} style={{ fontSize: 10, lineHeight: 1.5, color: MINT_INK, margin: "14px 0 0" }}>
                              {p}
                            </p>
                          ))}
                          <div style={{ background: k.memenuhi ? "#fff" : "#ffe0dc", borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: k.memenuhi ? GREEN : "#7a1f14", marginBottom: 5, letterSpacing: "0.04em" }}>KESIMPULAN</div>
                            <p style={{ fontSize: 10, lineHeight: 1.5, color: k.memenuhi ? MINT_INK : "#7a1f14", margin: 0 }} dangerouslySetInnerHTML={{ __html: k.text }} />
                          </div>
                        </div>
                      </PageShell>
                    );
                  })}

                  {/* C. Kesimpulan + rekap */}
                  <PageShell pageNo={startPage + 2 + narrativeDocs.length} totalPages={totalPages} companyName={company}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "24px 0 12px" }}>C. Kesimpulan Pemeriksaan Administratif {category}</h1>
                    <p style={{ fontSize: 10.5, lineHeight: 1.5, color: MUTED, margin: "0 0 8px" }}>
                      Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan terhadap aspek {category.toLowerCase()}, diperoleh hasil bahwa{" "}
                      {company} {catCompliant === narrativeDocs.length ? "telah memenuhi kelengkapan dokumen yang dipersyaratkan" : "memiliki sebagian dokumen yang masih perlu dilengkapi"} dengan ketentuan dalam pelaksanaan Verifikasi Kemampuan Industri (VKI).
                    </p>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "14px 0 10px" }}>
                      Tabel Rekapitulasi Hasil Verifikasi Aspek {category}
                    </div>
                    <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                        <thead>
                          <tr style={{ background: ORANGE }}>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", color: "#fff", width: "4%" }}>NO</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", color: "#fff", width: "20%" }}>JENIS DOKUMEN</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", color: "#fff", width: "46%" }}>DATA HASIL VERIFIKASI</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "8px 9px", color: "#fff" }}>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {narrativeDocs.map((doc, i) => {
                            const k = doc.kesimpulan(ctx);
                            const firstField = doc.fields(ctx)[0];
                            return (
                              <tr key={doc.key} style={{ background: k.memenuhi ? "#fff" : "#fff5f4", borderBottom: i < narrativeDocs.length - 1 ? "1px solid #f2ece0" : undefined }}>
                                <td style={{ padding: "7px 9px", verticalAlign: "top" }}>{i + 1}</td>
                                <td style={{ padding: "7px 9px", verticalAlign: "top", fontWeight: 600 }}>{doc.title}</td>
                                <td style={{ padding: "7px 9px", verticalAlign: "top", lineHeight: 1.4, color: MUTED }}>{firstField?.value ?? "—"}</td>
                                <td style={{ padding: "7px 9px", verticalAlign: "top" }}>
                                  <Badge color={k.memenuhi ? "#0e3d24" : "#7a1f14"} bg={k.memenuhi ? "#d2f6dd" : "#ffe0dc"}>
                                    {k.memenuhi ? "Memenuhi" : "Belum Memenuhi"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 10, lineHeight: 1.5, color: MUTED, margin: "14px 0 0" }}>
                      Berdasarkan keseluruhan hasil verifikasi, Aspek {category} {company} dinyatakan{" "}
                      <strong>{catCompliant === narrativeDocs.length ? "Memenuhi" : "Belum Memenuhi Seluruhnya"}</strong> sebagai dasar pelaksanaan
                      Verifikasi Kemampuan Industri sesuai dengan ketentuan Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.
                    </p>
                  </PageShell>

                  {/* Visual summary */}
                  <section className="rd-sheet" style={{ background: NAVY, color: "#fff", padding: "36px 44px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <PageHead dark />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 4px" }}>
                      <div style={{ width: 22, height: 2, background: ORANGE_LIGHT }} />
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#f28951" }}>
                        BAB {["I", "II", "III", "IV", "V", "VI", "VII"][chapterIdx + 1]} · RINGKASAN VISUAL
                      </div>
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>{category}</h1>
                    <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#b8c0cc", margin: "0 0 20px", maxWidth: 640 }}>
                      Rekap visual hasil pemeriksaan administratif dokumen {category.toLowerCase()} {company}.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                      <div style={{ background: "#0d1e30", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                          {catCompliant} / {narrativeDocs.length}
                        </div>
                        <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#8a97a8" }}>DOKUMEN MEMENUHI</div>
                      </div>
                      <div style={{ background: "#d2f6dd", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#0e3d24", marginBottom: 4 }}>
                          {Math.round((catCompliant / narrativeDocs.length) * 100)}%
                        </div>
                        <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#2e6b48" }}>TINGKAT KESESUAIAN</div>
                      </div>
                      <div style={{ background: "#0d1e30", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{narrativeDocs.length - catCompliant}</div>
                        <div style={{ fontSize: 9.5, letterSpacing: "0.04em", color: "#8a97a8" }}>PERLU TINDAK LANJUT</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "#f28951", marginBottom: 10 }}>DOKUMEN YANG DIVERIFIKASI</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                      {narrativeDocs.map((doc) => {
                        const k = doc.kesimpulan(ctx);
                        const firstField = doc.fields(ctx)[0];
                        return (
                          <div key={doc.key} style={{ background: "#0d1e30", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: k.memenuhi ? GREEN : "#c1361f",
                                color: "#fff",
                                fontSize: 11,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {k.memenuhi ? "✓" : "✕"}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>{doc.title}</div>
                              <div style={{ fontSize: 9, color: "#8a97a8" }}>{firstField?.value ?? "—"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ background: ORANGE, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Kesimpulan: Aspek {category}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                        {catCompliant === narrativeDocs.length ? "MEMENUHI" : "PERLU TINDAK LANJUT"}
                      </div>
                    </div>
                    <PageFoot companyName={company} pageNo={startPage + 3 + narrativeDocs.length} totalPages={totalPages} dark />
                  </section>
                </>
              ) : (
                <>
                  {/* Compact treatment for categories with no narrative content and no real documents */}
                  <PageShell pageNo={startPage + 1} totalPages={totalPages} companyName={company}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "24px 0 14px 0" }}>A. {sectionDef?.title ?? `Pemeriksaan Administratif ${category}`}</h1>
                    {(sectionDef?.intro ?? []).map((p, i) => (
                      <p key={i} style={{ fontSize: 10.5, lineHeight: 1.5, color: MUTED, margin: "0 0 8px" }}>
                        {p}
                      </p>
                    ))}
                    {complianceRows.length > 0 ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: INK, textAlign: "center", margin: "14px 0 10px" }}>
                          Tabel Pemeriksaan Dokumen {sectionDef?.title ?? category}
                        </div>
                        <ComplianceTable rows={complianceRows.map((d) => ({ key: d.key, label: d.label }))} />
                      </>
                    ) : (
                      <p style={{ fontSize: 10.5, lineHeight: 1.5, color: MUTED_2 }}>
                        Kategori ini tidak memiliki referensi regulasi tetap — dokumen bersifat dinamis mengikuti lokasi/periode permohonan.
                      </p>
                    )}
                  </PageShell>

                  <PageShell pageNo={startPage + 2} totalPages={totalPages} companyName={company}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: "24px 0 14px 0" }}>B. Daftar Dokumen {category}</h1>
                    <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                        <thead>
                          <tr style={{ background: ORANGE }}>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "6%" }}>NO</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>DOKUMEN</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "16%" }}>KELENGKAPAN</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff", width: "18%" }}>STATUS REVIEW</th>
                            <th style={{ textAlign: "left", fontWeight: 700, padding: "9px 10px", color: "#fff" }}>CATATAN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catDocs.map((doc, i) => (
                            <tr key={doc.key} style={{ background: "#fff", borderBottom: i < catDocs.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                              <td style={{ padding: 8, verticalAlign: "top" }}>{i + 1}</td>
                              <td style={{ padding: 8, verticalAlign: "top", fontWeight: 600 }}>{doc.label}</td>
                              <td style={{ padding: 8, verticalAlign: "top" }}>
                                <Badge color={doc.hasDocument ? "#0e3d24" : "#7a1f14"} bg={doc.hasDocument ? "#d2f6dd" : "#ffe0dc"}>
                                  {doc.hasDocument ? "Diunggah" : "Belum Diunggah"}
                                </Badge>
                              </td>
                              <td style={{ padding: 8, verticalAlign: "top" }}>
                                <Badge color={STATUS_BADGE[doc.status].color} bg={STATUS_BADGE[doc.status].bg}>
                                  {DOC_VERIFICATION_STATUS_LABELS[doc.status]}
                                </Badge>
                              </td>
                              <td style={{ padding: 8, verticalAlign: "top", color: MUTED }}>{doc.note || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </PageShell>
                </>
              )}
            </div>
          );
        })}

        {machines.length > 0 && (
          <MachineChapter
            machines={machines}
            company={company}
            chapterIdx={categories.length}
            startPage={machineChapterStartPage}
            totalPages={totalPages}
          />
        )}

        {hasProductChapter && (
          <ProductChapter
            products={products}
            rawMaterials={rawMaterials}
            company={company}
            chapterIdx={categories.length + (machines.length > 0 ? 1 : 0)}
            startPage={productChapterStartPage}
            totalPages={totalPages}
          />
        )}

        {hasProductionCapabilityChapter && (
          <ProductionCapabilityChapter
            capacity={capacity}
            capacityDocumentPath={data.payload.capacityDocumentPath ?? null}
            machines={machines}
            products={products}
            rawMaterials={rawMaterials}
            productionQty={productionQty}
            rawMaterialUsage={rawMaterialUsage}
            rawMaterialConversion={rawMaterialConversion}
            sales={sales}
            productionSebelumnyaConclusion={data.productionSebelumnyaConclusion}
            penggunaanConclusion={data.penggunaanConclusion}
            stokConclusion={data.stokConclusion}
            konversiConclusion={data.konversiConclusion}
            rencanaConclusion={data.rencanaConclusion}
            rencanaKebutuhanConclusion={data.rencanaKebutuhanConclusion}
            penjualanConclusion={data.penjualanConclusion}
            company={company}
            chapterIdx={categories.length + (machines.length > 0 ? 1 : 0) + (hasProductChapter ? 1 : 0)}
            startPage={productionCapabilityChapterStartPage}
            totalPages={totalPages}
          />
        )}

        {/* LAMPIRAN */}
        <PageShell pageNo={lampiranPage} totalPages={totalPages} companyName={company} id="lampiran">
          <Eyebrow>LAMPIRAN</Eyebrow>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: "0 0 20px" }}>Lampiran</h1>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: ORANGE_TEXT, marginBottom: 10 }}>A. INDEKS DOKUMEN</div>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {data.documents.map((doc, i) => (
                  <tr key={doc.key} style={{ borderBottom: i < data.documents.length - 1 ? "1px solid #f2ece0" : undefined }}>
                    <td style={{ padding: "8px 12px", width: "8%", color: MUTED_2 }}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={{ padding: "8px 12px" }}>{doc.label}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: MUTED_2 }}>{doc.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: ORANGE_TEXT, marginBottom: 10 }}>B. RIWAYAT PERUBAHAN DOKUMEN</div>
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: INK, marginBottom: 2 }}>Versi 1.0</div>
            <div style={{ fontSize: 11.5, color: MUTED_2 }}>Disusun oleh verifikator — {fmtDate(data.validatedAt)}</div>
          </div>
        </PageShell>
      </main>
    </div>
  );
}
