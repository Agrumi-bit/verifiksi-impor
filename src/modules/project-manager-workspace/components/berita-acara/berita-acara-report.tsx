"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "./berita-acara.css";
import { A4Pages, type FlowItem } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CurrentPagePdfButton } from "@/modules/technical-analyst-workspace/components/report/pdf-download-button";
import { printWithSignedLinks } from "@/lib/print-with-signed-links";
import { SCHEME_NAME, lampiranList, roman, tanggalPanjang, tanggalParts, type BeritaAcara, type BeritaAcaraScheme } from "../../berita-acara";
import type { PmApplicationDetail } from "../detail/types";
import { lampiranItems } from "./berita-acara-lampiran";

const KOP = "/images/berita-acara/kop-berita-acara.jpg";

type Payload = { beritaAcara: BeritaAcara | null; scheme: BeritaAcaraScheme; applicationNumber: string; companyName: string | null };

function Li({ mark, level = 1, children }: { mark: string; level?: 1 | 2; children: ReactNode }) {
  return (
    <div className={`ba-li ba-l${level}`}>
      <span>{mark}</span>
      <span>{children}</span>
    </div>
  );
}

/** The template text (BA/VKI/26/04/001), worded for VKI or VIU, followed by the lampiran pages. */
export function beritaAcaraFlow(ba: BeritaAcara, scheme: BeritaAcaraScheme, detail: PmApplicationDetail | null): FlowItem[] {
  const name = SCHEME_NAME[scheme];
  const full = `${name} (${scheme})`;
  const lower = name.toLowerCase();
  const p = tanggalParts(ba.tanggal);
  const items: FlowItem[] = [];
  const node = (key: string, n: ReactNode, breakBefore?: boolean) => items.push({ kind: "node", key, node: n, breakBefore });
  const para = (key: string, text: ReactNode) => node(key, <p className="ba-p">{text}</p>);
  const headed = (key: string, title: string, text: string) =>
    node(
      key,
      <>
        <div className="ba-h">{title}</div>
        <p className="ba-p">{text}</p>
      </>,
    );
  const bullets = (key: string, list: string[]) => list.forEach((t, i) => node(`${key}-${i}`, <Li mark="●">{t}</Li>));

  node(
    "title",
    <div>
      <div className="ba-title">
        BERITA ACARA PELAKSANAAN
        <br />
        {name.toUpperCase()} ({scheme})
      </div>
      <div className="ba-nomor">Nomor: {ba.nomor || "…"}</div>
    </div>,
  );
  para(
    "pembuka",
    <>
      Pada hari ini {p?.hari ?? "…"} tanggal {p?.tanggal ?? "…"} bulan {p?.bulan ?? "…"} tahun {p?.tahun ?? "…"}, bertempat di {ba.tempat || "…"}, telah
      dilaksanakan kegiatan {full} terhadap:
    </>,
  );
  node(
    "identitas",
    <table className="ba-ident">
      <tbody>
        <tr>
          <td>Nama Perusahaan</td>
          <td>:</td>
          <td>{ba.namaPerusahaan}</td>
        </tr>
        <tr>
          <td>Alamat</td>
          <td>:</td>
          <td>{ba.alamat}</td>
        </tr>
      </tbody>
    </table>,
  );
  para("dasar", `Pelaksanaan ${full} ini mengacu pada ketentuan peraturan perundang-undangan yang berlaku, antara lain:`);
  if (scheme === "VKI") {
    node("dh1", <Li mark="1.">Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 tentang Verifikasi Kemampuan Industri, khususnya:</Li>);
    node(
      "dh1a",
      <Li mark="○" level={2}>
        Pasal 30 ayat (2), yang menyatakan bahwa lembaga verifikasi melakukan pemeriksaan untuk memastikan kesesuaian antara data dan dokumen yang disampaikan oleh
        perusahaan dengan kondisi aktual di lapangan;
      </Li>,
    );
    node(
      "dh1b",
      <Li mark="○" level={2}>
        Ketentuan mengenai persyaratan administratif dan pelaksanaan verifikasi kemampuan industri.
      </Li>,
    );
  } else {
    node(
      "dh1",
      <Li mark="1.">
        Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, khususnya ketentuan mengenai persyaratan administratif dan pelaksanaan verifikasi importir umum.
      </Li>,
    );
  }
  node(
    "dh2",
    <Li mark="2.">Ketentuan teknis lainnya yang relevan dengan pelaksanaan {lower} serta pedoman internal lembaga verifikasi.</Li>,
  );
  para(
    "sistematis",
    `Pelaksanaan ${full} dilakukan secara sistematis melalui beberapa tahapan yang disepakati antara Lembaga Verifikasi dan pihak perusahaan, dengan tujuan untuk memastikan kesesuaian antara data dan dokumen yang disampaikan oleh perusahaan dengan kondisi aktual di lapangan, sesuai ketentuan yang berlaku, secara ringkas telah dilakukan`,
  );

  // Each heading travels with its first paragraph, so it is never left alone at the foot of a sheet.
  headed(
    "om",
    "1.\u00a0\u00a0Opening Meeting",
    `Opening Meeting dilaksanakan sebagai tahapan awal dalam kegiatan ${full} yang bertujuan untuk memastikan kesamaan pemahaman antara tim verifikator dan pihak perusahaan terkait pelaksanaan verifikasi.`,
  );
  para("om2", "Dalam kegiatan ini, tim verifikator melakukan:");
  bullets("om-b", [
    "Perkenalan tim verifikasi beserta peran dan tanggung jawab masing-masing personel yang terlibat dalam kegiatan verifikasi",
    `Penyampaian tujuan, metodologi, dan tahapan ${scheme}, termasuk pendekatan verifikasi yang berfokus pada kesesuaian antara dokumen dan kondisi aktual di lapangan`,
    "Konfirmasi ruang lingkup verifikasi, agenda kegiatan, serta jadwal pelaksanaan pemeriksaan lapangan agar seluruh pihak memahami alur kegiatan secara menyeluruh",
    "Penyepakatan mekanisme komunikasi dan klarifikasi, termasuk tata cara penyampaian data, permintaan dokumen, serta proses klarifikasi selama kegiatan berlangsung",
  ]);
  para(
    "om3",
    "Melalui Opening Meeting, seluruh pihak memperoleh pemahaman yang sama sehingga pelaksanaan verifikasi dapat berjalan secara efektif, transparan, dan terstruktur.",
  );

  headed("pl", "2.\u00a0\u00a0Pelaksanaan", "Pelaksanaan verifikasi dilakukan melalui kombinasi pemeriksaan dokumen (desk review) dan verifikasi lapangan (site visit).");
  para("pl2", "Kegiatan ini meliputi:");
  bullets("pl-b", [
    "Pemeriksaan dokumen administratif yang disampaikan oleh perusahaan",
    "Verifikasi kesesuaian data, dengan membandingkan dokumen yang disampaikan perusahaan terhadap kondisi aktual di lapangan sesuai dengan ketentuan verifikasi",
    scheme === "VKI"
      ? "Observasi fasilitas usaha, termasuk lokasi, gudang, area produksi, serta sarana dan prasarana pendukung"
      : "Observasi fasilitas usaha, termasuk lokasi kantor, gudang, serta sarana dan prasarana pendukung",
    "Klarifikasi dengan pihak perusahaan, untuk memastikan pemahaman yang tepat terhadap data yang disampaikan serta menjelaskan kondisi yang menjadi temuan. Hasil klarifikasi tersebut dituangkan dalam Berita Acara Klarifikasi (BAK) yang merupakan bagian tidak terpisahkan dari proses verifikasi.",
  ]);
  para(
    "pl3",
    "Pelaksanaan verifikasi dilakukan secara objektif dengan prinsip memastikan kecocokan antara dokumen dan kondisi aktual, tanpa melakukan penilaian di luar ruang lingkup yang ditetapkan.",
  );

  headed("cm", "3.\u00a0\u00a0Closing Meeting", "Closing Meeting dilaksanakan sebagai tahapan akhir dari kegiatan verifikasi untuk menyampaikan hasil sementara kepada pihak perusahaan.");
  para("cm2", "Dalam kegiatan ini, tim verifikator menyampaikan:");
  bullets("cm-b", [
    "Ringkasan pelaksanaan pemeriksaan lapangan, termasuk aktivitas verifikasi yang telah dilakukan",
    "Ringkasan temuan, baik yang telah sesuai maupun kondisi yang memerlukan penjelasan, tanpa menyampaikan rekomendasi secara rinci",
    "Konfirmasi terhadap hasil klarifikasi, termasuk kesesuaian antara dokumen, pernyataan perusahaan, dan hasil observasi lapangan",
    "Penjelasan tahapan selanjutnya, yaitu proses analisis lebih lanjut oleh lembaga verifikasi serta penyusunan laporan hasil verifikasi",
  ]);
  para(
    "cm3",
    "Closing Meeting bertujuan untuk memastikan bahwa seluruh hasil verifikasi telah dipahami oleh pihak perusahaan dan tidak terdapat perbedaan persepsi sebelum masuk ke tahap pelaporan.",
  );
  para(
    "penutup1",
    `Seluruh tahapan pelaksanaan ${scheme} telah dilakukan secara sistematis, transparan, dan sesuai dengan metodologi verifikasi, mulai dari Opening Meeting, pelaksanaan verifikasi, hingga Closing Meeting. Dengan demikian, seluruh tahapan pelaksanaan verifikasi telah dilakukan secara sistematis, transparan, dan sesuai dengan prosedur yang berlaku.`,
  );
  para(
    "penutup2",
    "Demikian Berita Acara ini dibuat dengan sebenarnya untuk digunakan sebagaimana mestinya. Apabila di kemudian hari ditemukan ketidaksesuaian, pihak perusahaan bersedia bertanggung jawab sesuai ketentuan yang berlaku.",
  );
  node(
    "ttd",
    <div className="ba-sign">
      <div className="ba-sign-date">
        {ba.kota || "…"}, {tanggalPanjang(ba.tanggal) || "…"}
      </div>
      <div className="ba-sign-cols">
        <div>
          <div>Lembaga Pelaksana</div>
          <div>{ba.lembagaNama}</div>
          <div className="ba-sign-space" />
          <div className="ba-sign-name">{ba.penandatanganNama || "(………………………………)"}</div>
          {ba.penandatanganJabatan && <div>{ba.penandatanganJabatan}</div>}
        </div>
        <div>
          <div>Pemohon</div>
          <div>{ba.namaPerusahaan}</div>
          <div className="ba-sign-space" />
          <div className="ba-sign-name">{ba.picNama || "(………………………………)"}</div>
          {ba.picJabatan && <div>{ba.picJabatan}</div>}
        </div>
      </div>
    </div>,
  );

  const lampiran = lampiranList(scheme, ba);
  if (lampiran.length > 0) {
    node(
      "lampiran",
      <div>
        <div className="ba-lampiran-title">Lampiran</div>
        <p className="ba-p">
          Berikut merupakan dokumen pendukung yang dilampirkan dalam pelaksanaan {full} dan menjadi bagian yang tidak terpisahkan dari laporan
        </p>
      </div>,
      true,
    );
    lampiran.forEach((l, i) => node(`lamp-${i}`, <Li mark={`${roman(i + 1)}.`}>{l.title}</Li>));
    para(
      "lampiran-penutup",
      `Seluruh lampiran tersebut telah diperiksa dan digunakan sebagai dasar dalam pelaksanaan verifikasi serta penyusunan laporan hasil ${lower}.`,
    );
    if (detail) lampiran.forEach((l, i) => l.def && items.push(...lampiranItems(l.def, roman(i + 1), detail, ba, scheme)));
  }
  return items;
}

function Sheet({ pageNo, total, children }: { pageNo: number; total: number; children: ReactNode }) {
  return (
    <section className="rd-sheet ba-sheet">
      <div className="rd-pagehead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={KOP} alt="PT Tribhakti Inspektama" />
      </div>
      <div className="rd-body">{children}</div>
      <div className="rd-pagefoot">
        <div>
          Halaman {pageNo} dari {total}
        </div>
      </div>
    </section>
  );
}

/** Printable Berita Acara Pelaksanaan of one application (Cetak / Unduh PDF). */
export function BeritaAcaraReport({ type, applicationNumber }: { type: string; applicationNumber: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "berita-acara", applicationNumber, "report"],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${type}/${applicationNumber}/berita-acara`);
      if (!response.ok) throw new Error("Gagal memuat Berita Acara");
      return ((await response.json()) as { data: Payload }).data;
    },
  });
  // The data lampiran print the application's own detail (same source as the application page).
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["project-manager-workspace", "applications", type, applicationNumber],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/applications/${type}/${applicationNumber}`);
      if (!response.ok) throw new Error("Gagal memuat permohonan");
      return ((await response.json()) as { data: PmApplicationDetail }).data;
    },
  });

  const back = `/project-manager-workspace/applications/${type}/${applicationNumber}?tab=Berita%20Acara`;
  return (
    <div className="report-doc ba-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={back} className="rd-back">
          ← Kembali ke Permohonan
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Berita Acara Pelaksanaan <span className="rd-topbar-sub">&middot; {applicationNumber}</span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => void printWithSignedLinks()}>
            Cetak
          </button>
          <CurrentPagePdfButton name={`Berita-Acara-Pelaksanaan-${applicationNumber}`} />
        </div>
      </div>
      <main className="rd-main">
        {(isLoading || detailLoading) && <p className="py-10 text-center text-sm text-muted-foreground">Memuat laporan...</p>}
        {isError && <p className="py-10 text-center text-sm text-destructive">Gagal memuat Berita Acara.</p>}
        {data && !data.beritaAcara && (
          <p className="py-10 text-center text-sm text-muted-foreground">Berita Acara belum disimpan. Lengkapi di tab Berita Acara pada permohonan.</p>
        )}
        {data?.beritaAcara && !detailLoading && (
          <A4Pages
            items={beritaAcaraFlow(data.beritaAcara, data.scheme, detail ?? null)}
            renderPage={(pageNo, total, children) => (
              <Sheet pageNo={pageNo} total={total}>
                {children}
              </Sheet>
            )}
          />
        )}
      </main>
    </div>
  );
}
