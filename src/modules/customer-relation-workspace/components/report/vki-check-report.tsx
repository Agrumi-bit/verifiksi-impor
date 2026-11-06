import type { ReactNode } from "react";

import type { FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CR_DOCUMENT_STATUS_LABELS, type DocVerificationStatusValue } from "../../status";
import { fileNameOf } from "@/modules/applications/vki-form/model";
import { RENCANA_ASPEK, RENCANA_FOTO, RENCANA_PERSIAPAN } from "../../rencana-pemeriksaan";
import { TINDAK_LANJUT, TINDAK_LANJUT_LABELS, vkiCheckConclusion, vkiCheckDeficiencies, type VkiCheck } from "../../vki-check";

const LEMBAGA = "PT Tribhakti Inspektama";
const box = (on: boolean | null | undefined) => (on ? "☒" : "☐");
const fileUrl = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;
const tanggal = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";

function rows(key: string, headers: string[], widths: string[], body: ReactNode[][], lead?: ReactNode, center: number[] = [], empty = "Tidak ada data."): FlowItem {
  return {
    kind: "rows",
    key,
    count: Math.max(body.length, 1),
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
          {body.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ fontStyle: "italic", color: "#666" }}>
                {empty}
              </td>
            </tr>
          ) : (
            indices.map((i) => (
              <tr key={i}>
                {body[i].map((c, j) => (
                  <td key={j} className={center.includes(j) ? "ctr" : undefined} style={{ whiteSpace: "pre-line" }}>
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

const Note = ({ children }: { children: ReactNode }) => (
  <p className="kd-p" style={{ fontSize: 10, color: "#444" }}>
    {children}
  </p>
);

/** Form Pemeriksaan Kelengkapan Data dan Dokumen VKI (Pasal 30 ayat (2) Permenperin 27/2025) as A4 flow items. */
export function vkiCheckFlow(c: VkiCheck, documents: RincianDoc[], checkerName: string, today: Date): FlowItem[] {
  const items: FlowItem[] = [];
  const node = (key: string, n: ReactNode) => items.push({ kind: "node", key, node: n });
  const conclusion = vkiCheckConclusion(c);
  const deficiencies = vkiCheckDeficiencies(c);

  node(
    "title",
    <div>
      <div className="kd-title">FORM PEMERIKSAAN KELENGKAPAN DATA DAN DOKUMEN VKI</div>
      <p className="kd-p" style={{ marginTop: 8 }}>
        Lembar kerja Lembaga Pelaksana Verifikasi (LPV) untuk memeriksa kelengkapan data dan dokumen permohonan Verifikasi Kemampuan Industri (VKI) menurut Pasal 30
        ayat (2) Permenperin Nomor 27 Tahun 2025. Formulir ini adalah pemeriksaan administrasi, bukan Laporan Hasil VKI (LHVKI) dan bukan keputusan resmi lembaga
        verifikasi.
      </p>
    </div>,
  );

  items.push(
    rows(
      "a",
      ["Uraian", "Isian"],
      ["38%", "62%"],
      c.identity.map(([k, v]) => [k, v || "—"]),
      <div className="kd-h">A. Identitas Permohonan</div>,
    ),
  );
  node(
    "a-ref",
    <Note>
      Rujukan identitas dan jenis permohonan: Pasal 25 huruf a dan b (subjek VKI); Pasal 30 ayat (1) (permohonan melalui SIINas); Pasal 33–35 (perubahan LHVKI
      karena identitas/alamat tertentu); Pasal 36 ayat (1) (VKI baru jika perubahan lokasi pabrik, kapasitas produksi, atau diversifikasi produk menambah kebutuhan
      bahan baku/penolong).
    </Note>,
  );

  items.push(
    rows(
      "b",
      ["No", "Data yang wajib diajukan", "Ada", "Tidak ada", "Sesuai", "Tidak sesuai", "Referensi Regulasi", "Catatan pemeriksa"],
      ["5%", "27%", "6%", "7%", "7%", "8%", "19%", "21%"],
      c.dataRows.map((r) => [
        r.key,
        r.label,
        box(r.ada),
        box(!r.ada),
        box(r.sesuai === "SESUAI"),
        box(r.sesuai === "TIDAK_SESUAI"),
        r.ref,
        [r.summary && `(${r.summary}${lampiranOf(c, r.key) ? ` — rincian pada Lampiran ${lampiranOf(c, r.key)}` : ""})`, r.note].filter(Boolean).join("\n") || "",
      ]),
      <>
        <div className="kd-h">B. Pemeriksaan Kelengkapan Data (Pasal 30 ayat (2) huruf a)</div>
        <Note>
          Tandai Ada/Tidak ada untuk kelengkapan, dan Sesuai/Tidak sesuai untuk kewajaran terhadap dokumen pendukung. Kesesuaian dengan kondisi lapangan tidak
          dinilai di lembar ini.
        </Note>
      </>,
      [2, 3, 4, 5],
    ),
  );

  items.push(
    rows(
      "c",
      ["No", "Dokumen yang wajib diajukan", "Isian", "Ada", "Tidak ada", "Referensi Regulasi", "Catatan pemeriksa"],
      ["5%", "27%", "20%", "6%", "7%", "17%", "18%"],
      c.docRows.map((r) => [
        r.key,
        r.sub ? <span style={{ paddingLeft: 10, display: "block" }}>{r.label}</span> : r.label,
        r.docs.length ? (
          <>
            {r.key === "1" || r.key === "2" ? <div>{r.isian.split("; ")[0]}</div> : null}
            {r.docs.map((d, i) => (
              <div key={i}>
                <a href={fileUrl(d.path)} target="_blank" rel="noopener noreferrer">
                  {d.label}
                </a>
              </div>
            ))}
          </>
        ) : (
          r.isian
        ),
        r.ada === null ? "" : box(r.ada),
        r.ada === null ? "" : box(!r.ada),
        r.ref,
        [r.checkStatus && `Hasil periksa CR: ${CR_DOCUMENT_STATUS_LABELS[r.checkStatus]}`, r.note].filter(Boolean).join("\n"),
      ]),
      <div className="kd-h">C. Pemeriksaan Kelengkapan Dokumen (Pasal 30 ayat (2) huruf b)</div>,
      [3, 4],
    ),
  );
  node(
    "c-note",
    <Note>
      Catatan regulasi untuk butir 6: Pasal 30 ayat (2) huruf b angka 6 menggunakan &quot;dan/atau&quot;. Butir 6a dan 6b diperiksa sesuai keadaan pemohon, tidak
      otomatis wajib dipenuhi keduanya. Format surat pernyataannya terdapat pada Lampiran II huruf G.
    </Note>,
  );

  rincianDokumen(items, c, documents);

  items.push(
    rows(
      "d",
      ["No", "Data/dokumen yang kurang atau tidak sesuai", "Tindak lanjut yang diminta", "Batas waktu perbaikan", "Status"],
      ["6%", "38%", "30%", "14%", "12%"],
      deficiencies.map((d, i) => [String(i + 1), d.item, d.tindakLanjut, tanggal(c.check.batasWaktu) || "—", "Belum dipenuhi"]),
      <div className="kd-h">D. Daftar kekurangan data dan dokumen (Pasal 31 ayat (1) huruf a)</div>,
      [],
      "Tidak ada kekurangan data/dokumen.",
    ),
  );
  node(
    "d-note",
    <Note>
      Dasar pencatatan kekurangan: Pasal 31 ayat (1) huruf a mengenai pemeriksaan kelengkapan dan kesesuaian data/dokumen. Batas waktu perbaikan dicatat menurut
      komunikasi/prosedur LPV, bukan jangka waktu khusus yang ditentukan dalam Pasal 30.
    </Note>,
  );

  const pair = (ok: boolean, yes: string, no: string) => `${box(ok)} ${yes}\n${box(!ok)} ${no}`;
  items.push(
    rows(
      "e",
      ["Hasil pemeriksaan", "Pilihan"],
      ["38%", "62%"],
      [
        ["Kelengkapan identitas permohonan", pair(conclusion.identitasLengkap, "Lengkap", "Belum lengkap")],
        ["Kelengkapan data (B)", pair(conclusion.dataLengkap, "Lengkap", "Belum lengkap")],
        ["Kelengkapan dokumen (C)", pair(conclusion.dokumenLengkap, "Lengkap", "Belum lengkap")],
        ["Konsistensi data (D)", pair(conclusion.konsisten, "Sesuai", "Ada ketidaksesuaian")],
        ["Tindak lanjut", TINDAK_LANJUT.map((v) => `${box(conclusion.tindakLanjut === v)} ${TINDAK_LANJUT_LABELS[v]}`).join("\n")],
      ],
      <div className="kd-h">E. Kesimpulan Pemeriksaan Administrasi dan Pengesahan (Pasal 31 ayat (1); Pasal 32 ayat (1))</div>,
    ),
  );
  node(
    "e-note",
    <>
      <Note>
        Kesimpulan ini hanya menyatakan kelengkapan administrasi. Berdasarkan Pasal 31 ayat (1) huruf a dan b, pemeriksaan data/dokumen serta kondisi lapangan
        dilaksanakan oleh LPV. Menurut Pasal 32 ayat (1) huruf a dan b, LHVKI diterbitkan melalui SIINas paling lama 5 hari kerja setelah data dan dokumen
        dinyatakan lengkap dan sesuai serta sesuai dengan kondisi di lapangan.
      </Note>
      <Note>
        Dasar hukum: Peraturan Menteri Perindustrian Republik Indonesia Nomor 27 Tahun 2025 tentang Tata Cara Penerbitan Pertimbangan Teknis Impor Tekstil dan
        Produk Tekstil. Berlaku sejak 30 Juli 2025 (Pasal 61).
      </Note>
    </>,
  );
  node(
    "ttd",
    <div className="kd-sign">
      <div>{tanggal(today)}</div>
      <div>Pemeriksa, Customer Relationship</div>
      <div>{LEMBAGA}</div>
      <div className="kd-sign-space" />
      <div className="kd-sign-name">{checkerName || "(………………………………)"}</div>
    </div>,
  );
  lampiranProduksi(items, c);
  lampiranRencana(items, c);
  lampiranDaftarDokumen(items, documents);
  return items;
}

export type RincianDoc = {
  key: string;
  label: string;
  documentPath: string | null;
  lengkap: boolean;
  status: DocVerificationStatusValue;
  rejectionNote: string;
  requestNote: string;
  unavailable?: boolean;
  unavailableNote?: string;
  version: number;
  uploadedAt: string | null;
  category?: string;
  uploadedByName?: string | null;
};

/** A row of a Rincian table: a checklist document, or a requirement the system has no document field for. */
type RincianRow = { doc: RincianDoc } | { label: string; missing: string };

function rincianTable(key: string, list: RincianRow[], lead: ReactNode): FlowItem {
  return rows(
    key,
    ["No", "Dokumen", "Ada", "Tidak ada", "Hasil Pemeriksaan CR", "Versi / Tgl Upload", "Catatan pemeriksa"],
    ["5%", "31%", "6%", "8%", "15%", "14%", "21%"],
    list.map((r, i) => {
      if (!("doc" in r)) return [`${i + 1}.`, r.label, "", "", "—", "—", r.missing];
      const d = r.doc;
      const ada = d.lengkap && Boolean(d.documentPath) && !d.unavailable;
      return [
        `${i + 1}.`,
        d.documentPath ? (
          <a href={fileUrl(d.documentPath)} target="_blank" rel="noopener noreferrer">
            {d.label}
          </a>
        ) : (
          d.label
        ),
        box(ada),
        box(!ada),
        d.unavailable ? "Belum Tersedia" : d.status === "PENDING" && !d.lengkap ? "Belum Ada" : CR_DOCUMENT_STATUS_LABELS[d.status],
        d.lengkap ? `V${d.version}${d.uploadedAt ? ` · ${tanggal(d.uploadedAt)}` : ""}` : "—",
        [d.unavailable && `Belum tersedia${d.unavailableNote ? `: ${d.unavailableNote}` : ""}`, d.rejectionNote, d.requestNote && `Permintaan: ${d.requestNote}`]
          .filter(Boolean)
          .join("\n"),
      ];
    }),
    lead,
    [2, 3],
    "Tidak ada dokumen pada kelompok ini.",
  );
}

/** C. Rincian Pemeriksaan Dokumen — every checklist document, grouped I–VI, with the tax and electricity details. */
function rincianDokumen(items: FlowItem[], c: VkiCheck, documents: RincianDoc[]) {
  const used = new Set<string>();
  const take = (pred: (d: RincianDoc) => boolean): RincianRow[] =>
    documents
      .filter((d) => !used.has(d.key) && pred(d))
      .map((d) => {
        used.add(d.key);
        return { doc: d };
      });
  const one = (key: string, label: string): RincianRow => {
    const d = documents.find((x) => x.key === key);
    if (d) used.add(d.key);
    return d ? { doc: d } : { label, missing: "Belum ada pada daftar dokumen permohonan." };
  };
  const sub = (title: string) => <div className="kd-sh">{title}</div>;
  const node = (key: string, n: ReactNode) => items.push({ kind: "node", key, node: n });

  node("rd-h", <div className="kd-h">RINCIAN PEMERIKSAAN DOKUMEN</div>);

  // I. Perizinan Berusaha
  items.push(
    rincianTable(
      "rd-1",
      take((d) => ["nib", "kbli-utama", "kbli-pendukung", "sk", "notarial", "notarial-amendment"].includes(d.key)),
      sub("I. Pemeriksaan Administratif Kelengkapan Dokumen Perizinan Berusaha"),
    ),
  );

  // II. Perpajakan + Rincian Perpajakan
  items.push(rincianTable("rd-2", take((d) => d.key === "npwp" || d.key === "tax-proof-summary" || d.key === "skt" || d.key.startsWith("tax-support:")), sub("II. Pemeriksaan Administratif Perpajakan")));
  items.push(
    rows(
      "pajak",
      ["No", "Tahun pajak", "Jenis bukti (SPT / SSP / bukti bayar)", "Nomor dan tanggal bukti", "Nominal (Rp)", "Kelengkapan", "Catatan pemeriksa"],
      ["6%", "11%", "24%", "20%", "12%", "11%", "16%"],
      c.companyAge === "UNDER_3" ? [] : c.taxRows.map((r, i) => [String(i + 1), r.year, r.jenis || "—", r.nomorTanggal || "—", "—", box(r.ada), r.note]),
      <>
        <div className="kd-sh">Rincian Perpajakan — bukti pembayaran pajak 3 tahun terakhir (Pasal 30 ayat (2) huruf b angka 7)</div>
        <p className="kd-p">
          Umur Perizinan Berusaha:
          {"\n"}
          {box(c.companyAge === "OVER_3")} 3 tahun atau lebih (isi bukti bayar pajak 3 tahun)
          {"\n"}
          {box(c.companyAge === "UNDER_3")} Kurang dari 3 tahun (isi surat keterangan terdaftar pajak)
        </p>
      </>,
      [5],
      c.companyAge === "UNDER_3" ? "Tidak berlaku — Perizinan Berusaha kurang dari 3 tahun." : "Tidak ada data.",
    ),
  );
  items.push(
    rows(
      "skt",
      ["Surat keterangan terdaftar pajak (bila Perizinan Berusaha kurang dari 3 tahun)", "Isian"],
      ["55%", "45%"],
      c.companyAge === "UNDER_3"
        ? [
            ["Nomor surat", c.skt.nomor || "—"],
            ["Tanggal terbit", c.skt.tanggal || "—"],
            ["Instansi penerbit", c.skt.penerbit || "—"],
            ["Sesuai dengan NPWP pemohon", `${box(c.skt.sesuaiNpwp === true)} Ya   ${box(c.skt.sesuaiNpwp === false)} Tidak`],
          ]
        : [["Tidak berlaku — Perizinan Berusaha 3 tahun atau lebih", ""]],
    ),
  );
  node(
    "pajak-note",
    <Note>
      Dasar dokumen perpajakan: Pasal 30 ayat (2) huruf b angka 7. Bukti pembayaran pajak 3 tahun terakhir atau surat keterangan terdaftar pajak dipilih menurut
      umur Perizinan Berusaha.
    </Note>,
  );

  // III. Kepemilikan Bangunan
  items.push(rincianTable("rd-3", take((d) => d.key.startsWith("location:")), sub("III. Pemeriksaan Administratif Kepemilikan Bangunan")));

  // IV. Tenaga Kerja
  items.push(rincianTable("rd-4", [one("vki-support:tenaga-kerja", "Surat Pernyataan Tenaga Kerja")], sub("IV. Pemeriksaan Administratif Tenaga Kerja")));
  if (c.tenagaKerja.length > 0) {
    const total = c.tenagaKerja.reduce((sum, e) => sum + (Number(e.jumlah.replace(/\./g, "")) || 0), 0);
    items.push(
      rows(
        "rd-4-tk",
        ["No", "Kategori", "Jumlah (orang)"],
        ["8%", "62%", "30%"],
        [...c.tenagaKerja.map((e, i) => [`${i + 1}.`, e.kategori || "—", e.jumlah || "—"]), ["", <b key="t">Total</b>, <b key="v">{total.toLocaleString("id-ID")}</b>]],
      ),
    );
  }

  // V. Alur Produksi
  items.push(
    rincianTable(
      "rd-5",
      [
        one("vki-support:alur-proses", "Surat Pernyataan Alur Proses Produksi"),
        { label: "Gambar alur proses produksi", missing: "Belum ada kolom unggah terpisah pada sistem — dilampirkan bersama Surat Pernyataan Alur Proses bila ada." },
      ],
      sub("V. Pemeriksaan Administratif Alur Produksi"),
    ),
  );

  // VI. Dokumen Pendukung VKI
  items.push(
    rincianTable(
      "rd-6",
      [
        one("vki-support:tidak-diperjualbelikan", "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan"),
        one("vki-support:kebenaran-data", "Surat Pernyataan Kebenaran Data"),
        one("vki-support:memiliki-menguasai", "Surat Pernyataan memiliki/menguasai gudang bahan baku dan/atau hasil produksi"),
        {
          label: "Surat Pernyataan memiliki unit pengolahan limbah atau bekerja sama dengan pihak lain",
          missing: "Belum ada kolom unggah terpisah pada sistem (Pasal 30 ayat (2) huruf b angka 6 huruf b — sesuai keadaan pemohon).",
        },
        ...take((d) => d.key.startsWith("vki-lhvki:")),
      ],
      sub("VI. Pemeriksaan Administratif Dokumen Pendukung VKI"),
    ),
  );
  items.push(
    rows(
      "listrik",
      ["No", "Bulan dan tahun", "Nominal (Rp)", "Pemakaian (kWh)", "Bukti bayar", "Sesuai bukti bayar", "Catatan pemeriksa"],
      ["6%", "17%", "16%", "15%", "16%", "11%", "19%"],
      c.electricity.map((e, i) => {
        const doc = documents.find((d) => d.key === e.docKey);
        return [
          String(i + 1),
          e.bulan || "—",
          e.nominal || "—",
          e.kwh || "—",
          doc?.documentPath ? (
            <a key="f" href={fileUrl(doc.documentPath)} target="_blank" rel="noopener noreferrer">
              Lihat bukti
            </a>
          ) : (
            "Belum diunggah"
          ),
          box(e.sesuai === true),
          e.note,
        ];
      }),
      sub("Rincian bukti pembayaran listrik 3 bulan sebelumnya (Pasal 30 ayat (2) huruf b angka 8)"),
      [5],
    ),
  );
  documents.filter((d) => d.key.startsWith("vki-support:listrik:")).forEach((d) => used.add(d.key));

  // Anything not grouped above (e.g. a new document type) still gets checked.
  const rest = take(() => true);
  if (rest.length > 0) items.push(rincianTable("rd-7", rest, sub("VII. Dokumen Lainnya")));
}

/** Lampiran — Data Aspek Produksi as submitted on the application (the data checked in B.). */
function lampiranProduksi(items: FlowItem[], c: VkiCheck) {
  if (c.production.length === 0) return;
  items.push({
    kind: "node",
    key: "lamp-h",
    breakBefore: true,
    node: (
      <div>
        <div className="kd-h" style={{ marginTop: 0 }}>LAMPIRAN 1 — DATA ASPEK PRODUKSI</div>
        <Note>
          Data kemampuan produksi sebagaimana diajukan pemohon pada permohonan VKI (Pasal 30 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025), yang menjadi dasar
          pemeriksaan kelengkapan data pada bagian B.
        </Note>
      </div>
    ),
  });
  c.production.forEach((tb) => {
    const total = tb.widths.reduce((a, b) => a + b, 0);
    items.push(
      rows(
        `lamp-${tb.key}`,
        tb.headers,
        tb.widths.map((w) => `${(w / total) * 100}%`),
        tb.rows,
        <div className="kd-sh">
          Lampiran {tb.key} — {tb.title}
        </div>,
        tb.center ?? [],
        "Tidak ada data pada permohonan.",
      ),
    );
  });
}

/** The Lampiran table a B. data item is detailed in ("1" → "B.1", "2a"/"2b" → "B.2", "4a" → "B.4a"). */
function lampiranOf(c: VkiCheck, rowKey: string): string | null {
  const key = rowKey === "2a" || rowKey === "2b" ? "B.2" : `B.${rowKey}`;
  return c.production.some((t) => t.key === key && t.rows.length > 0) ? key : null;
}

const List = ({ items }: { items: string[] }) => (
  <>
    {items.map((t, i) => (
      <div key={i} style={{ display: "flex", gap: 4 }}>
        <span>•</span>
        <span>{t}</span>
      </div>
    ))}
  </>
);

/** Lampiran 2 — Rencana Pemeriksaan dan Verifikasi VKI: what the applicant prepares, and the photos taken on site. */
function lampiranRencana(items: FlowItem[], c: VkiCheck) {
  const id = Object.fromEntries(c.identity);
  items.push({
    kind: "node",
    key: "rencana-h",
    breakBefore: true,
    node: (
      <div>
        <div className="kd-h" style={{ marginTop: 0 }}>LAMPIRAN 2 — RENCANA PEMERIKSAAN DAN VERIFIKASI KEMAMPUAN INDUSTRI (VKI)</div>
        <table className="kd-table kd-kv">
          <tbody>
            <tr>
              <td>Nama Perusahaan</td>
              <td>{id["Nama perusahaan industri"] || "—"}</td>
            </tr>
            <tr>
              <td>Nomor Permohonan</td>
              <td>{id["Nomor permohonan (SIINas)"] || "—"}</td>
            </tr>
            <tr>
              <td>Alamat Kantor / Pabrik</td>
              <td style={{ whiteSpace: "pre-line" }}>{[id["Alamat kantor"], id["Alamat pabrik/lokasi produksi"]].filter(Boolean).join("\n") || "—"}</td>
            </tr>
          </tbody>
        </table>
        <p className="kd-p">
          Lampiran ini disampaikan kepada pemohon agar perusahaan dapat menyiapkan dokumen pendukung dan kondisi lapangan sebelum pelaksanaan verifikasi. Dengan
          persiapan yang lengkap, pemeriksaan dokumen dan survey lapangan dapat berjalan lebih cepat, dan kesesuaian antara data yang diajukan dengan kondisi aktual
          dapat dipastikan tanpa kunjungan ulang.
        </p>
      </div>
    ),
  });
  items.push(
    rows(
      "rencana-aspek",
      ["No", "Aspek / Metode", "Yang Diverifikasi", "Dokumen yang Perlu Disiapkan Perusahaan", "Disiapkan / Ditunjukkan di Lapangan", "Referensi Regulasi", "Siap"],
      ["5%", "15%", "18%", "23%", "18%", "15%", "6%"],
      RENCANA_ASPEK.map((a, i) => [
        `${i + 1}`,
        <>
          <b>{a.aspek}</b>
          <div style={{ fontStyle: "italic", color: "#555", marginTop: 2 }}>{a.metode.join(", ")}</div>
        </>,
        <List key="v" items={a.diverifikasi} />,
        <List key="d" items={a.dokumen} />,
        <List key="l" items={a.lapangan} />,
        a.referensi.join("\n"),
        "☐",
      ]),
      <>
        <div className="kd-sh">A. Rencana Pemeriksaan dan Persiapan per Aspek</div>
        <Note>Pemohon dimohon mencentang kolom “Siap” untuk setiap aspek yang dokumen dan kondisinya sudah disiapkan.</Note>
      </>,
      [0, 6],
    ),
  );
  items.push({
    kind: "node",
    key: "rencana-persiapan",
    node: (
      <>
        <div className="kd-sh">B. Persiapan Perusahaan pada Hari Pelaksanaan</div>
        <List items={RENCANA_PERSIAPAN} />
      </>
    ),
  });
  items.push(
    rows(
      "rencana-foto",
      ["No", "Objek yang Difoto", "Ketentuan Foto", "Terkait Butir", "Ada"],
      ["6%", "32%", "40%", "14%", "8%"],
      RENCANA_FOTO.map(([objek, ketentuan, butir], i) => [`${i + 1}`, <b key="o">{objek}</b>, ketentuan, butir, "☐"]),
      <>
        <div className="kd-sh">C. Daftar Dokumentasi Foto</div>
        <Note>
          Selama survey lapangan, tim verifikasi mengambil foto berikut. Setiap foto dilengkapi tanggal, waktu, dan titik koordinat (geotag). Perusahaan dimohon
          memastikan objek di bawah ini dapat difoto pada hari pelaksanaan.
        </Note>
      </>,
      [0, 3, 4],
    ),
  );
  items.push({
    kind: "node",
    key: "rencana-note",
    node: <Note>Dokumen atau kondisi yang belum dapat ditunjukkan pada saat pelaksanaan akan dicatat dalam Berita Acara Klarifikasi dan dapat memperpanjang proses verifikasi.</Note>,
  });
}

/** Lampiran 3 — every document the applicant uploaded/handed in, with its original file name. */
function lampiranDaftarDokumen(items: FlowItem[], documents: RincianDoc[]) {
  const uploaded = documents.filter((d) => d.documentPath);
  items.push(
    rows(
      "daftar-dokumen",
      ["No", "Kategori", "Jenis Dokumen", "Nama File", "Versi / Tgl Upload", "Diunggah oleh", "Hasil Pemeriksaan CR"],
      ["5%", "13%", "22%", "24%", "13%", "11%", "12%"],
      uploaded.map((d, i) => [
        `${i + 1}.`,
        d.category ?? "—",
        d.label,
        <a key="f" href={fileUrl(d.documentPath!)} target="_blank" rel="noopener noreferrer">
          {fileNameOf(d.documentPath)}
        </a>,
        `V${d.version}${d.uploadedAt ? `\n${tanggal(d.uploadedAt)}` : ""}`,
        d.uploadedByName || "Perusahaan",
        d.unavailable ? "Belum Tersedia" : CR_DOCUMENT_STATUS_LABELS[d.status],
      ]),
      <div>
        <div className="kd-h" style={{ marginTop: 0 }}>LAMPIRAN 3 — DAFTAR DOKUMEN YANG DIUNGGAH / DISERAHKAN</div>
        <Note>
          Seluruh dokumen yang diunggah atau diserahkan pemohon pada permohonan ini ({uploaded.length} dari {documents.length} dokumen pada daftar), beserta nama file
          aslinya. Nama file dapat diklik untuk membuka dokumen.
        </Note>
      </div>,
      [0],
      "Belum ada dokumen yang diunggah.",
    ),
  );
  items[items.length - 1].breakBefore = true;
}
