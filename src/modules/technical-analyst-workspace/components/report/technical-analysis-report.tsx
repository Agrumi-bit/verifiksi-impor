"use client";

import type { ReactNode } from "react";
import { ReportLoadProgress } from "@/modules/surveyor-workspace/components/report/report-load-progress";
import { fmtNum, parseNumeric, parseRekapBahanBaku, type ElectricityMonth } from "../detail/analysis-types";
import { capacitySummary, materialNeeds, materialTotals } from "../../lhvki-summary";
import type { CapacityRow, MachineChecklistItem, RawMaterialConversionRow, RawMaterialUsageRow } from "@/modules/verifikator-workspace/schema";
import { computeListrik, LISTRIK_TEXT } from "../../listrik-calc";
import { BOTTLENECK_TEXT, computeBottleneck } from "../../kapasitas-calc";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ReportBrandMark } from "@/modules/surveyor-workspace/components/report/report-brand-mark";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "@/components/form/rich-text-editor.css";
import "./technical-analysis-report.css";
import { A4Pages, textToHtml, type FlowItem } from "./a4-pages";
import { CurrentPagePdfButton } from "./pdf-download-button";
import { formatAssignmentDate } from "@/lib/assignment-date";
import type { KonsumsiImportPlan } from "@/modules/applications/viu-import-plan";
import {
  TECHNICAL_MODULE_LABELS,
  TECHNICAL_MODULE_STATUS_LABELS,
  technicalModuleKeysFor,
  type TechnicalModuleKey,
  type TechnicalModuleStatusValue,
} from "../../status";
import { DOCUMENT_REPORT_REVIEW_DECISION_LABELS, type DocumentReportReview } from "../../document-report-review";

type ModuleData = {
  status?: TechnicalModuleStatusValue;
  keterangan?: string;
  kesimpulan?: string;
  inputs?: Record<string, string>;
};

type TechnicalReportData = {
  assignmentNumber: string;
  applicationNumber: string;
  verificationType: string;
  importTypes: string[];
  companyName: string;
  nibNumber: string | null;
  businessAddress: string | null;
  status: string;
  technicalReviewerName: string | null;
  signaturePath?: string | null;
  signatureDate?: string | null;
  validatedAt: string | null;
  validationNotes: string | null;
  pmReviewStatus: string | null;
  pmReviewedAt: string | null;
  technicalAnalysisData: Record<string, ModuleData>;
  documentReportReview: DocumentReportReview;
  konsumsiImportPlan: KonsumsiImportPlan | null;
  modalKerjaFromApplication: {
    bahanBaku: number | null;
    konsumsi: number | null;
  } | null;
  /** VKI — Kapasitas (Perizinan Berusaha) and konversi bahan baku, for the LHVKI figures (Pasal 32 ayat (3) c–f). */
  capacity?: CapacityRow[];
  rawMaterialConversion?: RawMaterialConversionRow[];
  rawMaterialUsage?: RawMaterialUsageRow[];
  /** VKI Energi Listrik — machines and PLN bills for sections A/C/D (listrik-calc.ts). */
  machines?: MachineChecklistItem[];
  electricityMonths?: ElectricityMonth[];
};

const IMPORT_TYPE_LABELS: Record<string, string> = {
  BAHAN_BAKU_INDUSTRI: "Bahan Baku Industri",
  BAHAN_BAKU_NON_INDUSTRI: "Bahan Baku Non Industri",
  BARANG_KONSUMSI: "Barang Konsumsi",
};

/** Human labels for the analysts' manual inputs, per module (keys from the analysis modules). */
const INPUT_LABELS: Record<string, string> = {
  hsCode: "HS Code yang Diperiksa",
  kebutuhanAktual: "Volume Kebutuhan menurut LHVKI Mitra Industri",
  kebutuhanKontrak: "Kebutuhan Mitra Non Industri sesuai Kontrak",
  stokTerkini: "Stok Terkini API-U",
  rencanaImpor: "Rencana / Volume Permohonan Impor",
  merek: "Merek",
  negaraAsal: "Negara Asal",
  stokDeklarasi: "Stok Terkini menurut Permohonan",
  stokLapangan: "Stok Terkini Hasil Pemeriksaan Lapangan",
  kapasitasGudang: "Kapasitas Gudang",
  nilaiImpor: "Nilai Rencana Impor (Rp)",
  modalKerja: "Kepemilikan Modal / Modal Kerja (Rp)",
  volumeIzin: "Volume sesuai Izin",
  estimasiJamOperasi: "Estimasi Jam Operasi",
  hariOperasiPerBulan: "Jumlah Hari Operasi per Bulan",
  tarifId: "Golongan Tarif Listrik",
  mesinBottleneck: "Mesin/Proses Bottleneck (dipilih analis)",
  catatanKapasitasIzin: "Catatan Analis — Kapasitas Perizinan Berusaha dan Hasil VKI",
  catatanB: "Catatan Analis (B)",
  catatanC: "Catatan Analis (C)",
  catatanD: "Catatan Analis (D)",
};

function inputLabel(key: string): string {
  if (INPUT_LABELS[key]) return INPUT_LABELS[key];
  const kurs = key.match(/^kurs_([A-Z]{3})$/);
  if (kurs) return `Kurs 1 ${kurs[1]} ke Rupiah`;
  const energy = key.match(/^energySource_(.+)_(jumlah|status)$/);
  if (energy) return `Sumber Energi ${energy[1]} — ${energy[2] === "jumlah" ? "Jumlah" : "Status"}`;
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function fmtDate(value: string | null | undefined): string {
  return value ? formatAssignmentDate(value, "full") : "—";
}

function fmtMoney(value: number, currency = "IDR"): string {
  return `${currency === "IDR" ? "Rp" : currency} ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}


function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Pasal 32 ayat (3) huruf c–f — the figures the LHVKI takes from this analysis. */
function LhvkiFigures({ data, part }: { data: TechnicalReportData; part: "capacity" | "materials" }) {
  const n = (v: number | null) => (v === null ? "—" : fmtNum(v, 2));
  const technicalAnalysisData = data.technicalAnalysisData as Parameters<typeof materialNeeds>[2];
  const capacity = capacitySummary(data.capacity ?? [], technicalAnalysisData.kapasitas?.inputs);
  const totals = materialTotals(
    materialNeeds(data.rawMaterialConversion ?? [], data.capacity ?? [], technicalAnalysisData, data.rawMaterialUsage ?? []),
  );
  if (part === "capacity")
    return (
      <>
        <h3 className="rd-serif" style={{ fontSize: 15, margin: "18px 0 6px" }}>
          Kapasitas Produksi per Tahun (Pasal 32 ayat (3) huruf c dan d)
        </h3>
        <table className="rd-table">
          <thead>
            <tr>
              <th>Jenis Produk</th>
              <th>Sesuai Perizinan Berusaha</th>
              <th>Sesuai Hasil VKI</th>
              <th>Satuan</th>
            </tr>
          </thead>
          <tbody>
            {capacity.length === 0 && (
              <tr>
                <td colSpan={4}>Belum ada data kapasitas perizinan.</td>
              </tr>
            )}
            {capacity.map((r) => (
              <tr key={r.id}>
                <td>{r.jenisProduk || "—"}</td>
                <td>{n(r.izin)}</td>
                <td>{n(r.vki)}</td>
                <td>{r.satuan || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  return (
    <>
      <h3 className="rd-serif" style={{ fontSize: 15, margin: "18px 0 6px" }}>
        Kebutuhan Bahan Baku dan/atau Bahan Penolong 1 Tahun (Pasal 32 ayat (3) huruf e dan f)
      </h3>
      <table className="rd-table">
        <thead>
          <tr>
            <th>Bahan Baku dan/atau Bahan Penolong</th>
            <th>HS Code</th>
            <th>Sesuai Kapasitas Produksi</th>
            <th>Sesuai Hasil VKI</th>
            <th>Satuan</th>
          </tr>
        </thead>
        <tbody>
          {totals.length === 0 && (
            <tr>
              <td colSpan={5}>Belum ada data konversi bahan baku.</td>
            </tr>
          )}
          {totals.map((r) => (
            <tr key={`${r.hsCode}-${r.bahanBaku}-${r.satuan}`}>
              <td>{r.bahanBaku || "—"}</td>
              <td>{r.hsCode || "—"}</td>
              <td>{n(r.izin)}</td>
              <td>{n(r.vki)}</td>
              <td>{r.satuan || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function statusPill(status: TechnicalModuleStatusValue | undefined) {
  const s = status ?? "PENDING";
  const cls = s === "SESUAI" ? "rd-pill-ok" : s === "SESUAI_CATATAN" ? "rd-pill-warn" : s === "TIDAK_SESUAI" ? "rd-pill-bad" : "rd-pill-neutral";
  return <span className={`rd-pill ${cls}`}>{TECHNICAL_MODULE_STATUS_LABELS[s]}</span>;
}

/**
 * Stat boxes and highlight boxes laid out like the Analisis Teknis tabs (beige boxes in a grid,
 * orange highlight for the key totals) — printed with plain inline styles so they survive the PDF.
 */
function ReportStatGrid({ items, columns = 3 }: { items: { label: string; value: ReactNode; note?: ReactNode }[]; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 10, margin: "0 0 10px" }}>
      {items.map((item) => (
        <div key={item.label} style={{ background: "#f7f2ec", borderRadius: 8, padding: "9px 12px", breakInside: "avoid" }}>
          <div style={{ fontSize: 9.5, color: "#8a7565" }}>{item.label}</div>
          <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "#20180f" }}>
            {item.value}
            {item.note && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 400, color: "#8a7565" }}>{item.note}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportHero({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div
      style={{
        background: "#fdeee6",
        border: "1px solid #e0662e",
        borderRadius: 8,
        padding: "12px 14px",
        margin: "0 0 10px",
        textAlign: "center",
        breakInside: "avoid",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "#8a5a40" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: "#c14a1f" }}>{value}</div>
      {note && <div style={{ marginTop: 2, fontSize: 9.5, color: "#8a5a40" }}>{note}</div>}
    </div>
  );
}

function PageShell({ pageNo, total, companyName, children }: { pageNo: number; total: number; companyName: string; children: ReactNode }) {
  return (
    <section className="rd-sheet rd-ta-page">
      <div className="rd-pagehead">
        <ReportBrandMark variant="head" />
        <div className="rd-classified">INTERNAL — TERBATAS</div>
      </div>
      <div className="rd-body">{children}</div>
      <div className="rd-pagefoot">
        <div>Laporan Analisis Teknis — {companyName}</div>
        <div className="rd-pagefoot-num">
          <span>{pageNo}</span>dari {total}
        </div>
      </div>
    </section>
  );
}

/**
 * Laporan Analisis Teknis — the Technical Analyst's per-module analysis printed in the same report
 * style as the survey and document reports, so it can stand alone or be merged into the LHVIU.
 */
export function TechnicalAnalysisReport({
  assignmentId,
  basePath = "/api/project-manager-workspace",
  backHref,
}: {
  assignmentId: string;
  basePath?: "/api/project-manager-workspace" | "/api/technical-analyst-workspace";
  backHref?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [basePath, "assignments", assignmentId, "technical-report"],
    queryFn: async () => {
      const response = await fetch(`${basePath}/assignments/${assignmentId}/technical-report`);
      if (!response.ok) throw new Error("Laporan tidak ditemukan");
      return ((await response.json()) as { data: TechnicalReportData }).data;
    },
  });
  // Golongan Tarif Listrik is stored as the master-data id — print its label, not the id.
  const { data: tariffs } = useQuery({
    queryKey: ["master-data-electricity-tariff", "report"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/electricity-tariff");
      if (!response.ok) return [];
      return (
        (await response.json()) as {
          data: {
            id: string;
            kelompok: string;
            golongan: string;
            batasDaya: string;
            tarifPerKwh: string;
          }[];
        }
      ).data;
    },
  });
  const inputValue = (key: string, value: string): string => {
    if (key !== "tarifId") return value;
    const t = tariffs?.find((row) => row.id === value);
    return t ? `${t.kelompok} — ${t.golongan} (${t.batasDaya}) · Rp ${t.tarifPerKwh}/kWh` : "—";
  };

  if (isLoading) return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat laporan...</p>;
  if (isError || !data) return <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">Laporan tidak ditemukan.</p>;

  const company = data.companyName;
  const moduleKeys = technicalModuleKeysFor(data.verificationType, data.importTypes) as readonly TechnicalModuleKey[];
  const schemeLabel =
    data.verificationType === "VIU"
      ? `VIU — ${data.importTypes.map((t) => IMPORT_TYPE_LABELS[t] ?? t).join(" + ") || "Jenis Impor belum ditentukan"}`
      : "VKI — Verifikasi Kemampuan Industri";
  const isFinal = data.status === "COMPLETED" || data.status === "RETURNED";
  const isPmApproved = data.pmReviewStatus === "APPROVED";
  const coverDateLabel = isPmApproved ? "TANGGAL TERBIT" : "TANGGAL PENYUSUNAN";
  const coverDateValue = isPmApproved ? data.pmReviewedAt : isFinal ? (data.signatureDate ?? data.validatedAt) : null;
  const docReview = data.documentReportReview;
  const plan = data.konsumsiImportPlan;

  const flowItems: FlowItem[] = [
    {
      kind: "node",
      key: "sum-head",
      node: (
        <>
          <div className="rd-eyebrow">RINGKASAN</div>
          <h2 className="rd-page-title rd-serif">Ringkasan Analisis Teknis</h2>
          <p className="rd-lede">
            Analisis teknis atas permohonan {schemeLabel} {company} dilaksanakan oleh Technical Analyst berdasarkan hasil verifikasi dokumen
            dan verifikasi lapangan, sebagai dasar penerbitan laporan hasil verifikasi.
          </p>
        </>
      ),
    },
    {
      kind: "node",
      key: "sum-modules",
      node: (
        <>
          <table className="rd-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>No</th>
                <th>Modul Analisis</th>
                <th style={{ width: 140 }}>Hasil</th>
              </tr>
            </thead>
            <tbody>
              {moduleKeys.map((key, i) => (
                <tr key={key}>
                  <td>{i + 1}</td>
                  <td>{TECHNICAL_MODULE_LABELS[key]}</td>
                  <td>{statusPill(data.technicalAnalysisData[key]?.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ),
    },
    ...(data.verificationType === "VKI"
      ? ([
          {
            kind: "node",
            key: "sum-lhvki-capacity",
            node: <LhvkiFigures data={data} part="capacity" />,
          },
          {
            kind: "node",
            key: "sum-lhvki-materials",
            node: <LhvkiFigures data={data} part="materials" />,
          },
        ] satisfies FlowItem[])
      : []),
    {
      kind: "node",
      key: "sum-review",
      node: (
        <>
          <div className="rd-card" style={{ marginTop: 18 }}>
            <div className="rd-card-label">REVIEW LAPORAN VERIFIKASI DOKUMEN</div>
            <div className="rd-card-value" style={{ fontSize: 14 }}>
              {docReview.decision
                ? `${DOCUMENT_REPORT_REVIEW_DECISION_LABELS[docReview.decision]} — ${fmtDate(docReview.verifiedAt)}${docReview.verifiedByName ? `, ${docReview.verifiedByName}` : ""}`
                : "Belum direview"}
            </div>
            {docReview.note && <p style={{ margin: "6px 0 0", fontSize: 12 }}>Catatan: {docReview.note}</p>}
          </div>
        </>
      ),
    },
    {
      kind: "node",
      key: "sum-decision",
      node: (
        <>
          <div className="rd-card" style={{ marginTop: 12 }}>
            <div className="rd-card-label">KEPUTUSAN ANALIS</div>
            <div className="rd-card-value" style={{ fontSize: 14 }}>
              {data.status === "COMPLETED"
                ? `Disetujui — ${fmtDate(data.validatedAt)}`
                : data.status === "RETURNED"
                  ? `Dikembalikan untuk Revisi — ${fmtDate(data.validatedAt)}`
                  : "Belum diputuskan"}
            </div>
            {data.validationNotes && <p style={{ margin: "6px 0 0", fontSize: 12 }}>Catatan: {data.validationNotes}</p>}
          </div>
        </>
      ),
    },
    {
      kind: "node",
      key: "sum-sign",
      node: (
        <>
          <div className="rd-card" style={{ marginTop: 12, maxWidth: 280 }}>
            <div className="rd-card-label">DISUSUN OLEH</div>
            <div className="rd-card-value" style={{ fontSize: 14 }}>
              {data.technicalReviewerName ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>Technical Analyst</div>
            {data.signaturePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files?path=${encodeURIComponent(data.signaturePath)}`}
                alt="Tanda tangan"
                style={{ height: 56, marginTop: 8, objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  height: 56,
                  marginTop: 8,
                  borderBottom: "1px dashed #d8cdb8",
                }}
              />
            )}
            <div style={{ fontSize: 11, marginTop: 4 }}>Tanggal: {fmtDate(data.signatureDate ?? (isFinal ? data.validatedAt : null))}</div>
          </div>
        </>
      ),
    },
  ];
  moduleKeys.forEach((key, i) => {
    const mod = data.technicalAnalysisData[key] ?? {};
    const inputs = Object.entries(mod.inputs ?? {}).filter(([, v]) => v && v.trim() && v.trim() !== "<p></p>");
    const plainInputs = inputs.filter(
      ([k, v]) =>
        k !== "rekapBahanBaku" &&
        k !== "kapasitasVki" &&
        // Energi Listrik: hari operasi and tarif are printed in section C below.
        !(key === "listrik" && (k === "hariOperasiPerBulan" || k === "tarifId")) &&
        // Kapasitas: the chosen bottleneck is printed in section B below.
        !(key === "kapasitas" && k === "mesinBottleneck") &&
        !looksLikeHtml(v),
    );
    const rekapBahanBaku = Object.values(parseRekapBahanBaku(mod.inputs?.rekapBahanBaku));
    const noteInputs = inputs.filter(([, v]) => looksLikeHtml(v));
    const asHtml = (v: string) => (looksLikeHtml(v) ? v : textToHtml(v));
    flowItems.push({
      kind: "node",
      key: `${key}-head`,
      breakBefore: true,
      node: (
        <>
          <div className="rd-eyebrow">MODUL {i + 1}</div>
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
            {TECHNICAL_MODULE_LABELS[key]}
          </h2>
          <div style={{ margin: "4px 0 16px" }}>{statusPill(mod.status)}</div>
        </>
      ),
    });
    if (key === "modal" && plan && plan.products.length > 0) {
      flowItems.push({
        kind: "node",
        key: `${key}-plan`,
        node: (
          <table className="rd-table" style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Data dari Permohonan</th>
                <th style={{ width: 220 }}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(plan.totalsByCurrency).map(([currency, value]) => (
                <tr key={currency}>
                  <td>
                    Nilai Rencana Impor ({currency}) — {plan.products.length} produk
                  </td>
                  <td>{fmtMoney(value, currency)}</td>
                </tr>
              ))}
              {data.modalKerjaFromApplication?.konsumsi != null && (
                <tr>
                  <td>Modal Kerja menurut Surat Pernyataan</td>
                  <td>{fmtMoney(data.modalKerjaFromApplication.konsumsi)}</td>
                </tr>
              )}
            </tbody>
          </table>
        ),
      });
    }
    if (key === "listrik") {
      const tariff = tariffs?.find((t) => t.id === mod.inputs?.tarifId) ?? null;
      const tarifNominal = parseNumeric(tariff?.tarifPerKwh);
      const calc = computeListrik(data.machines ?? [], data.electricityMonths ?? [], mod.inputs, tarifNominal);
      const rp = (v: number | null) => (v === null ? "—" : `Rp ${fmtNum(v, 0)}`);
      const sub = (title: string) => (
        <h3 className="rd-serif" style={{ fontSize: 15, margin: "18px 0 6px" }}>
          {title}
        </h3>
      );
      const para = (text: string) => <p style={{ fontSize: 12, lineHeight: 1.6, margin: "0 0 10px", color: "var(--ink-soft, #4a4038)" }}>{text}</p>;
      const formula = (text: string) => (
        <div style={{ background: "#f7f2ec", borderRadius: 6, padding: "9px 12px", margin: "0 0 12px", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>
          {text}
        </div>
      );
      flowItems.push(
        {
          kind: "node",
          key: `${key}-dasar`,
          node: (
            <>
              {sub("A. Dasar Perhitungan")}
              {para(LISTRIK_TEXT.dasar)}
              {formula(LISTRIK_TEXT.dasarFormula)}
            </>
          ),
        },
        {
          kind: "node",
          key: `${key}-beban`,
          node: (
            <>
              {sub("C. Beban Produksi Teoritis")}
              {para(LISTRIK_TEXT.beban)}
              <ReportStatGrid
                items={[
                  { label: "Total Daya Terpasang", value: `${fmtNum(calc.totalPower, 2)} kW` },
                  { label: "Total Power Consumption per Hari", value: `${fmtNum(calc.totalDailyConsumption, 2)} kWh/hari` },
                  { label: "Jumlah Hari Operasi per Bulan", value: `${fmtNum(calc.hariOperasiPerBulan, 2)} hari/bulan` },
                ]}
              />
              {formula(
                `${fmtNum(calc.totalDailyConsumption, 2)} kWh/hari × 85% = ${fmtNum(calc.rataRataBeban, 2)} kWh (mesin) + ${fmtNum(calc.nonOperasional, 2)} kWh (non-operasional, 15%) = ${fmtNum(calc.totalKebutuhanHarian, 2)} kWh/hari`,
              )}
              <ReportHero
                label={`Total Power Consumption Perusahaan per Bulan (${fmtNum(calc.hariOperasiPerBulan, 2)} hari operasi)`}
                value={`${fmtNum(calc.totalMonthlyConsumption, 0)} kWh`}
              />
              <ReportStatGrid
                columns={2}
                items={[
                  { label: "Golongan Tarif Listrik", value: tariff ? `${tariff.kelompok} — ${tariff.golongan} (${tariff.batasDaya})` : "—" },
                  { label: "Tarif Nominal per kWh", value: tarifNominal !== null ? `Rp ${fmtNum(tarifNominal, 2)} / kWh` : "—" },
                ]}
              />
              <ReportHero label="Estimasi Jumlah Pembayaran Listrik per Bulan" value={rp(calc.estimasiPembayaran)} />
            </>
          ),
        },
        {
          kind: "node",
          key: `${key}-tagihan`,
          node: (
            <>
              {sub("D. Analisis Tagihan Listrik terhadap Kapasitas Produksi")}
              {para(LISTRIK_TEXT.tagihan)}
              <table className="rd-table" style={{ marginBottom: 14 }}>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Estimasi Perhitungan</th>
                    <th>Tagihan PLN Aktual</th>
                    <th>Selisih</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.varianceRows.map((row) => (
                    <tr key={row.month.id}>
                      <td style={{ fontWeight: 600 }}>{row.month.bulan || "—"}</td>
                      <td>{rp(calc.estimasiPembayaran)}</td>
                      <td>{rp(row.actualNominal)}</td>
                      <td>{row.variancePct !== null ? `${fmtNum(row.variancePct)}%` : "—"}</td>
                      <td>
                        <span className="rd-pill" style={{ background: row.meta.bg, color: row.meta.color }}>
                          {row.meta.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {calc.varianceRows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--ink-faint)" }}>
                        Belum ada data tagihan listrik.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ),
        },
      );
    }
    if (key === "kapasitas") {
      const b = computeBottleneck(data.machines ?? [], mod.inputs);
      const withUnit = (v: number | null) => (v === null ? "—" : `${fmtNum(v, 0)} ${b.satuanLini}`);
      // A. Data Produksi Mesin — a node is never split across sheets, so the (often long) machine list
      // is printed in chunks of rows, each with its own header; "(lanjutan)" from the second chunk on.
      const MESIN_ROWS_PER_CHUNK = 14;
      const mesinChunks: (typeof b.machineRows)[] = [];
      for (let start = 0; start < Math.max(b.machineRows.length, 1); start += MESIN_ROWS_PER_CHUNK) {
        mesinChunks.push(b.machineRows.slice(start, start + MESIN_ROWS_PER_CHUNK));
      }
      mesinChunks.forEach((rows, chunkIndex) =>
        flowItems.push({
          kind: "node",
          key: `${key}-mesin-${chunkIndex}`,
          node: (
            <>
              {chunkIndex === 0 ? (
                <h3 className="rd-serif" style={{ fontSize: 15, margin: "18px 0 6px" }}>
                  A. Data Produksi Mesin
                </h3>
              ) : (
                <div style={{ fontSize: 10.5, color: "var(--ink-faint)", margin: "4px 0" }}>A. Data Produksi Mesin (lanjutan)</div>
              )}
              <table className="rd-table" style={{ marginBottom: 14, fontSize: 10.5 }}>
                <thead>
                  <tr>
                    <th>Mesin</th>
                    <th>Unit</th>
                    <th>Kapasitas/Unit per Jam</th>
                    <th>Jam Operasi</th>
                    <th>Kapasitas/Hari</th>
                    <th>Hari Efektif</th>
                    <th>Kapasitas/Tahun</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const isBottleneck = b.bottleneck?.id === m.id;
                    return (
                      <tr key={m.id} style={isBottleneck ? { background: "#fbe4de" } : undefined}>
                        <td style={{ fontWeight: 600 }}>
                          {m.nama || "—"}
                          {isBottleneck && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "#c1361f" }}>(Bottleneck)</span>}
                        </td>
                        <td>{m.quantity || "—"}</td>
                        <td>
                          {m.kapasitasJam || "—"} {m.kapasitasJamSatuan}
                        </td>
                        <td>{m.waktuBeroperasi ? `${m.waktuBeroperasi} jam` : "—"}</td>
                        <td style={{ fontWeight: 600 }}>{m.perHari !== null ? `${fmtNum(m.perHari, 2)} ${m.kapasitasJamSatuan}` : "—"}</td>
                        <td>{m.hariEfektifPerTahun ? `${m.hariEfektifPerTahun} hari` : "—"}</td>
                        <td>{m.perTahun !== null ? `${fmtNum(m.perTahun, 0)} ${m.kapasitasJamSatuan}` : "—"}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ color: "var(--ink-faint)" }}>
                        Belum ada data mesin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ),
        }),
      );
      flowItems.push({
        kind: "node",
        key: `${key}-bottleneck`,
        node: (
          <>
            <h3 className="rd-serif" style={{ fontSize: 15, margin: "18px 0 6px" }}>
              B. Penentuan Bottleneck dan Kapasitas Teoritis
            </h3>
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: "0 0 10px", color: "var(--ink-soft, #4a4038)" }}>{BOTTLENECK_TEXT}</p>
            <ReportStatGrid
              items={[
                {
                  label: "Mesin/Proses Bottleneck",
                  value: b.bottleneck?.nama || "—",
                  note: b.bottleneck ? (b.chosenBottleneck ? "(dipilih analis)" : "(otomatis)") : undefined,
                },
                { label: "Kapasitas Lini per Hari", value: withUnit(b.kapasitasLiniHarian) },
                { label: "Kapasitas Lini per Bulan (rata-rata)", value: withUnit(b.kapasitasLiniBulanan) },
              ]}
            />
            <ReportHero
              label="Kapasitas Produksi per Tahun"
              value={withUnit(b.kapasitasLiniTahunan)}
              note={b.kapasitasLiniTahunan !== null ? `(${fmtNum(b.kapasitasLiniHarian, 0)} × ${fmtNum(b.hariEfektif, 0)} hari efektif)` : undefined}
            />
          </>
        ),
      });
    }
    if (key === "bahanbaku" && rekapBahanBaku.length > 0) {
      flowItems.push({
        kind: "node",
        key: `${key}-rekap`,
        node: (
          <table className="rd-table" style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: 32 }}>
                  No
                </th>
                <th rowSpan={2}>Jenis Produksi</th>
                <th rowSpan={2}>Bahan Baku dan/atau Bahan Penolong</th>
                <th colSpan={3} style={{ textAlign: "center" }}>
                  Volume Bahan Baku
                </th>
                <th rowSpan={2}>Satuan</th>
              </tr>
              <tr>
                <th>Berdasarkan Izin</th>
                <th>Berdasarkan VKI</th>
                <th>Berdasarkan Permohonan</th>
              </tr>
            </thead>
            <tbody>
              {rekapBahanBaku.map((r, n) => (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td>{r.produk || "—"}</td>
                  <td>
                    {r.bahanBaku || "—"}
                    {r.hsCode ? ` (HS ${r.hsCode})` : ""}
                  </td>
                  <td>{r.izin || "—"}</td>
                  <td>{r.vki || "—"}</td>
                  <td>{r.permohonan || "—"}</td>
                  <td>{r.satuan || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      });
    }
    flowItems.push({
      kind: "node",
      key: `${key}-inputs`,
      node:
        plainInputs.length > 0 ? (
          <table className="rd-table">
            <thead>
              <tr>
                <th>Data Analisis</th>
                <th style={{ width: 220 }}>Nilai</th>
              </tr>
            </thead>
            <tbody>
              {plainInputs.map(([k, v]) => (
                <tr key={k}>
                  <td>{inputLabel(k)}</td>
                  <td>{inputValue(k, v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Tidak ada data isian analis pada modul ini.</p>
        ),
    });
    for (const [k, v] of noteInputs)
      flowItems.push({
        kind: "note",
        key: `${key}-note-${k}`,
        label: inputLabel(k).toUpperCase(),
        html: v,
      });
    if (mod.keterangan)
      flowItems.push({
        kind: "note",
        key: `${key}-keterangan`,
        label: "KETERANGAN",
        html: asHtml(mod.keterangan),
      });
    flowItems.push({
      kind: "note",
      key: `${key}-kesimpulan`,
      label: "KESIMPULAN ANALIS",
      html: mod.kesimpulan ? asHtml(mod.kesimpulan) : "<p>—</p>",
    });
  });

  return (
    <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <ReportLoadProgress />
      <div className="rd-topbar">
        <Link href={backHref ?? "/project-manager-workspace"} className="rd-back">
          ← Kembali
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Laporan Analisis Teknis{" "}
            <span className="rd-topbar-sub">
              &middot; {company} &middot; {data.assignmentNumber} &middot; {isFinal ? "Final" : "Draf"}
            </span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}>
            Cetak
          </button>
          <CurrentPagePdfButton name={`Laporan-Analisis-Teknis-${assignmentId}`} />
        </div>
      </div>

      <main className="rd-main">
        <section className="rd-sheet rd-cover">
          <div className="rd-cover-topbar" />
          <div className="rd-cover-inner">
            <div className="rd-cover-head">
              <ReportBrandMark variant="cover" />
              <div className="rd-cover-classified">INTERNAL — TERBATAS</div>
            </div>
            <div className="rd-cover-title-block">
              <div className="rd-cover-eyebrow">LAPORAN ANALISIS TEKNIS</div>
              <h1 className="rd-cover-title rd-serif">
                Analisis
                <br />
                Teknis
              </h1>
              <div className="rd-cover-subtitle">
                {company}
                {data.businessAddress && (
                  <>
                    <br />
                    {data.businessAddress}
                  </>
                )}
              </div>
            </div>
            <div className="rd-cover-meta">
              <Meta label="NOMOR DOKUMEN" value={`LT/${data.assignmentNumber}`} mono />
              <Meta label="NOMOR PENUGASAN" value={data.assignmentNumber} mono />
              <Meta label="NOMOR APLIKASI" value={data.applicationNumber} mono />
              <Meta label={coverDateLabel} value={fmtDate(coverDateValue)} />
              <Meta label="DISUSUN OLEH" value={data.technicalReviewerName ?? "—"} />
              <Meta label="JENIS VERIFIKASI" value={schemeLabel} />
            </div>
          </div>
          <div className="rd-cover-foot">
            <div>Lembaga Verifikasi &amp; Survey — {data.verificationType}</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>

        <A4Pages
          items={flowItems}
          renderPage={(pageNo, totalPages, children) => (
            <PageShell pageNo={pageNo} total={totalPages} companyName={company}>
              {children}
            </PageShell>
          )}
        />
      </main>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="rd-cover-meta-label">{label}</div>
      <div className={`rd-cover-meta-value ${mono ? "rd-mono" : ""}`}>{value}</div>
    </div>
  );
}

