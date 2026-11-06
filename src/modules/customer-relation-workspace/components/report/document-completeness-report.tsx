"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "./completeness-report.css";
import { A4Pages, type FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CurrentPagePdfButton } from "@/modules/technical-analyst-workspace/components/report/pdf-download-button";
import { printWithSignedLinks } from "@/lib/print-with-signed-links";
import { useSession } from "@/lib/auth-client";
import { createComplianceResolver } from "@/modules/verifikator-workspace/scheme-compliance";
import { schemeLabel } from "@/modules/schemes/resolvers";
import { CR_DOCUMENT_STATUS_LABELS } from "../../status";
import type { ApplicationDetail } from "../application-review";
import { completenessStats, completenessVerdict, type CompletenessDoc } from "./completeness";
import { vkiCheckFlow } from "./vki-check-report";

const KOP = "/images/berita-acara/kop-berita-acara.jpg";
const LEMBAGA = "PT Tribhakti Inspektama";
const CATEGORY_LABEL: Record<string, string> = { NEW: "Baru", RENEWAL: "Perpanjangan", AMENDMENT: "Perubahan" };

const fileUrl = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;
const tanggal = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

function StatusBadge({ doc }: { doc: CompletenessDoc }) {
  if (doc.status === "PENDING" && !doc.lengkap) return <span className="kd-badge kd-bad">Belum Ada</span>;
  const cls = doc.status === "VALID" ? "kd-ok" : doc.status === "REJECTED" || doc.status === "NEED_REVISION" ? "kd-bad" : doc.status === "NOT_APPLICABLE" ? "kd-na" : "kd-pending";
  return <span className={`kd-badge ${cls}`}>{CR_DOCUMENT_STATUS_LABELS[doc.status]}</span>;
}

function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="kd-table kd-kv">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{v || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function rowsTable(key: string, headers: string[], widths: string[], rows: ReactNode[][], lead?: ReactNode, center: number[] = []): FlowItem {
  return {
    kind: "rows",
    key,
    count: Math.max(rows.length, 1),
    lead,
    render: (indices, continued) => (
      <table className="kd-table">
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={center.includes(i) ? "ctr" : undefined}>
                {h}
                {continued && i === 1 ? " (lanjutan)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ fontStyle: "italic", color: "#666" }}>
                Tidak ada dokumen.
              </td>
            </tr>
          ) : (
            indices.map((i) => (
              <tr key={i}>
                {rows[i].map((c, j) => (
                  <td key={j} className={center.includes(j) ? "ctr" : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    ),
  };
}

/** The report's content as A4 flow items. */
export function completenessFlow(data: ApplicationDetail, checkerName: string, today: Date): FlowItem[] {
  const docs = data.documents as CompletenessDoc[];
  const stats = completenessStats(docs);
  const verdict = completenessVerdict(docs);
  const compliance = createComplianceResolver({ verificationType: data.jenis, importTypes: data.importTypes, locations: data.locations });
  const items: FlowItem[] = [];
  const node = (key: string, n: ReactNode, breakBefore?: boolean) => items.push({ kind: "node", key, node: n, breakBefore });
  const scheme = schemeLabel({ verificationType: data.jenis, importTypes: data.importTypes });

  node(
    "title",
    <div>
      <div className="kd-title">LAPORAN KELENGKAPAN DOKUMEN PERMOHONAN</div>
      <div className="kd-sub">
        {scheme} &middot; Nomor Permohonan {data.applicationNumber}
      </div>
    </div>,
  );
  node(
    "data",
    <>
      <div className="kd-h">I. DATA PERMOHONAN</div>
      <KeyValue
        rows={[
          ["Nomor Permohonan", data.applicationNumber],
          ["Nama Perusahaan", data.company],
          ["Nomor Induk Berusaha (NIB)", data.nibNumber],
          ["Alamat Kantor", data.businessAddress],
          ["Jenis Verifikasi", scheme],
          ["Kategori Permohonan", CATEGORY_LABEL[data.category] ?? data.category],
          ["Tanggal Pengajuan", tanggal(data.submitted)],
          ["Penanggung Jawab (PIC)", [data.picName, data.picPhone, data.picEmail].filter(Boolean).join(" · ")],
          ["Tanggal Pemeriksaan", tanggal(today)],
          ["Diperiksa oleh", `${checkerName || "—"} (Customer Relationship)`],
        ]}
      />
    </>,
  );

  node(
    "ringkasan",
    <>
      <div className="kd-h">II. RINGKASAN KELENGKAPAN</div>
      <table className="kd-table">
        <thead>
          <tr>
            {["Total Dokumen", "Tersedia", "Belum Ada", "Valid", "Tidak Valid", "Tidak Diperlukan", "Belum Diperiksa"].map((h) => (
              <th key={h} className="ctr">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {[stats.total, stats.tersedia, stats.kurang, stats.valid, stats.tidakValid, stats.tidakDiperlukan, stats.belumDiperiksa].map((v, i) => (
              <td key={i} className="ctr" style={{ fontWeight: 700, fontSize: 12 }}>
                {v}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="kd-p">
        Progres pemeriksaan: {stats.reviewed} dari {stats.total} dokumen telah diperiksa ({stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0}%).
      </p>
    </>,
  );

  node("rincian-h", <div className="kd-h">III. RINCIAN PEMERIKSAAN DOKUMEN</div>);
  const sections = compliance.sections().filter((s) => docs.some((d) => d.category === s.category));
  const known = new Set(sections.map((s) => s.category));
  const groups = [
    ...sections.map((s) => ({ key: s.category, title: s.title, docs: docs.filter((d) => d.category === s.category) })),
    ...Array.from(new Set(docs.filter((d) => !known.has(d.category)).map((d) => d.category))).map((c) => ({ key: c, title: c, docs: docs.filter((d) => d.category === c) })),
  ];
  groups.forEach((g, gi) => {
    items.push(
      rowsTable(
        `g-${gi}`,
        ["No", "Dokumen", "Persyaratan", "Ketersediaan", "Hasil Pemeriksaan", "Versi / Tgl Upload", "Catatan"],
        ["5%", "27%", "12%", "11%", "13%", "13%", "19%"],
        g.docs.map((d, i) => [
          `${i + 1}.`,
          d.documentPath ? (
            <a href={fileUrl(d.documentPath)} target="_blank" rel="noopener noreferrer">
              {d.label}
            </a>
          ) : (
            d.label
          ),
          compliance.def(d.key)?.persyaratan ?? "—",
          d.lengkap ? "Ada" : "Belum Ada",
          <StatusBadge key="s" doc={d} />,
          d.lengkap ? `V${d.version} · ${tanggal(d.uploadedAt)}` : "—",
          [d.rejectionNote, d.requestNote && `Permintaan: ${d.requestNote}`].filter(Boolean).join("\n") || "—",
        ]),
        <div className="kd-sh">
          {String.fromCharCode(65 + gi)}. {g.title}
        </div>,
        [3, 4],
      ),
    );
  });

  const followUps = docs.filter((d) => d.status === "REJECTED" || d.status === "NEED_REVISION" || (!d.lengkap && d.status !== "NOT_APPLICABLE"));
  items.push(
    rowsTable(
      "tindak",
      ["No", "Dokumen", "Kondisi", "Tindak Lanjut / Catatan"],
      ["6%", "38%", "18%", "38%"],
      followUps.map((d, i) => [
        `${i + 1}.`,
        d.label,
        !d.lengkap ? "Belum diunggah" : CR_DOCUMENT_STATUS_LABELS[d.status],
        d.rejectionNote || d.requestNote || (!d.lengkap ? "Perusahaan diminta mengunggah dokumen." : "Perusahaan diminta memperbaiki dokumen."),
      ]),
      <>
        <div className="kd-h">IV. DOKUMEN YANG PERLU DILENGKAPI / DIPERBAIKI</div>
        {followUps.length === 0 && <p className="kd-p">Tidak ada — seluruh dokumen persyaratan telah tersedia dan tidak ada yang dinyatakan tidak valid.</p>}
      </>,
    ),
  );

  node(
    "kesimpulan",
    <>
      <div className="kd-h">V. KESIMPULAN</div>
      <div className="kd-verdict">
        <div className="kd-verdict-label">STATUS KELENGKAPAN DOKUMEN</div>
        <div className="kd-verdict-value">{verdict.label}</div>
      </div>
      <p className="kd-p">{verdict.text}</p>
      {data.crNotes?.trim() && (
        <>
          <div className="kd-sh">Catatan Customer Relationship</div>
          <p className="kd-p">{data.crNotes.trim()}</p>
        </>
      )}
      <p className="kd-p" style={{ fontSize: 10, color: "#555" }}>
        Pemeriksaan ini merupakan pemeriksaan administratif kelengkapan dokumen permohonan, bukan verifikasi substansi dokumen yang dilakukan oleh
        Verifikator.
      </p>
    </>,
  );
  node(
    "ttd",
    <div className="kd-sign">
      <div>{tanggal(today)}</div>
      <div>Customer Relationship</div>
      <div>{LEMBAGA}</div>
      <div className="kd-sign-space" />
      <div className="kd-sign-name">{checkerName || "(………………………………)"}</div>
    </div>,
  );
  return items;
}

function Sheet({ pageNo, total, applicationNumber, children }: { pageNo: number; total: number; applicationNumber: string; children: ReactNode }) {
  return (
    <section className="rd-sheet kd-sheet">
      <div className="rd-pagehead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KOP} alt={LEMBAGA} />
      </div>
      <div className="rd-body">{children}</div>
      <div className="rd-pagefoot">
        <div>Pemeriksaan Kelengkapan Dokumen · {applicationNumber}</div>
        <div>
          Halaman {pageNo} dari {total}
        </div>
      </div>
    </section>
  );
}

/** Printable Laporan Kelengkapan Dokumen Permohonan (Cetak / Unduh PDF). */
export function DocumentCompletenessReport({ id }: { id: string }) {
  const { data: session } = useSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-relation-workspace", "applications", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/applications/${id}`);
      if (!response.ok) throw new Error("Laporan tidak ditemukan");
      return ((await response.json()) as { data: ApplicationDetail }).data;
    },
  });
  const checker = session?.user?.name ?? "";
  // VKI follows the Form Pemeriksaan Kelengkapan Data dan Dokumen VKI; VIU keeps the generic report for now.
  const title = data?.vkiCheck ? "Form Pemeriksaan Kelengkapan Data dan Dokumen VKI" : "Laporan Kelengkapan Dokumen";
  return (
    <div className="report-doc kd-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={`/customer-relation-workspace/applications/${id}`} className="rd-back">
          ← Kembali ke Permohonan
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            {title} {data && <span className="rd-topbar-sub">&middot; {data.applicationNumber}</span>}
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => void printWithSignedLinks()}>
            Cetak
          </button>
          <CurrentPagePdfButton name={`${data?.vkiCheck ? "Form-Pemeriksaan-Kelengkapan-VKI" : "Laporan-Kelengkapan-Dokumen"}-${data?.applicationNumber ?? id}`} />
        </div>
      </div>
      <main className="rd-main">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Memuat laporan...</p>}
        {isError && <p className="py-10 text-center text-sm text-destructive">Laporan tidak ditemukan.</p>}
        {data && (
          <A4Pages
            items={data.vkiCheck ? vkiCheckFlow(data.vkiCheck, checker, new Date()) : completenessFlow(data, checker, new Date())}
            renderPage={(pageNo, total, children) => (
              <Sheet pageNo={pageNo} total={total} applicationNumber={data.applicationNumber}>
                {children}
              </Sheet>
            )}
          />
        )}
      </main>
    </div>
  );
}
