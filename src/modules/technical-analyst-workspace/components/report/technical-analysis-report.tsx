"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";

import { ReportBrandMark } from "@/modules/surveyor-workspace/components/report/report-brand-mark";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "@/components/form/rich-text-editor.css";
import { formatAssignmentDate } from "@/lib/assignment-date";
import type { KonsumsiImportPlan } from "@/modules/applications/viu-import-plan";
import {
  TECHNICAL_MODULE_LABELS,
  TECHNICAL_MODULE_STATUS_LABELS,
  technicalModuleKeysFor,
  type TechnicalModuleKey,
  type TechnicalModuleStatusValue,
} from "../../status";
import {
  DOCUMENT_REPORT_REVIEW_DECISION_LABELS,
  type DocumentReportReview,
} from "../../document-report-review";

type ModuleData = { status?: TechnicalModuleStatusValue; keterangan?: string; kesimpulan?: string; inputs?: Record<string, string> };

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
  validatedAt: string | null;
  validationNotes: string | null;
  pmReviewStatus: string | null;
  pmReviewedAt: string | null;
  technicalAnalysisData: Record<string, ModuleData>;
  documentReportReview: DocumentReportReview;
  konsumsiImportPlan: KonsumsiImportPlan | null;
  modalKerjaFromApplication: { bahanBaku: number | null; konsumsi: number | null } | null;
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
  tarifId: "Golongan Tarif Listrik",
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

function Html({ html }: { html: string }) {
  return <div className="rte-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }) }} />;
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function statusPill(status: TechnicalModuleStatusValue | undefined) {
  const s = status ?? "PENDING";
  const cls = s === "SESUAI" ? "rd-pill-ok" : s === "TIDAK_SESUAI" ? "rd-pill-bad" : "rd-pill-neutral";
  return <span className={`rd-pill ${cls}`}>{TECHNICAL_MODULE_STATUS_LABELS[s]}</span>;
}

function PageShell({ pageNo, total, companyName, children }: { pageNo: number; total: number; companyName: string; children: ReactNode }) {
  return (
    <section className="rd-sheet">
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
  basePath?: "/api/project-manager-workspace";
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
  const coverDateValue = isPmApproved ? data.pmReviewedAt : isFinal ? data.validatedAt : null;
  const total = 1 + moduleKeys.length;
  const docReview = data.documentReportReview;
  const plan = data.konsumsiImportPlan;

  return (
    <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
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
          <button type="button" className="rd-btn rd-btn-primary" onClick={() => window.print()}>
            Unduh PDF
          </button>
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

        <PageShell pageNo={1} total={total} companyName={company}>
          <div className="rd-eyebrow">RINGKASAN</div>
          <h2 className="rd-page-title rd-serif">Ringkasan Analisis Teknis</h2>
          <p className="rd-lede">
            Analisis teknis atas permohonan {schemeLabel} {company} dilaksanakan oleh Technical Analyst berdasarkan
            hasil verifikasi dokumen dan verifikasi lapangan, sebagai dasar penerbitan laporan hasil verifikasi.
          </p>
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

          <div className="rd-card" style={{ marginTop: 18 }}>
            <div className="rd-card-label">REVIEW LAPORAN VERIFIKASI DOKUMEN</div>
            <div className="rd-card-value" style={{ fontSize: 14 }}>
              {docReview.decision
                ? `${DOCUMENT_REPORT_REVIEW_DECISION_LABELS[docReview.decision]} — ${fmtDate(docReview.verifiedAt)}${docReview.verifiedByName ? `, ${docReview.verifiedByName}` : ""}`
                : "Belum direview"}
            </div>
            {docReview.note && <p style={{ margin: "6px 0 0", fontSize: 12 }}>Catatan: {docReview.note}</p>}
          </div>

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
        </PageShell>

        {moduleKeys.map((key, i) => {
          const mod = data.technicalAnalysisData[key] ?? {};
          const inputs = Object.entries(mod.inputs ?? {}).filter(([, v]) => v && v.trim() && v.trim() !== "<p></p>");
          const plainInputs = inputs.filter(([, v]) => !looksLikeHtml(v));
          const noteInputs = inputs.filter(([, v]) => looksLikeHtml(v));
          return (
            <PageShell key={key} pageNo={i + 2} total={total} companyName={company}>
              <div className="rd-eyebrow">MODUL {i + 1}</div>
              <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
                {TECHNICAL_MODULE_LABELS[key]}
              </h2>
              <div style={{ margin: "4px 0 16px" }}>{statusPill(mod.status)}</div>

              {key === "modal" && plan && plan.products.length > 0 && (
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
                        <td>Nilai Rencana Impor ({currency}) — {plan.products.length} produk</td>
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
              )}

              {plainInputs.length > 0 ? (
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
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: 12, color: "var(--ink-faint)" }}>Tidak ada data isian analis pada modul ini.</p>
              )}

              {noteInputs.map(([k, v]) => (
                <Block key={k} label={inputLabel(k).toUpperCase()}>
                  <Html html={v} />
                </Block>
              ))}
              {mod.keterangan && (
                <Block label="KETERANGAN">{looksLikeHtml(mod.keterangan) ? <Html html={mod.keterangan} /> : mod.keterangan}</Block>
              )}
              <Block label="KESIMPULAN ANALIS">
                {mod.kesimpulan ? looksLikeHtml(mod.kesimpulan) ? <Html html={mod.kesimpulan} /> : mod.kesimpulan : "—"}
              </Block>
            </PageShell>
          );
        })}
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

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rd-note" style={{ marginTop: 14 }}>
      <div className="rd-note-label">{label}</div>
      <div className="rd-note-body" style={{ fontSize: 12.5 }}>
        {children}
      </div>
    </div>
  );
}
