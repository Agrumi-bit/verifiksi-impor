import type { ReactNode } from "react";

import type { FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { formatAssignmentDate } from "@/lib/assignment-date";
import type { PmApplicationDetail } from "../detail/types";
import { SCHEME_NAME, tanggalPanjang, tanggalParts, type BeritaAcara, type BeritaAcaraScheme, type LampiranDef } from "../../berita-acara";

/**
 * The lampiran pages of the Berita Acara Pelaksanaan. Data lampiran print the application's own detail
 * (as entered by the company and verified in the system); form lampiran are blank forms for the
 * on-site Opening Meeting, attendance list and Berita Acara Klarifikasi, to be filled in and signed.
 */

const LOCATION_LABELS: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

/** System numbers come as "25.920.000" (already id-ID), "85824" or "1555.2000000000003" — print them id-ID. */
export function fmt(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "—";
  const s = String(value).trim();
  if (!s) return "—";
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return s;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return s;
}
const txt = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : "—");

function Heading({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="ba-lamp-head">
      <div className="ba-lamp-no">Lampiran {no}</div>
      <div className="ba-lamp-title">{title}</div>
      {sub && <div className="ba-lamp-sub">{sub}</div>}
    </div>
  );
}

function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="ba-kv">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <div className="ba-lamp-subtitle">{children}</div>;
}

/** A table laid out row by row over as many sheets as it needs (header repeated). */
function rowsItem(
  key: string,
  headers: string[],
  rows: ReactNode[][],
  {
    lead,
    widths,
    numeric = [],
    breakBefore,
    blank,
    empty = "Tidak ada data pada sistem.",
  }: { lead?: ReactNode; widths?: string[]; numeric?: number[]; breakBefore?: boolean; blank?: boolean; empty?: string },
): FlowItem {
  if (rows.length === 0) {
    return {
      kind: "node",
      key,
      breakBefore,
      node: (
        <>
          {lead}
          <p className="ba-empty">{empty}</p>
        </>
      ),
    };
  }
  return {
    kind: "rows",
    key,
    count: rows.length,
    lead,
    breakBefore,
    render: (indices, continued) => (
      <table className={blank ? "ba-table ba-table-blank" : "ba-table"}>
        {widths && (
          <colgroup>
            {widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={numeric.includes(i) ? "num" : undefined}>
                {h}
                {continued && i === 1 ? " (lanjutan)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indices.map((index) => (
            <tr key={index}>
              {rows[index].map((cell, i) => (
                <td key={i} className={numeric.includes(i) ? "num" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
}

const blankRows = (count: number, cols: number): ReactNode[][] =>
  Array.from({ length: count }, (_, i) => [String(i + 1), ...Array.from({ length: cols - 1 }, () => "")]);

function SignPair({ ba, left = "Lembaga Pelaksana", right = "Pemohon" }: { ba: BeritaAcara; left?: string; right?: string }) {
  return (
    <div className="ba-sign ba-sign-sm">
      <div className="ba-sign-cols">
        <div>
          <div>{left}</div>
          <div>{ba.lembagaNama}</div>
          <div className="ba-sign-space" />
          <div>(………………………………………)</div>
        </div>
        <div>
          <div>{right}</div>
          <div>{ba.namaPerusahaan}</div>
          <div className="ba-sign-space" />
          <div>(………………………………………)</div>
        </div>
      </div>
    </div>
  );
}

function eventRows(ba: BeritaAcara, scheme: BeritaAcaraScheme): [string, ReactNode][] {
  const p = tanggalParts(ba.tanggal);
  return [
    ["Kegiatan", `${SCHEME_NAME[scheme]} (${scheme})`],
    ["Perusahaan", ba.namaPerusahaan],
    ["Hari / Tanggal", p ? `${p.hari}, ${tanggalPanjang(ba.tanggal)}` : "……………………………"],
    ["Tempat", ba.tempat || "……………………………"],
    ["Waktu", "…………… s.d. …………… WIB"],
  ];
}

function payloadOf(data: PmApplicationDetail): Record<string, unknown> {
  return (data.payload ?? {}) as unknown as Record<string, unknown>;
}

export function lampiranItems(def: LampiranDef, no: string, data: PmApplicationDetail, ba: BeritaAcara, scheme: BeritaAcaraScheme): FlowItem[] {
  const k = `lamp-${def.key}`;
  const head = <Heading no={no} title={def.title} sub={`${ba.namaPerusahaan} · ${data.applicationNumber}`} />;
  const pl = payloadOf(data);

  switch (def.key) {
    case "opening":
      return [
        {
          kind: "node",
          key: k,
          breakBefore: true,
          node: (
            <>
              {head}
              <KeyValue rows={eventRows(ba, scheme)} />
              <SubTitle>Agenda Opening Meeting</SubTitle>
              {[
                "Perkenalan tim verifikasi beserta peran dan tanggung jawab masing-masing personel",
                `Penyampaian tujuan, metodologi, dan tahapan ${scheme}`,
                "Konfirmasi ruang lingkup verifikasi, agenda kegiatan, serta jadwal pemeriksaan lapangan",
                "Penyepakatan mekanisme komunikasi dan klarifikasi selama kegiatan berlangsung",
              ].map((t) => (
                <div key={t} className="ba-check">
                  <span>☐</span>
                  <span>{t}</span>
                </div>
              ))}
              <SubTitle>Catatan</SubTitle>
              <div className="ba-lines">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} />
                ))}
              </div>
            </>
          ),
        },
        { kind: "node", key: `${k}-ttd`, node: <SignPair ba={ba} /> },
      ];

    case "hadir":
      return [
        rowsItem(`${k}-t`, ["No", "Nama", "Instansi / Perusahaan", "Jabatan", "Tanda Tangan"], blankRows(15, 5), {
          breakBefore: true,
          blank: true,
          widths: ["6%", "28%", "26%", "20%", "20%"],
          lead: (
            <>
              {head}
              <KeyValue rows={eventRows(ba, scheme).slice(0, 4)} />
            </>
          ),
        }),
      ];

    case "bak":
      return [
        rowsItem(`${k}-t`, ["No", "Hal yang Diklarifikasi", "Penjelasan Perusahaan", "Keterangan"], blankRows(8, 4), {
          breakBefore: true,
          blank: true,
          widths: ["6%", "32%", "38%", "24%"],
          lead: (
            <>
              {head}
              <KeyValue rows={eventRows(ba, scheme).slice(0, 4)} />
            </>
          ),
        }),
        { kind: "node", key: `${k}-ttd`, node: <SignPair ba={ba} left="Verifikator" right="Pihak Perusahaan" /> },
      ];

    case "registrasi": {
      const kbli = data.company.kbliEntries ?? [];
      const locations = data.locationSummaries ?? [];
      return [
        {
          kind: "node",
          key: k,
          breakBefore: true,
          node: (
            <>
              {head}
              <SubTitle>A. Data Permohonan</SubTitle>
              <KeyValue
                rows={[
                  ["Nomor Permohonan", data.applicationNumber],
                  ["Jenis Verifikasi", `${SCHEME_NAME[scheme]} (${scheme})`],
                  ["Kategori Permohonan", data.applicationCategory === "NEW" ? "Baru" : txt(data.applicationCategory)],
                  ["Tanggal Pengajuan", formatAssignmentDate(data.submissionDate ?? data.createdAt, "full")],
                ]}
              />
              <SubTitle>B. Data Perusahaan</SubTitle>
              <KeyValue
                rows={[
                  ["Nama Perusahaan", data.company.companyName],
                  ["Bentuk Usaha", txt(pl.companyType)],
                  ["Jenis API", txt(pl.companyApiType)],
                  ["Status Penanaman Modal", txt(pl.investmentStatus)],
                  ["NIB", txt(data.company.nibNumber)],
                  ["NPWP", txt(pl.npwpNumber)],
                  [
                    "KBLI",
                    kbli.length ? (
                      <>
                        {kbli.map((e) => (
                          <div key={e.code}>
                            {e.code} — {e.description}
                          </div>
                        ))}
                      </>
                    ) : (
                      "—"
                    ),
                  ],
                  ["Alamat Usaha", txt(data.businessAddress)],
                ]}
              />
              <SubTitle>C. Kontak Penanggung Jawab</SubTitle>
              <KeyValue
                rows={[
                  ["Nama", txt(pl.contactFullName)],
                  ["Jabatan", txt(pl.contactDesignation)],
                  ["Telepon", txt(pl.contactPhone)],
                  ["Email", txt(pl.contactEmail)],
                ]}
              />
            </>
          ),
        },
        rowsItem(
          `${k}-lok`,
          ["No", "Jenis Lokasi", "Alamat", "Kota / Provinsi", "Status"],
          locations.map((l, i) => [String(i + 1), LOCATION_LABELS[l.locationType] ?? l.locationType, l.address || "—", l.cityProvince || "—", l.buildingStatus || "—"]),
          { lead: <SubTitle>D. Lokasi yang Didaftarkan</SubTitle>, widths: ["6%", "14%", "42%", "24%", "14%"] },
        ),
      ];
    }

    case "produksi": {
      const prev = data.productionQty.filter((r) => r.section === "sebelumnya");
      const plan = data.productionQty.filter((r) => r.section === "rencana");
      const tk = (Array.isArray(pl.tenagaKerjaEntries) ? pl.tenagaKerjaEntries : []) as { kategori?: string; jumlah?: string }[];
      return [
        rowsItem(
          `${k}-cap`,
          ["No", "Jenis Produk", "KBLI", "Kapasitas Izin", "Kapasitas Terpasang", "Satuan"],
          data.capacity.map((c, i) => [String(i + 1), txt(c.jenisProduk), `${c.kbliCode}${c.kbliDescription ? ` — ${c.kbliDescription}` : ""}`, fmt(c.berdasarkanIzin), fmt(c.kapasitasTerpasang), txt(c.satuan)]),
          {
            breakBefore: true,
            widths: ["6%", "20%", "30%", "16%", "16%", "12%"],
            numeric: [3, 4],
            lead: (
              <>
                {head}
                <SubTitle>A. Kapasitas Produksi Berdasarkan Perizinan</SubTitle>
              </>
            ),
          },
        ),
        rowsItem(
          `${k}-prev`,
          ["No", "Jenis Produk", "HS Code", "Jumlah", "Satuan"],
          prev.map((r, i) => [String(i + 1), txt(r.jenisProduk), txt(r.hsCode), fmt(r.jumlah), txt(r.satuan)]),
          { lead: <SubTitle>B. Jumlah Produksi Periode Satu Tahun Sebelumnya</SubTitle>, widths: ["6%", "50%", "16%", "16%", "12%"], numeric: [3] },
        ),
        rowsItem(
          `${k}-plan`,
          ["No", "Jenis Produk", "HS Code", "Jumlah", "Satuan"],
          plan.map((r, i) => [String(i + 1), txt(r.jenisProduk), txt(r.hsCode), fmt(r.jumlah), txt(r.satuan)]),
          { lead: <SubTitle>C. Rencana Produksi Periode Tahun Berikutnya</SubTitle>, widths: ["6%", "50%", "16%", "16%", "12%"], numeric: [3] },
        ),
        rowsItem(
          `${k}-tk`,
          ["No", "Kategori", "Jumlah (orang)"],
          tk.map((t, i) => [String(i + 1), txt(t.kategori), fmt(t.jumlah)]),
          { lead: <SubTitle>D. Tenaga Kerja</SubTitle>, widths: ["6%", "64%", "30%"], numeric: [2] },
        ),
      ];
    }

    case "mesin":
      return [
        rowsItem(
          `${k}-t`,
          ["No", "Nama Mesin", "Proses", "Merk / Model", "Tahun", "Jumlah", "Kapasitas", "Kondisi", "Daya"],
          data.machines.map((m, i) => [
            String(i + 1),
            txt(m.nama),
            txt(m.proses),
            [m.merk, m.model].filter(Boolean).join(" / ") || "—",
            txt(m.tahun),
            `${fmt(m.quantity)} ${m.quantitySatuan ?? ""}`.trim(),
            m.kapasitas ? `${fmt(m.kapasitas)} ${m.kapasitasSatuan ?? ""}`.trim() : "—",
            txt(m.kondisi),
            m.power ? `${m.power} ${m.powerSatuan ?? ""}`.trim() : "—",
          ]),
          { breakBefore: true, lead: head, widths: ["5%", "21%", "13%", "19%", "7%", "9%", "11%", "8%", "7%"], numeric: [5, 6] },
        ),
      ];

    case "penjualan":
      return [
        rowsItem(
          `${k}-t`,
          ["No", "Jenis Produk", "Dalam Negeri", "Luar Negeri (Ekspor)", "Satuan"],
          data.sales.map((r, i) => [String(i + 1), txt(r.productName), fmt(r.dalamNegeri || "0"), fmt(r.luarNegeri || "0"), txt(r.satuan)]),
          { breakBefore: true, lead: head, widths: ["6%", "46%", "17%", "19%", "12%"], numeric: [2, 3] },
        ),
      ];

    case "stok":
      return [
        rowsItem(
          `${k}-t`,
          ["No", "Bahan Baku / Penolong", "HS Code", "Untuk Produk", "Stok Terkini", "Penggunaan Th Lalu", "Kebutuhan 1 Th", "Satuan"],
          data.rawMaterialUsage.map((r, i) => [
            String(i + 1),
            txt(r.jenis),
            txt(r.hsCode),
            txt(r.productName),
            fmt(r.dataStock || "0"),
            fmt(r.penggunaan),
            fmt(r.rencanaKebutuhan),
            txt(r.satuan),
          ]),
          { breakBefore: true, lead: head, widths: ["5%", "21%", "11%", "20%", "9%", "13%", "13%", "8%"], numeric: [4, 5, 6] },
        ),
      ];

    case "produk": {
      const konsumsi = data.viu?.konsumsi;
      if (konsumsi) {
        const totals = Object.entries(konsumsi.totalsByCurrency ?? {});
        return [
          rowsItem(
            `${k}-t`,
            ["No", "Produk", "Merek", "HS Code", "Negara Asal", "Jumlah", "Stok", "Harga Rata-rata", "Total"],
            konsumsi.products.map((p, i) => [
              String(i + 1),
              txt(p.productName),
              txt(p.brandName),
              txt(p.hsCode),
              p.originCountryNames?.length ? p.originCountryNames.join(", ") : "—",
              `${fmt(p.quantity)} ${p.unit ?? ""}`.trim(),
              fmt(p.stockQuantity),
              `${p.currency} ${fmt(p.averageUnitPrice)}`,
              `${p.currency} ${fmt(p.total)}`,
            ]),
            { breakBefore: true, lead: head, widths: ["5%", "20%", "11%", "10%", "12%", "11%", "8%", "11%", "12%"], numeric: [5, 6, 7, 8] },
          ),
          {
            kind: "node",
            key: `${k}-sum`,
            node: (
              <KeyValue
                rows={[
                  ...totals.map(([cur, v]) => [`Total Rencana Impor (${cur})`, fmt(v)] as [string, ReactNode]),
                  ["Modal Kerja", konsumsi.modalKerja != null ? `IDR ${fmt(konsumsi.modalKerja)}` : "—"],
                ]}
              />
            ),
          },
        ];
      }
      const bahan = data.viu?.bahanBakuProducts ?? [];
      return [
        rowsItem(
          `${k}-t`,
          ["No", "Jenis Barang", "HS Code", "Volume", "Satuan", "Penggunaan"],
          bahan.map((p, i) => [String(i + 1), txt(p.materialType), txt(p.hsCode), fmt(p.estimatedVolume), txt(p.volumeUnit), txt(p.intendedUse)]),
          { breakBefore: true, lead: head, widths: ["6%", "28%", "14%", "14%", "10%", "28%"], numeric: [3] },
        ),
      ];
    }

    case "lokasi": {
      const locations = data.locationSummaries ?? [];
      return [
        rowsItem(
          `${k}-t`,
          ["No", "Jenis Lokasi", "Alamat", "Kota / Provinsi", "Status Bangunan", "Catatan Lapangan"],
          locations.map((l, i) => [String(i + 1), LOCATION_LABELS[l.locationType] ?? l.locationType, l.address || "—", l.cityProvince || "—", l.buildingStatus || "—", l.fieldNotes || "—"]),
          { breakBefore: true, lead: head, widths: ["5%", "11%", "34%", "20%", "12%", "18%"] },
        ),
      ];
    }

    default:
      return [];
  }
}
