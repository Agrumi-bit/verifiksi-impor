import type { ReactNode } from "react";

import type { FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CR_DOCUMENT_STATUS_LABELS } from "../../status";
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
export function vkiCheckFlow(c: VkiCheck, checkerName: string, today: Date): FlowItem[] {
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
        [r.summary && `(${r.summary})`, r.note].filter(Boolean).join("\n") || "",
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

  items.push(
    rows(
      "listrik",
      ["No", "Bulan dan tahun", "Nominal (Rp)", "Pemakaian (kWh)", "Sesuai bukti bayar", "Catatan pemeriksa"],
      ["6%", "20%", "18%", "17%", "14%", "25%"],
      c.electricity.map((e, i) => [String(i + 1), e.bulan || "—", e.nominal || "—", e.kwh || "—", box(e.sesuai === true), e.note]),
      <div className="kd-sh">Rincian bukti pembayaran listrik 3 bulan sebelumnya (Pasal 30 ayat (2) huruf b angka 8)</div>,
      [4],
    ),
  );

  items.push(
    rows(
      "pajak",
      ["No", "Tahun pajak", "Jenis bukti (SPT / SSP / bukti bayar)", "Nomor dan tanggal bukti", "Nominal (Rp)", "Kelengkapan", "Catatan pemeriksa"],
      ["6%", "11%", "24%", "20%", "12%", "11%", "16%"],
      c.companyAge === "UNDER_3" ? [] : c.taxRows.map((r, i) => [String(i + 1), r.year, r.jenis || "—", r.nomorTanggal || "—", "—", box(r.ada), r.note]),
      <>
        <div className="kd-sh">Rincian bukti pembayaran pajak 3 tahun terakhir (Pasal 30 ayat (2) huruf b angka 7)</div>
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
  return items;
}
