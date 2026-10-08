"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "./lhviu-combined.css";
import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";
import { DocumentVerificationReport } from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { TechnicalAnalysisReport } from "@/modules/technical-analyst-workspace/components/report/technical-analysis-report";
import { decodeLhviuItems, type LhviuDocumentInfo, type LhviuItem, type LhviuMode, type LhviuOrder } from "./lhviu";
import { LhviuPdfPages } from "./lhviu-pdf-pages";

const BASE = "/api/project-manager-workspace" as const;

function Part({ item }: { item: LhviuItem }) {
  return (
    <div className="lhviu-part">
      {item.kind === "survey" && <ReportRouter assignmentId={item.assignmentNumber} locationId={item.visitId} basePath={BASE} />}
      {item.kind === "dokumen" && <DocumentVerificationReport assignmentId={item.assignmentNumber} basePath={BASE} />}
      {item.kind === "teknis" && <TechnicalAnalysisReport assignmentId={item.assignmentNumber} basePath={BASE} />}
    </div>
  );
}

/**
 * LHVIU merged report. "Laporan Verifikasi" = the reports ticked in the LHVIU tab, one after another
 * as a single printable document. "Laporan Lengkap" = that plus the uploaded Laporan Hasil VIU PDF
 * (rendered page by page), in the chosen order. Print / "Unduh PDF" saves it as one file.
 */
export function LhviuCombinedReport({
  type,
  applicationNumber,
  mode,
  itemsParam,
  order = "lhviu-first",
}: {
  type: string;
  applicationNumber: string;
  mode: LhviuMode;
  itemsParam: string | null;
  order?: LhviuOrder;
}) {
  const items = decodeLhviuItems(itemsParam);
  const { data: lhviu, isLoading } = useQuery({
    queryKey: ["project-manager-workspace", "lhviu", applicationNumber],
    enabled: mode === "laporan-lengkap",
    queryFn: async () => {
      const response = await fetch(`${BASE}/applications/${type}/${applicationNumber}/lhviu`);
      if (!response.ok) throw new Error("Gagal memuat LHVIU");
      return ((await response.json()) as { data: { document: LhviuDocumentInfo } }).data.document;
    },
  });

  const title = mode === "laporan-lengkap" ? "Laporan Lengkap LHVIU" : "Laporan Verifikasi";
  const verifikasi = items.map((item, i) => <Part key={`${item.kind}-${i}`} item={item} />);
  const hasilViu =
    mode === "laporan-lengkap" ? (
      isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Memuat Laporan Hasil VIU...</p>
      ) : lhviu ? (
        <div className="lhviu-part">
          <div className="lhviu-divider">LAPORAN HASIL VERIFIKASI IMPORTIR UMUM</div>
          <LhviuPdfPages path={lhviu.path} />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-destructive">Laporan Hasil VIU belum diunggah.</p>
      )
    ) : null;

  return (
    <div className="lhviu-combined">
      <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
        <div className="rd-topbar">
          <Link href={`/project-manager-workspace/applications/${type}/${applicationNumber}?tab=LHVIU`} className="rd-back">
            ← Kembali ke Permohonan
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rd-topbar-title">
              {title} <span className="rd-topbar-sub">&middot; {applicationNumber} &middot; {items.length} laporan</span>
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
      </div>

      {items.length === 0 && mode === "laporan-verifikasi" && (
        <p className="py-10 text-center text-sm text-muted-foreground">Belum ada laporan yang dipilih.</p>
      )}

      {mode === "laporan-lengkap" && order === "lhviu-first" ? (
        <>
          {hasilViu}
          {verifikasi}
        </>
      ) : (
        <>
          {verifikasi}
          {hasilViu}
        </>
      )}
    </div>
  );
}
