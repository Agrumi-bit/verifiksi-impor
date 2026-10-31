"use client";

import Link from "next/link";
import { Fragment, useMemo, type ReactNode } from "react";

import { ReportBrandMark } from "@/modules/surveyor-workspace/components/report/report-brand-mark";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import { A4Pages, type FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CurrentPagePdfButton } from "@/modules/technical-analyst-workspace/components/report/pdf-download-button";
import { COMPLIANCE_HOME } from "../../navigation";
import type { ComplianceReport, ReportBlock, ReportCard, ReportCell, ReportChip, ReportSection, ReportTone } from "../../report";
import "./compliance-report.css";
import { ExecutiveInfographic } from "./executive-infographic";
import { LhviuFigure } from "./lhviu-figure";

/** Rows per table piece — a long table continues on the next sheet with its header repeated. */
const ROWS_PER_PIECE = 10;

const TONE_STYLE: Record<ReportTone, { background: string; color: string }> = {
  green: { background: "#ECFDF3", color: "#15803D" },
  orange: { background: "#FFF7E6", color: "#B45309" },
  red: { background: "#FEF2F2", color: "#B91C1C" },
  slate: { background: "#F1F5F9", color: "#475569" },
};

function Cell({ value }: { value: ReportCell }) {
  if (typeof value === "string") return <span style={{ whiteSpace: "pre-line" }}>{value}</span>;
  return (
    <>
      <span className="rd-pill" style={TONE_STYLE[value.tone]}>
        {value.text}
      </span>
      {value.sub && <div style={{ marginTop: 3, fontSize: 8.5, color: "#64748B" }}>{value.sub}</div>}
    </>
  );
}

function Table({ title, lede, chips, widths, headers, rows, continued }: { title?: string; lede?: string; chips?: ReportChip[]; widths?: string[]; headers: string[]; rows: ReportCell[][]; continued: boolean }) {
  return (
    <div style={{ marginBottom: 14, breakInside: "avoid" }}>
      {title && (
        <h3 className="rd-serif" style={{ fontSize: 14, margin: "12px 0 6px" }}>
          {title}
          {continued && " (lanjutan)"}
        </h3>
      )}
      {lede && !continued && <p style={{ margin: "0 0 6px", fontSize: 9.5, color: "#55524c" }}>{lede}</p>}
      {chips && !continued && <Chips items={chips} />}
      <table className="rd-table" style={{ fontSize: 9.5, tableLayout: widths ? "fixed" : undefined }}>
        {widths && (
          <colgroup>
            {widths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>
                  <Cell value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Labelled values in two columns, each value in a light box — the Case Detail "Data Perusahaan" look. */
function FieldGrid({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 24px", marginBottom: 12 }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 9, color: "#64748B", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 10.5, lineHeight: 1.4, border: "1px solid #E5EAF0", background: "#F8FAFC", borderRadius: 6, padding: "6px 10px", minHeight: 28 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function BlockTitle({ children }: { children: ReactNode }) {
  return <h3 className="rd-serif" style={{ fontSize: 14, margin: "12px 0 6px" }}>{children}</h3>;
}

function Cards({ title, columns, items }: { title?: string; columns: number; items: ReportCard[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title && <BlockTitle>{title}</BlockTitle>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}>
        {items.map((card) => (
          <div key={card.title} style={{ border: "1px solid #E5EAF0", background: "#FFFDF9", borderRadius: 8, padding: "8px 10px", fontSize: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <strong style={{ flex: 1, fontSize: 10.5 }}>{card.title}</strong>
              {card.badge && <span className="rd-pill" style={TONE_STYLE[card.badge.tone]}>{card.badge.text}</span>}
            </div>
            {card.fields && (
              <dl style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "3px 8px", margin: "6px 0 0" }}>
                {card.fields.map(([label, value]) => (
                  <Fragment key={label}>
                    <dt style={{ color: "#64748B" }}>{label}</dt>
                    <dd style={{ margin: 0, whiteSpace: "pre-line" }}>{value}</dd>
                  </Fragment>
                ))}
              </dl>
            )}
            {card.text && <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", lineHeight: 1.45, color: "#334155" }}>{card.text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Chips({ items }: { items: ReportChip[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 8px" }}>
      {items.map((item) => (
        <span key={item.label} className="rd-pill" style={{ ...TONE_STYLE[item.tone], fontSize: 9.5 }}>
          ● {item.label} <strong>{item.count}</strong>
        </span>
      ))}
    </div>
  );
}

function Fields({ items }: { items: [string, string][] }) {
  return (
    <table className="rd-table" style={{ fontSize: 10, marginBottom: 14 }}>
      <tbody>
        {items.map(([label, value]) => (
          <tr key={label}>
            <td style={{ width: "34%", color: "#475569", fontWeight: 600 }}>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function blockItems(section: ReportSection, block: ReportBlock, index: number): FlowItem[] {
  const key = `${section.key}-${index}`;
  switch (block.kind) {
    case "infographic":
      return [{ kind: "node", key, node: <ExecutiveInfographic data={block.data} /> }];
    case "lhviu":
      return [{ kind: "node", key, node: <LhviuFigure data={block.data} /> }];
    case "fields":
      return [{ kind: "node", key, node: block.layout === "grid" ? <FieldGrid items={block.items} /> : <Fields items={block.items} /> }];
    case "cards":
      return [{ kind: "node", key, node: <Cards title={block.title} columns={block.columns} items={block.items} /> }];
    case "findings":
      return [
        {
          kind: "node",
          key,
          node: (
            <div className="rd-card" style={{ marginBottom: 14 }}>
              <div className="rd-card-label">TEMUAN COMPLIANCE</div>
              {block.items.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 10, color: "#64748B" }}>Tidak ada temuan pada tahap ini.</p>
              ) : (
                <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", fontSize: 10, lineHeight: 1.5 }}>
                  {block.items.map((item) => (
                    <li key={item.issueNumber}>
                      <strong>{item.issueNumber}</strong>{" "}
                      <span className="rd-pill" style={TONE_STYLE[item.tone]}>{item.status}</span> {item.requirement} — {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        },
      ];
    case "text":
      return [{ kind: "node", key, node: <p className="rd-lede" style={{ margin: "0 0 12px" }}>{block.text}</p> }];
    case "notes":
      return [
        {
          kind: "node",
          key,
          node: (
            <div className="rd-card" style={{ marginBottom: 14 }}>
              <div className="rd-card-label">{block.title.toUpperCase()}</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 10, lineHeight: 1.5 }}>
                {block.items.map((item, i) => (
                  <li key={i} style={{ color: TONE_STYLE[item.tone].color }}>{item.text}</li>
                ))}
              </ul>
            </div>
          ),
        },
      ];
    case "table": {
      if (block.rows.length === 0) {
        return [
          {
            kind: "node",
            key,
            node: (
              <div style={{ marginBottom: 14 }}>
                {block.title && <h3 className="rd-serif" style={{ fontSize: 14, margin: "12px 0 6px" }}>{block.title}</h3>}
                <p style={{ fontSize: 10, color: "#64748B" }}>{block.empty}</p>
              </div>
            ),
          },
        ];
      }
      const pieces: FlowItem[] = [];
      const perPiece = block.rowsPerPiece ?? ROWS_PER_PIECE;
      // The first piece also carries the lede/chips (and may carry the section heading): one row less.
      const firstPiece = block.lede || block.chips ? Math.max(1, perPiece - 1) : perPiece;
      for (let start = 0; start < block.rows.length; ) {
        const size = start === 0 ? firstPiece : perPiece;
        pieces.push({
          kind: "node",
          key: `${key}-${start}`,
          node: <Table title={block.title} lede={block.lede} chips={block.chips} widths={block.widths} headers={block.headers} rows={block.rows.slice(start, start + size)} continued={start > 0} />,
        });
        start += size;
      }
      return pieces;
    }
  }
}

function flowItems(report: ComplianceReport): FlowItem[] {
  const items: FlowItem[] = [];
  for (const section of report.sections) {
    const heading = (
      <div style={{ margin: "6px 0 10px" }}>
        {section.key === "legalitas" && <div className="rd-eyebrow">5 · HASIL PEMERIKSAAN PER TAHAP</div>}
        <div className="rd-eyebrow">{section.eyebrow}</div>
        <h2 className="rd-page-title rd-serif" style={{ fontSize: 20 }}>{section.title}</h2>
        {section.lede && <p className="rd-lede" style={{ margin: "4px 0 0" }}>{section.lede}</p>}
      </div>
    );
    const [first, ...rest] = section.blocks.flatMap((block, index) => blockItems(section, block, index));
    // The heading travels with the section's first piece, so it is never left alone at a page bottom.
    items.push({
      kind: "node",
      key: `${section.key}-head`,
      // Every Tahap (5.1–5.8) starts on a fresh page, as do the Ringkasan and Temuan sections.
      breakBefore: section.eyebrow.includes("TAHAP") || section.key === "ringkasan" || section.key === "temuan",
      node: (
        <>
          {heading}
          {first?.kind === "node" && first.node}
        </>
      ),
    });
    items.push(...rest);
  }
  return items;
}

function PageShell({ pageNo, total, report, children }: { pageNo: number; total: number; report: ComplianceReport; children: ReactNode }) {
  return (
    <section className="rd-sheet rd-sheet-landscape rd-lhc-page">
      <div className="rd-pagehead">
        <ReportBrandMark variant="head" />
        <div className="rd-classified">INTERNAL — TERBATAS{report.isFinal ? "" : " · DRAF"}</div>
      </div>
      <div className="rd-body">{children}</div>
      <div className="rd-pagefoot">
        <div>Laporan Hasil Compliance — {report.companyName}</div>
        <div className="rd-pagefoot-num">
          <span>{pageNo}</span>dari {total}
        </div>
      </div>
    </section>
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

/**
 * Laporan Hasil Compliance — one case's compliance result on A4 landscape sheets, in the same report style as
 * the workspaces' reports (Cetak, and Unduh PDF printed server-side).
 */
export function ComplianceReportView({ report }: { report: ComplianceReport }) {
  // A4Pages re-measures whenever its items change identity — build them once per report.
  const items = useMemo(() => flowItems(report), [report]);
  return (
    <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={`${COMPLIANCE_HOME}/permohonan/${report.applicationId}`} className="rd-back">
          ← Kembali
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Laporan Hasil Compliance{" "}
            <span className="rd-topbar-sub">
              &middot; {report.companyName} &middot; {report.applicationNumber} &middot; {report.isFinal ? "Final" : "Draf"}
            </span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}>
            Cetak
          </button>
          <CurrentPagePdfButton name={`Laporan-Hasil-Compliance-${report.applicationNumber}`} />
        </div>
      </div>

      <main className="rd-main">
        <section className="rd-sheet rd-sheet-landscape rd-cover rd-lhc-cover">
          <div className="rd-cover-topbar" />
          <div className="rd-cover-inner">
            <div className="rd-cover-head">
              <ReportBrandMark variant="cover" />
              <div className="rd-cover-classified">INTERNAL — TERBATAS{report.isFinal ? "" : " · DRAF"}</div>
            </div>
            <div className="rd-cover-title-block">
              <div className="rd-cover-eyebrow">LAPORAN HASIL COMPLIANCE</div>
              <h1 className="rd-cover-title rd-serif">
                Hasil
                <br />
                Compliance
              </h1>
              <div className="rd-cover-subtitle">
                {report.companyName}
                <br />
                VIU – Produk Tekstil sebagai Barang Konsumsi
              </div>
            </div>
            <div className="rd-cover-meta">
              <Meta label="NOMOR DOKUMEN" value={report.documentNumber} mono />
              <Meta label="NOMOR PERMOHONAN" value={report.applicationNumber} mono />
              <Meta label="TANGGAL PERMOHONAN" value={report.submittedAt} />
              <Meta label="TANGGAL LAPORAN" value={report.reportDate} />
              <Meta label="SKOR COMPLIANCE" value={`${report.score}%`} />
              <Meta label="KATEGORI" value={report.category} />
            </div>
          </div>
          <div className="rd-cover-foot">
            <div>Lembaga Verifikasi &amp; Survey — VIU</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>

        <A4Pages
          items={items}
          pageHeight="210mm"
          renderPage={(pageNo, totalPages, children) => (
            <PageShell pageNo={pageNo} total={totalPages} report={report}>
              {children}
            </PageShell>
          )}
        />
      </main>
    </div>
  );
}
