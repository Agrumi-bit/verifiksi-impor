"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../material-icon";
import {
  computeFindings,
  computeSectionKinds,
  emptyOfficeVerification,
  DOC_TYPE_DEFS,
  MIN_DOCUMENTATION_REQUIRED,
  OWNERSHIP_QUESTION,
  SECTION2_QUESTIONS,
  SECTION4_QUESTIONS,
  SECTION5_QUESTIONS,
  SECTION_TITLES,
  SEWA_QUESTIONS,
  type AnswerValues,
  type OfficeVerificationValues,
  type SectionKind,
} from "../office-verification/schema";
import { REPORT_CHECKLIST_SECTIONS, reportResultLabels, type ReportChecklistContext } from "@/modules/verifikator-workspace/report-checklist-items";
import type { ReportVerificationState } from "@/modules/verifikator-workspace/report-verification";
import "./office-report-preview.css";

const FONT_LINKS = (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700;8..60,800&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </>
);

type PayloadLocation = {
  buildingStatus?: "MILIK_SENDIRI" | "SEWA" | null;
  ownershipDocuments?: { type: string; documentPath?: string | null }[] | null;
  leaseDocuments?: { type: string; documentPath?: string | null }[] | null;
  leaseOriginalOwnerName?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  province?: string | null;
};

type LocationReportDetail = {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  locationType: string;
  address: string;
  city: string | null;
  submittedAt: string | null;
  createdAt: string;
  officeVerification: OfficeVerificationValues | null;
  assignmentNumber: string;
  applicationNumber: string;
  verificationType: string;
  surveyorName: string | null;
  company: {
    companyName: string;
    nibNumber: string | null;
    nibDocumentPath: string | null;
    notarialDeedNumber: string | null;
    notarialDocumentPath: string | null;
  };
  payloadLocation: PayloadLocation | null;
  reportVerification: ReportVerificationState | null;
};

const DECISION_META: Record<
  NonNullable<ReportVerificationState["decision"]>,
  { label: string; icon: string; color: string }
> = {
  VERIFIED: { label: "Disetujui", icon: "✓", color: "var(--ok-fg)" },
  REJECTED: { label: "Ditolak", icon: "✕", color: "var(--bad-soft-fg)" },
  REVISION: { label: "Revisi Diminta", icon: "◐", color: "var(--gold-soft-ink)" },
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function basename(path: string | null | undefined): string {
  if (!path) return "—";
  return path.split("/").pop() ?? path;
}

function Pill({ kind, children }: { kind: "ok" | "bad" | "warn" | "neutral"; children: ReactNode }) {
  return <span className={`rd-pill rd-pill-${kind}`}>{children}</span>;
}

function answerPill(answer: AnswerValues | undefined) {
  if (!answer || !answer.value) return <Pill kind="warn">Belum Diisi</Pill>;
  return answer.value === "sesuai" ? <Pill kind="ok">Sesuai</Pill> : <Pill kind="bad">Tidak Sesuai</Pill>;
}

function answerCardStyle(answer: AnswerValues | undefined): CSSProperties {
  return answer?.value === "tidak" ? { background: "var(--bad-row-bg)" } : {};
}

function answerDotColor(answer: AnswerValues | undefined): string {
  return answer?.value === "tidak" ? "var(--bad)" : "var(--ok-solid)";
}

function PageShell({
  pageNo,
  companyName,
  id,
  children,
}: {
  pageNo: number;
  companyName: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className="rd-sheet" id={id}>
      <div className="rd-pagehead">
        <div className="rd-brand">
          <div className="rd-brand-mark">IV</div>
          <div className="rd-brand-name">INDUSTRIALVERIFY</div>
        </div>
        <div className="rd-classified">INTERNAL — TERBATAS</div>
      </div>
      <div className="rd-body">{children}</div>
      <div className="rd-pagefoot">
        <div>Laporan Verifikasi Lokasi Kantor — {companyName}</div>
        <div className="rd-pagefoot-num">
          <span>{pageNo}</span>dari 14
        </div>
      </div>
    </section>
  );
}

function SecMark({ n, bad }: { n: string; bad?: boolean }) {
  return (
    <div className="rd-secmark">
      <span className={`rd-secmark-num ${bad ? "rd-secmark-bad" : ""}`}>{n}</span>
      <span className="rd-secmark-label">SECTION {n}</span>
    </div>
  );
}

function QaTable({
  questions,
  answers,
}: {
  questions: { key: string; no: number; title: string; question: string }[];
  answers: Record<string, AnswerValues>;
}) {
  return (
    <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden", marginBottom: 18 }}>
      <table className="rd-table">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>NO</th>
            <th style={{ width: "37%" }}>PERTANYAAN</th>
            <th style={{ width: "16%" }}>STATUS</th>
            <th>CATATAN</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const a = answers[q.key];
            return (
              <tr key={q.key} className={a?.value === "tidak" ? "rd-row-bad" : undefined}>
                <td>{q.no}</td>
                <td>{q.question}</td>
                <td>{answerPill(a)}</td>
                <td style={{ color: "var(--ink-faint)" }}>{a?.value === "tidak" ? a.reason || "—" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SECTION_KIND_META: Record<SectionKind, { label: string; kind: "ok" | "bad" | "warn" }> = {
  ok: { label: "Selesai", kind: "ok" },
  issue: { label: "Ada Ketidaksesuaian", kind: "bad" },
  unfilled: { label: "Belum Diisi", kind: "warn" },
};

type Props = {
  assignmentId: string;
  locationId: string;
  /** API namespace this report is read from — lets other workspaces (e.g. Verifikator) reuse this same read-only template. */
  basePath?:
    | "/api/surveyor-workspace"
    | "/api/verifikator-workspace"
    | "/api/company-workspace"
    | "/api/technical-analyst-workspace"
    | "/api/project-manager-workspace";
  /** "Back to Assignment" destination — defaults to the Surveyor Workspace assignment page. */
  backHref?: string;
};

export function OfficeReportPreview({
  assignmentId,
  locationId,
  basePath = "/api/surveyor-workspace",
  backHref,
}: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [basePath, "assignments", assignmentId, "locations", locationId],
    queryFn: async () => {
      const response = await fetch(`${basePath}/assignments/${assignmentId}/locations/${locationId}`);
      if (!response.ok) throw new Error("Laporan tidak ditemukan");
      const json = (await response.json()) as { data: LocationReportDetail };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat laporan...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">Laporan tidak ditemukan.</p>
    );
  }

  const ov = data.officeVerification ?? emptyOfficeVerification();
  const buildingStatus = data.payloadLocation?.buildingStatus ?? null;
  const isSewa = buildingStatus === "SEWA";
  const findings = computeFindings(ov);
  const kinds = computeSectionKinds(ov, buildingStatus);
  const surveyorName = data.surveyorName ?? "—";
  const docsFilled = Object.values(ov.documentation).filter((d) => d.filePath).length;
  const company = data.company.companyName;
  const reportVerification = data.reportVerification;
  const reviewDecision = reportVerification?.decision ?? null;
  const reviewContext: ReportChecklistContext = {
    applicationNumber: data.applicationNumber,
    companyName: company,
    surveyorName,
    visitDate: ov.actualVisitDate || data.submittedAt,
    address: data.address,
    city: data.city,
    buildingStatus,
    documentationCount: docsFilled,
  };

  const sewaOrOwnershipAnswers = isSewa ? SEWA_QUESTIONS.map((q) => ov.sewaAnswers[q.key]) : [ov.ownershipAnswer];
  const allAnswers = [
    ...SECTION2_QUESTIONS.map((q) => ov.section2Answers[q.key]),
    ...sewaOrOwnershipAnswers,
    ...SECTION4_QUESTIONS.map((q) => ov.section4Answers[q.key]),
    ...SECTION5_QUESTIONS.map((q) => ov.section5Answers[q.key]),
  ];
  const totalQuestions = allAnswers.length;
  const sesuaiCount = allAnswers.filter((a) => a?.value === "sesuai").length;
  const tidakCount = allAnswers.filter((a) => a?.value === "tidak").length;

  const conclusionKind: "ok" | "bad" | "warn" =
    ov.conclusionStatus === "Sesuai" ? "ok" : ov.conclusionStatus === "Tidak Sesuai" ? "bad" : "warn";
  const conclusionIcon = conclusionKind === "bad" ? "✕" : conclusionKind === "warn" ? "?" : "✓";
  const conclusionCheckClass = conclusionKind === "bad" ? "rd-check-bad" : conclusionKind === "warn" ? "rd-check-warn" : "";
  const conclusionRingClass = conclusionKind === "bad" ? "rd-ring-bad" : conclusionKind === "warn" ? "rd-ring-warn" : "";

  const recKind: "ok" | "bad" | "warn" =
    ov.conclusionRecommendation === "Disetujui" ? "ok" : ov.conclusionRecommendation === "Ditolak" ? "bad" : "warn";
  const recIcon = recKind === "bad" ? "✕" : recKind === "warn" ? "?" : "✓";
  const recCheckClass = recKind === "bad" ? "rd-check-bad" : recKind === "warn" ? "rd-check-warn" : "";
  const recRingClass = recKind === "bad" ? "rd-ring-bad" : recKind === "warn" ? "rd-ring-warn" : "";

  const impactKind: "ok" | "bad" | "warn" =
    ov.findingsImpact === "Tidak mempengaruhi kelayakan" ? "ok" : ov.findingsImpact === "Menggagalkan verifikasi" ? "bad" : "warn";
  const impactStyle =
    impactKind === "ok"
      ? { bg: "var(--ok-bg)", label: "var(--ok-fg)", value: "var(--ok-fg-deep)" }
      : impactKind === "bad"
        ? { bg: "var(--bad-soft-bg)", label: "var(--bad-soft-fg)", value: "var(--bad-soft-fg)" }
        : { bg: "var(--gold-soft)", label: "var(--gold-soft-ink)", value: "var(--gold-soft-ink)" };

  const overallText = !ov.conclusionStatus
    ? "Kesimpulan verifikasi belum diisi oleh surveyor."
    : `Kantor ${ov.conclusionStatus}${findings.length > 0 ? ` dengan ${findings.length} Catatan Minor` : ", Tanpa Temuan"}${
        ov.conclusionRecommendation ? ` — Direkomendasikan untuk ${ov.conclusionRecommendation}` : ""
      }`;

  return (
    <div className="report-doc">
      {FONT_LINKS}
      <div className="rd-topbar">
        <Link href={backHref ?? `/surveyor-workspace/assignments/${assignmentId}`} className="rd-back">
          <MaterialIcon name="arrow_back" className="text-base" />
          Kembali ke Assignment
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Laporan Verifikasi Lokasi Kantor{" "}
            <span className="rd-topbar-sub">
              &middot; {company} &middot; {data.assignmentNumber} &middot;{" "}
              {data.status === "COMPLETED" ? "Final" : "Draf (belum disubmit)"}
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
        <section className="rd-sheet rd-cover">
          <div className="rd-cover-topbar" />
          <div className="rd-cover-inner">
            <div className="rd-cover-head">
              <div className="rd-cover-mark">
                <div className="rd-cover-mark-badge">IV</div>
                <div className="rd-cover-mark-text">INDUSTRIALVERIFY</div>
              </div>
              <div className="rd-cover-classified">INTERNAL — TERBATAS</div>
            </div>
            <div className="rd-cover-title-block">
              <div className="rd-cover-eyebrow">LAPORAN VERIFIKASI LAPANGAN</div>
              <h1 className="rd-cover-title rd-serif">
                Verifikasi
                <br />
                Lokasi Kantor
              </h1>
              <div className="rd-cover-subtitle">
                {company}
                <br />
                {data.address}
                {data.city ? `, ${data.city}` : ""}
                {data.payloadLocation?.province ? `, ${data.payloadLocation.province}` : ""}
              </div>
            </div>
            <div className="rd-cover-meta">
              <div>
                <div className="rd-cover-meta-label">NOMOR DOKUMEN</div>
                <div className="rd-cover-meta-value rd-mono">LV-KTR/{data.assignmentNumber}</div>
              </div>
              <div>
                <div className="rd-cover-meta-label">NOMOR PENUGASAN</div>
                <div className="rd-cover-meta-value rd-mono">{data.assignmentNumber}</div>
              </div>
              <div>
                <div className="rd-cover-meta-label">NOMOR APLIKASI</div>
                <div className="rd-cover-meta-value rd-mono">{data.applicationNumber}</div>
              </div>
              <div>
                <div className="rd-cover-meta-label">TANGGAL TERBIT</div>
                <div className="rd-cover-meta-value">{fmtDate(data.submittedAt ?? new Date().toISOString())}</div>
              </div>
              <div>
                <div className="rd-cover-meta-label">DISUSUN OLEH</div>
                <div className="rd-cover-meta-value">{surveyorName}</div>
              </div>
              <div>
                <div className="rd-cover-meta-label">JENIS VERIFIKASI</div>
                <div className="rd-cover-meta-value">{data.verificationType}</div>
              </div>
            </div>
          </div>
          <div className="rd-cover-foot">
            <div>Lembaga Verifikasi &amp; Survey — VKI / VIU</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>

        {/* APPROVAL */}
        <PageShell pageNo={1} companyName={company} id="approval">
          <div className="rd-eyebrow">HALAMAN PERSETUJUAN</div>
          <h2 className="rd-page-title rd-serif">Persetujuan Dokumen</h2>
          <p className="rd-lede">
            Dokumen laporan ini telah disusun berdasarkan hasil observasi lapangan dan diperiksa serta disetujui
            secara berjenjang sebagai bagian dari proses Verifikasi Kemampuan Industri (VKI) sebelum diteruskan
            kepada pemohon dan pihak terkait.
          </p>
          <div className="rd-approval-grid">
            <div className="rd-card-lg" style={{ background: "#fff", padding: 20 }}>
              <span className="rd-approval-badge" style={{ color: "var(--ok-fg)", background: "var(--ok-bg)" }}>
                DISUSUN OLEH
              </span>
              <div className="rd-approval-name">{surveyorName}</div>
              <div className="rd-approval-role">Surveyor Lapangan</div>
              <div className="rd-approval-sign">Tanda tangan</div>
              {data.submittedAt ? (
                <div className="rd-approval-status" style={{ color: "var(--ok-fg)" }}>
                  ✓ {fmtDate(data.submittedAt)}
                </div>
              ) : (
                <div className="rd-approval-status" style={{ color: "var(--gold-soft-ink)" }}>
                  ◐ Menunggu
                </div>
              )}
            </div>
            <div className="rd-card-lg" style={{ background: "#fff", padding: 20 }}>
              <span
                className="rd-approval-badge"
                style={
                  reviewDecision
                    ? { color: "var(--ok-fg)", background: "var(--ok-bg)" }
                    : { color: "var(--ink-faint)", background: "var(--stripe)" }
                }
              >
                DIPERIKSA OLEH
              </span>
              <div className="rd-approval-name" style={reviewDecision ? undefined : { color: "var(--ink-faint)" }}>
                {reportVerification?.verifiedByName ?? "Menunggu penunjukan"}
              </div>
              <div className="rd-approval-role">Verifikator Dokumen</div>
              <div className="rd-approval-sign">Tanda tangan</div>
              {reviewDecision ? (
                <div className="rd-approval-status" style={{ color: DECISION_META[reviewDecision].color }}>
                  {DECISION_META[reviewDecision].icon} {DECISION_META[reviewDecision].label}
                  {reportVerification?.verifiedAt ? ` — ${fmtDate(reportVerification.verifiedAt)}` : ""}
                </div>
              ) : (
                <div className="rd-approval-status" style={{ color: "var(--gold-soft-ink)" }}>
                  ◐ Menunggu
                </div>
              )}
            </div>
            <div className="rd-card-lg" style={{ background: "#fff", padding: 20 }}>
              <span className="rd-approval-badge" style={{ color: "var(--ink-faint)", background: "var(--stripe)" }}>
                DISETUJUI OLEH
              </span>
              <div className="rd-approval-name" style={{ color: "var(--ink-faint)" }}>
                Menunggu penunjukan
              </div>
              <div className="rd-approval-role">Project Manager</div>
              <div className="rd-approval-sign">Tanda tangan</div>
              <div className="rd-approval-status" style={{ color: "var(--gold-soft-ink)" }}>
                ◐ Menunggu
              </div>
            </div>
          </div>
          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
            RIWAYAT DOKUMEN
          </div>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden" }}>
            <table className="rd-table">
              <thead>
                <tr>
                  <th>VERSI</th>
                  <th>STATUS</th>
                  <th>KLASIFIKASI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1.0 — Draf Awal</td>
                  <td>
                    {data.status === "COMPLETED" ? (
                      <Pill kind="ok">Sudah Disubmit</Pill>
                    ) : (
                      <Pill kind="warn">Menunggu Persetujuan</Pill>
                    )}
                  </td>
                  <td>Internal — Terbatas</td>
                </tr>
                {reviewDecision && (
                  <tr>
                    <td>2.0 — Direview Verifikator</td>
                    <td>
                      <Pill kind={reviewDecision === "VERIFIED" ? "ok" : reviewDecision === "REJECTED" ? "bad" : "warn"}>
                        {DECISION_META[reviewDecision].label}
                      </Pill>
                    </td>
                    <td>Internal — Terbatas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageShell>

        {/* TOC */}
        <PageShell pageNo={2} companyName={company} id="toc">
          <div className="rd-eyebrow">DAFTAR ISI</div>
          <h2 className="rd-page-title rd-serif">Daftar Isi</h2>
          <div className="rd-toc-list">
            <a href="#approval" className="rd-toc-row">
              <span className="rd-toc-num">1</span>
              <span className="rd-toc-label">Halaman Persetujuan</span>
            </a>
            <a href="#toc" className="rd-toc-row">
              <span className="rd-toc-num">2</span>
              <span className="rd-toc-label">Daftar Isi</span>
            </a>
            <a href="#ringkasan" className="rd-toc-row">
              <span className="rd-toc-num">3</span>
              <span className="rd-toc-label">Ringkasan Eksekutif</span>
            </a>
            <a href="#info" className="rd-toc-row">
              <span className="rd-toc-num">4</span>
              <span className="rd-toc-label">Informasi Verifikasi</span>
            </a>
            <div className="rd-toc-group">ISI LAPORAN VERIFIKASI</div>
            {SECTION_TITLES.map((title, i) => {
              const pageNo = i <= 1 ? 5 : i + 4;
              const flagged = kinds[i] === "issue";
              return (
                <a key={title} href={`#s${i}`} className={`rd-toc-row ${flagged ? "rd-toc-flagged" : ""}`}>
                  <span className={`rd-toc-num ${flagged ? "rd-toc-num-bad" : "rd-toc-num-gold"}`}>{i}</span>
                  <span className="rd-toc-label">{title}</span>
                  <span className="rd-toc-page">{String(pageNo).padStart(2, "0")}</span>
                </a>
              );
            })}
            <a href="#s9" className="rd-toc-row">
              <span className="rd-toc-num rd-toc-num-gold">9</span>
              <span className="rd-toc-label">Review Keseluruhan Verifikasi</span>
              <span className="rd-toc-page">12</span>
            </a>
            <a href="#verifikator-review" className="rd-toc-row">
              <span className="rd-toc-num rd-toc-num-gold">10</span>
              <span className="rd-toc-label">Pemeriksaan oleh Verifikator</span>
              <span className="rd-toc-page">13</span>
            </a>
            <a href="#lampiran" className="rd-toc-row">
              <span className="rd-toc-num">A</span>
              <span className="rd-toc-label">Lampiran</span>
              <span className="rd-toc-page">14</span>
            </a>
          </div>
        </PageShell>

        {/* EXEC SUMMARY */}
        <PageShell pageNo={3} companyName={company} id="ringkasan">
          <div className="rd-eyebrow">RINGKASAN EKSEKUTIF</div>
          <h2 className="rd-page-title rd-serif">Ringkasan Eksekutif</h2>
          <p className="rd-lede">
            Verifikasi lapangan terhadap lokasi kantor {company} di {data.address}
            {data.city ? `, ${data.city}` : ""} dilaksanakan pada {fmtDate(ov.actualVisitDate)} oleh surveyor
            bersertifikat IndustrialVerify, meliputi kesesuaian alamat, status kepemilikan, kondisi fisik, dan
            aktivitas operasional kantor terhadap dokumen permohonan {data.verificationType}.
          </p>

          <div className="rd-exec-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="rd-exec-banner-icon">
                <span>{data.status === "COMPLETED" ? "✓" : "◐"}</span>
              </div>
              <div>
                <div className="rd-exec-banner-label">Status Laporan</div>
                <div className="rd-exec-banner-big">{data.status === "COMPLETED" ? "TERBIT" : "DRAF"}</div>
                <div className="rd-exec-banner-desc">
                  Laporan hasil survey verifikasi kantor{" "}
                  {data.status === "COMPLETED" ? `telah disusun oleh surveyor pada tanggal ${fmtDate(data.submittedAt)}.` : "masih dalam proses penyusunan oleh surveyor."}
                </div>
              </div>
            </div>
            <div className="rd-exec-banner-right">
              <div className="rd-exec-banner-label">Objek Verifikasi</div>
              <div className="rd-exec-banner-company">{company.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "oklch(0.99 0.01 75 / 0.85)" }}>
                Lokasi Kantor — {data.address}
                {data.city ? `, ${data.city}` : ""}
              </div>
            </div>
          </div>

          <div className="rd-exec-stats">
            <div className="rd-exec-stat" style={{ background: "var(--navy-deep)", color: "#fff" }}>
              <div className="rd-exec-stat-num">{totalQuestions}</div>
              <div className="rd-exec-stat-label" style={{ color: "oklch(0.78 0.03 250)" }}>
                Total Pertanyaan
              </div>
            </div>
            <div className="rd-exec-stat" style={{ background: "var(--ok-bg)" }}>
              <div className="rd-exec-stat-num" style={{ color: "oklch(0.3 0.11 155)" }}>
                {sesuaiCount}
              </div>
              <div className="rd-exec-stat-label" style={{ color: "oklch(0.4 0.08 155)" }}>
                Sesuai
              </div>
            </div>
            <div className="rd-exec-stat" style={{ background: "var(--bad-soft-bg)" }}>
              <div className="rd-exec-stat-num" style={{ color: "oklch(0.5 0.17 25)" }}>
                {tidakCount}
              </div>
              <div className="rd-exec-stat-label" style={{ color: "oklch(0.48 0.13 25)" }}>
                Tidak Sesuai
              </div>
            </div>
            <div className="rd-exec-stat" style={{ background: "#fff", boxShadow: "var(--card-shadow-sm)" }}>
              <span className="rd-approval-badge" style={{ color: "var(--gold-soft-ink)", background: "var(--gold-soft)" }}>
                TEMUAN
              </span>
              <div style={{ fontFamily: "'Source Serif 4',serif", fontWeight: 800, fontSize: 20, color: "oklch(0.35 0.03 60)" }}>
                {findings.length} {findings.length === 1 ? "Minor" : "Temuan"}
              </div>
            </div>
          </div>

          <div className="rd-exec-overall">
            <div className="rd-exec-overall-title">Status Keseluruhan</div>
            <div className="rd-exec-overall-desc">
              Surveyor memberikan kesimpulan atas hasil verifikasi lapangan terhadap kantor perusahaan berdasarkan
              observasi yang telah dilakukan.
            </div>
            <div className="rd-exec-overall-grid">
              <div className="rd-exec-overall-item">
                <div className={`rd-exec-overall-ring ${conclusionRingClass}`}>
                  <span className={`rd-exec-overall-check ${conclusionCheckClass}`}>{conclusionIcon}</span>
                </div>
                <div>
                  <div className="rd-exec-overall-item-label">Status Verifikasi Kantor</div>
                  <div className="rd-exec-overall-item-value">{(ov.conclusionStatus ?? "BELUM DIISI").toUpperCase()}</div>
                </div>
              </div>
              <div className="rd-exec-overall-item">
                <div className={`rd-exec-overall-ring ${recRingClass}`}>
                  <span className={`rd-exec-overall-check ${recCheckClass}`}>{recIcon}</span>
                </div>
                <div>
                  <div className="rd-exec-overall-item-label">Rekomendasi Surveyor</div>
                  <div className="rd-exec-overall-item-value">{(ov.conclusionRecommendation ?? "BELUM DIISI").toUpperCase()}</div>
                </div>
              </div>
            </div>
            <div className="rd-exec-overall-foot">
              <span className="rd-exec-overall-foot-badge">✓</span>
              <div>
                <div className="rd-exec-overall-foot-label">STATUS KESELURUHAN</div>
                <div className="rd-exec-overall-foot-text rd-serif">{overallText}</div>
              </div>
            </div>
          </div>
        </PageShell>

        {/* INFO VERIFIKASI */}
        <PageShell pageNo={4} companyName={company} id="info">
          <div className="rd-eyebrow">INFORMASI VERIFIKASI</div>
          <h2 className="rd-page-title rd-serif">Informasi Verifikasi</h2>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden" }}>
            <table className="rd-table">
              <tbody>
                <tr><td style={{ width: "44%", color: "var(--ink-faint)" }}>Nama Perusahaan</td><td style={{ fontWeight: 600 }}>{company}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Nomor Penugasan</td><td style={{ fontWeight: 600 }} className="rd-mono">{data.assignmentNumber}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Nomor Aplikasi</td><td style={{ fontWeight: 600 }} className="rd-mono">{data.applicationNumber}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Jenis Verifikasi</td><td style={{ fontWeight: 600 }}>{data.verificationType}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Lokasi yang Diverifikasi</td><td style={{ fontWeight: 600 }}>Kantor (Main Office)</td></tr>
                <tr>
                  <td style={{ color: "var(--ink-faint)" }}>Alamat</td>
                  <td style={{ fontWeight: 600 }}>
                    {data.address}
                    {data.city ? `, ${data.city}` : ""}
                    {data.payloadLocation?.province ? `, ${data.payloadLocation.province}` : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--ink-faint)" }}>Status Kepemilikan</td>
                  <td style={{ fontWeight: 600 }}>{buildingStatus === "SEWA" ? "Sewa" : buildingStatus === "MILIK_SENDIRI" ? "Milik Sendiri" : "—"}</td>
                </tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Tanggal Ditugaskan</td><td style={{ fontWeight: 600 }}>{fmtDate(ov.assignedDate)}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Tanggal Kunjungan Aktual</td><td style={{ fontWeight: 600 }}>{fmtDate(ov.actualVisitDate)}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Nama Surveyor</td><td style={{ fontWeight: 600 }}>{surveyorName}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Tanggal Laporan Diterbitkan</td><td style={{ fontWeight: 600 }}>{fmtDate(data.submittedAt)}</td></tr>
                <tr><td style={{ color: "var(--ink-faint)" }}>Klasifikasi Dokumen</td><td style={{ fontWeight: 600 }}>Internal — Terbatas</td></tr>
              </tbody>
            </table>
          </div>
        </PageShell>

        {/* SECTION 0 + 1 */}
        <PageShell pageNo={5} companyName={company}>
          <div id="s0" />
          <SecMark n="0" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
            Tanggal Verifikasi
          </h2>
          <p className="rd-lede" style={{ marginBottom: 16 }}>
            Konfirmasi tanggal penugasan dan tanggal aktual kunjungan verifikasi lapangan terhadap lokasi kantor.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 14 }}>
            <div className="rd-card">
              <div className="rd-card-label">TANGGAL DITUGASKAN</div>
              <div className="rd-card-value">{fmtDate(ov.assignedDate)}</div>
            </div>
            <div className="rd-card">
              <div className="rd-card-label">TANGGAL KUNJUNGAN AKTUAL</div>
              <div className="rd-card-value">{fmtDate(ov.actualVisitDate)}</div>
            </div>
          </div>
          <div className="rd-note" style={{ marginBottom: 30 }}>
            <div className="rd-note-label">Keterangan Surveyor</div>
            <div className="rd-note-body">{ov.dateNotes || "Tidak ada keterangan tambahan."}</div>
          </div>

          <div id="s1" />
          <SecMark n="1" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
            Kesesuaian Lokasi Berdasarkan Dokumen Resmi
          </h2>
          <p className="rd-lede" style={{ marginBottom: 16 }}>
            Alamat kantor yang dikunjungi dicocokkan dengan alamat yang tercantum pada dokumen legal perusahaan
            berikut.
          </p>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden" }}>
            <table className="rd-table">
              <thead>
                <tr style={{ background: "var(--navy-deep)" }}>
                  <th style={{ width: "6%" }}>NO</th>
                  <th style={{ width: "26%" }}>SUMBER DOKUMEN</th>
                  <th>ALAMAT</th>
                  <th style={{ width: "13%" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {ov.section1Docs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--ink-faint)" }}>
                      Tidak ada dokumen resmi yang diperiksa.
                    </td>
                  </tr>
                ) : (
                  ov.section1Docs.map((doc, i) => (
                    <tr key={doc.key}>
                      <td style={{ color: "var(--ink-faintest)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{doc.name}</td>
                      <td>{doc.addressText || "belum diisi"}</td>
                      <td>
                        {doc.status === "approved" ? (
                          <Pill kind="ok">Sesuai</Pill>
                        ) : doc.status === "rejected" ? (
                          <Pill kind="bad">Tidak Sesuai</Pill>
                        ) : (
                          <Pill kind="warn">Belum Diperiksa</Pill>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageShell>

        {/* SECTION 2 */}
        <PageShell pageNo={6} companyName={company} id="s2">
          <SecMark n="2" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 24 }}>
            Identifikasi Lokasi Kantor
          </h2>
          <p className="rd-lede">Observasi langsung terhadap lokasi kantor untuk memastikan kesesuaian dengan permohonan.</p>
          <QaTable questions={SECTION2_QUESTIONS} answers={ov.section2Answers} />
          <div className="rd-card">
            <div className="rd-card-label" style={{ textTransform: "uppercase" }}>
              Catatan Surveyor
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "oklch(0.3 0.02 60)" }}>{ov.section2Notes || "Tidak ada catatan tambahan."}</div>
          </div>
        </PageShell>

        {/* SECTION 3 */}
        <PageShell pageNo={7} companyName={company} id="s3">
          <SecMark n="3" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 21 }}>
            Status Kepemilikan Kantor
          </h2>
          <p className="rd-lede" style={{ marginBottom: 14 }}>
            Status kepemilikan bangunan kantor diverifikasi terhadap dokumen yang disampaikan perusahaan.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 12 }}>
            <div className="rd-card">
              <div className="rd-card-label">STATUS BANGUNAN</div>
              <div className="rd-card-value" style={{ fontSize: 13.5 }}>
                {buildingStatus === "SEWA" ? "Sewa" : buildingStatus === "MILIK_SENDIRI" ? "Milik Sendiri" : "—"}
              </div>
            </div>
            <div className="rd-card">
              <div className="rd-card-label">{isSewa ? "DOKUMEN SEWA" : "DOKUMEN KEPEMILIKAN"}</div>
              <div className="rd-card-value" style={{ fontSize: 13.5 }}>
                {((isSewa ? data.payloadLocation?.leaseDocuments : data.payloadLocation?.ownershipDocuments) ?? []).length > 0
                  ? "Tersedia & Diperiksa"
                  : "Belum Diunggah"}
              </div>
            </div>
          </div>

          {isSewa && (
            <div className="rd-card" style={{ marginBottom: 12 }}>
              <div className="rd-card-label">DATA PERJANJIAN SEWA</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, fontSize: 12.5 }}>
                <div>
                  <div style={{ color: "var(--ink-faint)", marginBottom: 2 }}>Pemilik</div>
                  <div style={{ fontWeight: 600 }}>{data.payloadLocation?.leaseOriginalOwnerName || "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--ink-faint)", marginBottom: 2 }}>Mulai Sewa</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(data.payloadLocation?.leaseStartDate)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--ink-faint)", marginBottom: 2 }}>Berakhir Sewa</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(data.payloadLocation?.leaseEndDate)}</div>
                </div>
              </div>
            </div>
          )}

          {isSewa ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {SEWA_QUESTIONS.map((q) => (
                <div
                  key={q.key}
                  className="rd-card"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, ...answerCardStyle(ov.sewaAnswers[q.key]) }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: answerDotColor(ov.sewaAnswers[q.key]), flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, maxWidth: "70%" }}>{q.question}</div>
                  </div>
                  {answerPill(ov.sewaAnswers[q.key])}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rd-card"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, ...answerCardStyle(ov.ownershipAnswer) }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: answerDotColor(ov.ownershipAnswer), flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, maxWidth: "70%" }}>{OWNERSHIP_QUESTION.question}</div>
              </div>
              {answerPill(ov.ownershipAnswer)}
            </div>
          )}

          <div className="rd-note">
            <div className="rd-note-label">Catatan Surveyor</div>
            <div className="rd-note-body">{ov.section3Notes || "Tidak ada catatan tambahan."}</div>
          </div>
        </PageShell>

        {/* SECTION 4 */}
        <PageShell pageNo={8} companyName={company} id="s4">
          <SecMark n="4" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 21, marginBottom: 6 }}>
            Keberadaan dan Kondisi Fisik Kantor
          </h2>
          <p className="rd-lede" style={{ fontSize: 11.5, marginBottom: 10 }}>
            Verifikasi dilakukan untuk memastikan bahwa kantor perusahaan memiliki kondisi fisik yang memadai dan
            dapat digunakan untuk kegiatan operasional perusahaan. Surveyor melakukan observasi langsung terhadap
            fasilitas kantor yang tersedia.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {SECTION4_QUESTIONS.map((q) => (
              <div key={q.key} className="rd-qrow" style={answerCardStyle(ov.section4Answers[q.key])}>
                <div>
                  <div className="rd-qrow-title">
                    {q.no}. {q.title}
                  </div>
                  <div className="rd-qrow-desc">{q.question}</div>
                </div>
                {answerPill(ov.section4Answers[q.key])}
              </div>
            ))}
          </div>
          <div className="rd-note" style={{ padding: "12px 16px" }}>
            <div className="rd-note-label">Catatan Surveyor</div>
            <div className="rd-note-body" style={{ fontSize: 11.5 }}>{ov.section4Notes || "Tidak ada catatan tambahan."}</div>
          </div>
        </PageShell>

        {/* SECTION 5 */}
        <PageShell pageNo={9} companyName={company} id="s5">
          <SecMark n="5" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 24 }}>
            Aktivitas Operasional Kantor
          </h2>
          <p className="rd-lede">Observasi terhadap aktivitas yang berlangsung di kantor pada saat verifikasi dilakukan.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {SECTION5_QUESTIONS.map((q) => (
              <div key={q.key} className="rd-qrow" style={{ borderRadius: 12, padding: "12px 16px", ...answerCardStyle(ov.section5Answers[q.key]) }}>
                <span className="rd-qrow-simple">{q.question}</span>
                {answerPill(ov.section5Answers[q.key])}
              </div>
            ))}
          </div>
          <div className="rd-card">
            <div className="rd-card-label" style={{ textTransform: "uppercase" }}>
              Catatan Surveyor
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "oklch(0.3 0.02 60)" }}>{ov.section5Notes || "Tidak ada catatan tambahan."}</div>
          </div>
        </PageShell>

        {/* SECTION 6 */}
        <PageShell pageNo={10} companyName={company} id="s6">
          <SecMark n="6" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 24 }}>
            Dokumentasi Lapangan
          </h2>
          <p className="rd-lede">
            Dokumentasi visual yang menunjukkan kondisi kantor perusahaan pada saat verifikasi lapangan dilakukan (
            {docsFilled} dari {DOC_TYPE_DEFS.length} diunggah, minimal {MIN_DOCUMENTATION_REQUIRED}).
          </p>
          <div className="rd-photo-grid">
            {DOC_TYPE_DEFS.map((dt) => {
              const item = ov.documentation[dt.key];
              return (
                <div className="rd-photo-card" key={dt.key}>
                  <div className={`rd-photo-thumb ${item?.filePath ? "rd-photo-filled" : ""}`}>
                    <MaterialIcon name={item?.filePath ? "image" : "hide_image"} className="text-2xl" />
                  </div>
                  <div className="rd-photo-name">{dt.label}</div>
                  <div className="rd-photo-caption">{item?.filePath ? item.caption || "Terunggah" : "Belum diunggah"}</div>
                </div>
              );
            })}
          </div>
        </PageShell>

        {/* SECTION 7 */}
        <PageShell pageNo={11} companyName={company} id="s7">
          <SecMark n="7" bad />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 23 }}>
            Review Temuan Ketidaksesuaian
          </h2>
          <p className="rd-lede">Ringkasan temuan berstatus &ldquo;Tidak Sesuai&rdquo; dari Section 1–6 beserta klarifikasi surveyor.</p>

          {findings.length === 0 ? (
            <div className="rd-card" style={{ marginBottom: 18 }}>
              Tidak ditemukan ketidaksesuaian pada seluruh section.
            </div>
          ) : (
            findings.map((f) => (
              <div className="rd-finding-card" key={f.no}>
                <div className="rd-finding-tag">
                  <span className="rd-finding-x">✕</span>
                  <span className="rd-finding-tag-label">
                    TEMUAN {f.no} — {f.section.toUpperCase()}
                  </span>
                </div>
                <div className="rd-finding-q rd-serif">{f.question}</div>
                <div className="rd-finding-note">{f.note || "—"}</div>
              </div>
            ))
          )}

          <div className="rd-card-lg" style={{ background: "#fff", padding: "16px 18px", marginBottom: 16 }}>
            <div className="rd-card-label" style={{ textTransform: "uppercase" }}>
              Klarifikasi Surveyor
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "oklch(0.3 0.02 60)" }}>{ov.findingsExplanation || "—"}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            <div className="rd-card" style={{ background: impactStyle.bg }}>
              <div className="rd-card-label" style={{ color: impactStyle.label }}>
                DAMPAK TERHADAP VERIFIKASI
              </div>
              <div className="rd-card-value" style={{ color: impactStyle.value }}>
                {ov.findingsImpact || "—"}
              </div>
            </div>
            <div className="rd-card">
              <div className="rd-card-label">REKOMENDASI SURVEYOR</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>{ov.findingsRecommendation || "—"}</div>
            </div>
          </div>
        </PageShell>

        {/* SECTION 8 + 9 */}
        <PageShell pageNo={12} companyName={company}>
          <div id="s8" />
          <SecMark n="8" />
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
            Kesimpulan Verifikasi Kantor
          </h2>
          <p className="rd-lede" style={{ marginBottom: 14 }}>
            Kesimpulan atas hasil verifikasi lapangan terhadap kantor perusahaan berdasarkan observasi pada section
            sebelumnya.
          </p>
          <div className="rd-conclusion-grid">
            <div className="rd-card">
              <div className="rd-card-label">STATUS VERIFIKASI KANTOR</div>
              <div className="rd-conclusion-value">
                <span className={`rd-conclusion-check ${conclusionCheckClass}`}>{conclusionIcon}</span>
                <span
                  className="rd-serif"
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: conclusionKind === "bad" ? "var(--bad-soft-fg)" : conclusionKind === "warn" ? "var(--gold-soft-ink)" : "var(--ok-fg-deep)",
                  }}
                >
                  {ov.conclusionStatus ?? "Belum Diisi"}
                </span>
              </div>
            </div>
            <div className="rd-card">
              <div className="rd-card-label">REKOMENDASI SURVEYOR</div>
              <div className="rd-card-value">{ov.conclusionRecommendation ?? "Belum Diisi"}</div>
            </div>
          </div>
          <div style={{ borderRadius: 16, background: "var(--navy-deep)", padding: "18px 20px", marginBottom: 26 }}>
            <div style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>
              Ringkasan Hasil Verifikasi
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.65, color: "oklch(0.9 0.01 250)" }}>
              {ov.conclusionSummary || "Belum ada ringkasan yang diisi surveyor."}
            </div>
          </div>

          <div id="s9" />
          <div className="rd-secmark" style={{ marginBottom: 10 }}>
            <span className="rd-secmark-num">9</span>
            <span className="rd-secmark-label">SECTION 9 — REVIEW KESELURUHAN VERIFIKASI</span>
          </div>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden" }}>
            <table className="rd-table">
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>SECTION</th>
                  <th>JUDUL</th>
                  <th style={{ width: "22%" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {SECTION_TITLES.map((title, i) => {
                  const meta = SECTION_KIND_META[kinds[i]];
                  return (
                    <tr key={title}>
                      <td style={{ color: "var(--ink-faint)" }}>Section {i}</td>
                      <td>{title}</td>
                      <td>
                        <Pill kind={meta.kind}>{meta.label}</Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageShell>

        {/* PEMERIKSAAN OLEH VERIFIKATOR */}
        <PageShell pageNo={13} companyName={company} id="verifikator-review">
          <div className="rd-eyebrow">PEMERIKSAAN OLEH VERIFIKATOR</div>
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 22 }}>
            Uraian Verifikasi Laporan Hasil Survei
          </h2>
          <p className="rd-lede" style={{ marginBottom: 14 }}>
            Hasil pemeriksaan administratif dan lokasi/fasilitas atas laporan ini oleh verifikator dokumen, sebelum
            diteruskan untuk persetujuan Project Manager.
          </p>

          {!reviewDecision && (
            <div className="rd-card-lg" style={{ background: "#fff", padding: 20, marginBottom: 18 }}>
              <span className="rd-approval-status" style={{ color: "var(--gold-soft-ink)" }}>
                ◐ Laporan ini belum direview oleh verifikator.
              </span>
            </div>
          )}

          {REPORT_CHECKLIST_SECTIONS.map((section) => (
            <div key={section.key} style={{ marginBottom: 18 }}>
              <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
                {section.title}
              </div>
              <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden" }}>
                <table className="rd-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>NO</th>
                      <th style={{ width: "30%" }}>ITEM</th>
                      <th style={{ width: "20%" }}>DATA SISTEM</th>
                      <th style={{ width: "15%" }}>HASIL</th>
                      <th>CATATAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => {
                      const result = reportVerification?.items[item.id];
                      const labels = reportResultLabels(item);
                      const sourceValue = item.getValue?.(reviewContext);
                      return (
                        <tr key={item.id} className={result?.result === "FAIL" ? "rd-row-bad" : undefined}>
                          <td>{item.no}</td>
                          <td>{item.title}</td>
                          <td style={{ color: "var(--ink-faint)" }}>{sourceValue || "—"}</td>
                          <td>
                            {!result?.result ? (
                              <Pill kind="warn">Belum Diisi</Pill>
                            ) : result.result === "PASS" ? (
                              <Pill kind="ok">{labels.pass}</Pill>
                            ) : result.result === "FAIL" ? (
                              <Pill kind="bad">{labels.fail}</Pill>
                            ) : (
                              <Pill kind="warn">{labels.na}</Pill>
                            )}
                          </td>
                          <td style={{ color: "var(--ink-faint)" }}>{result?.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {reviewDecision && (
            <div style={{ borderRadius: 16, background: "var(--navy-deep)", padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>
                Keputusan Verifikator
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.65, color: "oklch(0.9 0.01 250)" }}>
                {DECISION_META[reviewDecision].icon} {DECISION_META[reviewDecision].label} oleh {reportVerification?.verifiedByName} —{" "}
                {fmtDate(reportVerification?.verifiedAt)}
                {reportVerification?.decisionNote ? ` — "${reportVerification.decisionNote}"` : ""}
              </div>
            </div>
          )}
        </PageShell>

        {/* LAMPIRAN */}
        <PageShell pageNo={14} companyName={company} id="lampiran">
          <div className="rd-eyebrow">LAMPIRAN</div>
          <h2 className="rd-page-title rd-serif" style={{ fontSize: 25 }}>
            Lampiran
          </h2>

          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
            A. DOKUMEN RUJUKAN
          </div>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden", marginBottom: 20 }}>
            <table className="rd-table">
              <tbody>
                <tr>
                  <td style={{ width: "8%", color: "var(--ink-faint)" }}>01</td>
                  <td>NIB — Nomor Induk Berusaha</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }} className="rd-mono">
                    {data.company.nibNumber || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--ink-faint)" }}>02</td>
                  <td>Akta Notaris</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }} className="rd-mono">
                    {data.company.notarialDeedNumber || "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--ink-faint)" }}>03</td>
                  <td>{isSewa ? "Dokumen Sewa Lokasi" : "Dokumen Kepemilikan Lokasi"}</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }} className="rd-mono">
                    {(isSewa ? data.payloadLocation?.leaseDocuments : data.payloadLocation?.ownershipDocuments)
                      ?.map((entry) => basename(entry.documentPath))
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
            B. INDEKS DOKUMENTASI FOTO
          </div>
          <div className="rd-card-lg" style={{ background: "#fff", overflow: "hidden", marginBottom: 20 }}>
            <table className="rd-table">
              <tbody>
                {DOC_TYPE_DEFS.map((dt, i) => (
                  <tr key={dt.key}>
                    <td style={{ width: "8%", color: "var(--ink-faint)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td>{dt.label}</td>
                    <td style={{ textAlign: "right", color: "var(--ink-faint)" }}>
                      {ov.documentation[dt.key]?.filePath ? fmtDate(data.submittedAt) : "belum diunggah"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
            C. RIWAYAT PERUBAHAN DOKUMEN
          </div>
          <div className="rd-card" style={{ marginBottom: reviewDecision ? 10 : 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "var(--ink)", marginBottom: 2 }}>Versi 1.0</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
              Draf disusun oleh surveyor — {fmtDate(data.submittedAt ?? ov.actualVisitDate)}
            </div>
          </div>
          {reviewDecision && (
            <div className="rd-card">
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--ink)", marginBottom: 2 }}>Versi 2.0</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                Direview oleh {reportVerification?.verifiedByName} — {fmtDate(reportVerification?.verifiedAt)}
              </div>
            </div>
          )}
        </PageShell>
      </main>
    </div>
  );
}
