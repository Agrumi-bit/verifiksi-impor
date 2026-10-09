import { compact, fdLong, nf, sum, uniq, withWords } from "./format";
import { rupiahValuer } from "./report-value";
import type { P47Dataset } from "./types";

/*
 * Bab 7 "Modal Operasi & Rencana Nilai Impor" of the Laporan Pelaksanaan VIU: each Pemohon VIU's
 * rencana nilai impor (Rupiah, report-value.ts) against its modal operasi — the Jumlah Modal Kerja of the
 * Surat Pernyataan Kepemilikan Modal Kerja — with the ratio, its distribution, its trend per bulan terbit
 * LHVIU, and the Technical Analyst's modal decision. One row per permohonan.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pct1 = (part: number, total: number) => (total > 0 ? (part > 0 && (part / total) * 100 < 0.05 ? "<0,1%" : `${((part / total) * 100).toFixed(1).replace(".", ",")}%`) : "0%");
const rp = (v: number) => `Rp ${compact(v)}`;
const ratioText = (r: number) => `${(r * 100).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const andList = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} dan ${xs[xs.length - 1]}`);
const medianOf = (vals: number[]) => {
  const xs = [...vals].sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
};

export const MODAL_BUCKETS = [
  { label: "< Rp10 M", max: 10e9 },
  { label: "Rp10–50 M", max: 50e9 },
  { label: "Rp50–100 M", max: 100e9 },
  { label: "Rp100–500 M", max: 500e9 },
  { label: "> Rp500 M", max: Infinity },
] as const;
export const RATIO_BUCKETS = [
  { label: "≤ 25%", max: 0.25 },
  { label: "> 25–50%", max: 0.5 },
  { label: "> 50–100%", max: 1 },
  { label: "> 100%", max: Infinity },
] as const;

export const ratioGroup = (r: number | null) => (r === null ? "Tidak dapat dihitung" : RATIO_BUCKETS.find((b) => r <= b.max)!.label);

export type CapitalRow = {
  applicationId: string; company: string; lhviu: string; month: string | null; currencies: string[];
  modal: number | null; plan: number; unconverted: number; ratio: number | null; decision: string; decisionTone: string;
};

export type Bab7 = {
  rows: CapitalRow[];
  totalPlan: number;
  totalModal: number;
  withModal: CapitalRow[];
  modalBuckets: { label: string; value: number }[];
  ratioBuckets: { label: string; value: number }[];
  months: { key: string; label: string; median: number | null; count: number }[];
  decisions: { label: string; tone: string; count: number }[];
  table: (string | number)[][];
  highlights: string[];
  sub71: string[]; sub72: string[]; sub73: string[]; sub74: string[]; sub75: string[]; sub76: string[];
  limits: string[];
};

export function bab7(ds: P47Dataset): Bab7 {
  const toRp = rupiahValuer(ds);
  const appIds = uniq(ds.lines.map((l) => l.applicationId));
  const byApp = new Map(ds.applications.map((a) => [a.id, a]));
  const rows: CapitalRow[] = appIds.map((id) => {
    const ls = ds.lines.filter((l) => l.applicationId === id);
    const vs = ds.values.filter((v) => v.applicationId === id);
    const a = byApp.get(id);
    const plan = sum(ls.map((l) => toRp(l) ?? 0));
    const modal = vs.find((v) => v.modalKerja !== null && v.modalKerja > 0)?.modalKerja ?? null;
    // The modal decision is per application; with several currencies the worst one wins.
    const worst = vs.find((v) => v.decision.tone === "bad") ?? vs.find((v) => v.decision.tone === "warn") ?? vs.find((v) => v.decision.tone === "ok") ?? vs[0];
    return {
      applicationId: id, company: ls[0]?.company ?? a?.company ?? "—", lhviu: a?.lhviu?.number ?? "—", month: a?.lhviu?.issuedAt?.slice(0, 7) ?? null,
      currencies: uniq(ls.map((l) => l.currency)), modal, plan, unconverted: ls.filter((l) => toRp(l) === null).length,
      ratio: modal ? plan / modal : null, decision: worst?.decision.label ?? "Belum Dianalisis", decisionTone: worst?.decision.tone ?? "na",
    };
  }).sort((a, b) => b.plan - a.plan);

  const totalPlan = sum(rows.map((r) => r.plan));
  const withModal = rows.filter((r) => r.modal !== null);
  const totalModal = sum(withModal.map((r) => r.modal ?? 0));
  const modalBuckets = [
    ...MODAL_BUCKETS.map((b, i) => ({ label: b.label, value: withModal.filter((r) => (r.modal ?? 0) < b.max && (i === 0 || (r.modal ?? 0) >= MODAL_BUCKETS[i - 1].max)).length })),
    ...(rows.length > withModal.length ? [{ label: "Tidak tercatat", value: rows.length - withModal.length }] : []),
  ];
  const ratioBuckets = [
    ...RATIO_BUCKETS.map((b) => ({ label: b.label, value: withModal.filter((r) => ratioGroup(r.ratio) === b.label).length })),
    ...(rows.length > withModal.length ? [{ label: "Tidak dapat dihitung", value: rows.length - withModal.length }] : []),
  ];

  const months: Bab7["months"] = [];
  for (let d = new Date(`${ds.period.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= ds.period.to.slice(0, 7) && months.length < 24; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = d.toISOString().slice(0, 7);
    const rs = withModal.filter((r) => r.month === key);
    months.push({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`, median: medianOf(rs.map((r) => r.ratio ?? 0)), count: rs.length });
  }
  const decisions = uniq(rows.map((r) => r.decision)).map((label) => ({ label, tone: rows.find((r) => r.decision === label)!.decisionTone, count: rows.filter((r) => r.decision === label).length }))
    .sort((a, b) => b.count - a.count);

  const table = rows.map((r) => [r.company, r.lhviu, r.month ? `${MONTHS[Number(r.month.slice(5, 7)) - 1]} ${r.month.slice(0, 4)}` : "—", r.currencies.join(", "), r.modal === null ? "—" : Math.round(r.modal), Math.round(r.plan), r.ratio === null ? "—" : ratioText(r.ratio), ratioGroup(r.ratio), r.decision]);

  // Narrative -------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const unconverted = sum(rows.map((r) => r.unconverted));
  const limits = [
    "Modal operasi adalah Jumlah Modal Kerja yang dinyatakan perusahaan pada Surat Pernyataan Kepemilikan Modal Kerja; nilainya tidak diaudit dalam laporan ini.",
    "Rencana nilai impor dihitung dari nilai setiap product line dalam Rupiah; nilai dalam mata uang asing dikonversi dengan kurs yang diisi Technical Analyst pada analisis Modal, dan product line tanpa kurs tidak termasuk dalam nilai.",
    "Rasio rencana impor terhadap modal operasi merupakan indikator perbandingan dan tidak menggambarkan kesehatan finansial perusahaan.",
    "Tren rasio dihitung per bulan Tanggal Terbit LHVIU yang dicatat Project Manager; permohonan tanpa tanggal terbit tidak masuk tren.",
  ];
  const base = { rows, totalPlan, totalModal, withModal, modalBuckets, ratioBuckets, months, decisions, table };
  if (!rows.length) {
    return { ...base, highlights: [], sub71: [`Selama periode pelaporan ${period} belum terdapat rencana impor.`], sub72: [], sub73: [], sub74: [], sub75: [], sub76: [], limits };
  }

  const top3 = sum(rows.slice(0, 3).map((r) => r.plan));
  const aggRatio = totalModal ? sum(withModal.map((r) => r.plan)) / totalModal : null;
  const over = withModal.filter((r) => (r.ratio ?? 0) > 1).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  const byModal = [...withModal].sort((a, b) => (b.modal ?? 0) - (a.modal ?? 0));
  const modeBucket = modalBuckets.filter((b) => b.label !== "Tidak tercatat").reduce((a, b) => (b.value > a.value ? b : a), { label: "", value: 0 });
  const median = medianOf(withModal.map((r) => r.ratio ?? 0));
  const trend = months.filter((m) => m.median !== null);
  const peak = trend.reduce<(typeof trend)[number] | null>((a, m) => (!a || (m.median ?? 0) > (a.median ?? 0) ? m : a), null);
  const tidakSesuai = rows.filter((r) => r.decisionTone === "bad");

  const sub71 = [
    "Bab ini membandingkan rencana nilai impor setiap Pemohon VIU dengan modal operasi yang dinyatakan perusahaan, melalui alur Pemohon VIU → Modal Operasi → Rencana Nilai Impor → Rasio Rencana Impor terhadap Modal Operasi. Modal operasi adalah Jumlah Modal Kerja pada Surat Pernyataan Kepemilikan Modal Kerja, dan rasio dihitung sebagai rencana nilai impor dalam Rupiah dibagi modal operasi, dikalikan 100%.",
    `Selama periode pelaporan ${period}, rencana nilai impor ${withWords(rows.length)} permohonan VIU mencapai ${rp(totalPlan)}. Modal operasi tercatat pada ${withModal.length} permohonan dengan total ${rp(totalModal)}${aggRatio !== null ? `, sehingga rasio agregat rencana impor terhadap modal operasi adalah ${ratioText(aggRatio)}` : ""}${unconverted ? `; ${nf(unconverted)} product line dalam mata uang asing belum memiliki kurs dan tidak termasuk dalam nilai` : ""} (Gambar 7.1).`,
  ];
  const sub72 = [
    withModal.length
      ? `Pemohon dikelompokkan menurut rentang modal operasi, yaitu kurang dari Rp10 miliar, Rp10–50 miliar, Rp50–100 miliar, Rp100–500 miliar, dan lebih dari Rp500 miliar. Kelompok terbanyak adalah ${modeBucket.label} (${modeBucket.value} permohonan)${rows.length > withModal.length ? `; modal operasi ${rows.length - withModal.length} permohonan belum tercatat` : ""} (Gambar 7.2). Modal operasi terbesar dinyatakan oleh ${byModal[0].company} sebesar ${rp(byModal[0].modal ?? 0)}${byModal[1] ? `, diikuti ${byModal.slice(1, 3).map((r) => `${r.company} (${rp(r.modal ?? 0)})`).join(" dan ")}` : ""} (Gambar 7.3).`
      : "Modal operasi belum tercatat pada permohonan periode ini, sehingga distribusi modal operasi belum dapat disajikan.",
  ];
  const sub73 = [
    `Rencana nilai impor terbesar diajukan oleh ${rows[0].company} sebesar ${rp(rows[0].plan)} (${pct1(rows[0].plan, totalPlan)} dari total)${rows[1] ? `, diikuti ${rows.slice(1, 3).map((r) => `${r.company} sebesar ${rp(r.plan)}`).join(" dan ")}` : ""}. Tiga permohonan teratas mencakup ${pct1(top3, totalPlan)} dari total rencana nilai impor (Gambar 7.4).`,
  ];
  const sub74 = [
    withModal.length
      ? `Gambar 7.5 menempatkan setiap permohonan sebagai satu titik dengan modal operasi pada sumbu horizontal dan rencana nilai impor pada sumbu vertikal (skala logaritmik). Garis diagonal menandai rasio 100%; permohonan di atas garis memiliki rencana nilai impor yang melebihi modal operasinya. ${over.length ? `${withWords(over.length)} permohonan berada di atas garis tersebut, yaitu ${over.length > 4 ? `${over.slice(0, 4).map((r) => `${r.company} (${ratioText(r.ratio ?? 0)})`).join(", ")}, dan ${over.length - 4} permohonan lainnya` : andList(over.map((r) => `${r.company} (${ratioText(r.ratio ?? 0)})`))}.` : "Tidak ada permohonan yang berada di atas garis tersebut."}`
      : "",
  ].filter(Boolean);
  const sub75 = [
    withModal.length
      ? `Rasio rencana impor terhadap modal operasi dikelompokkan menjadi ≤25%, >25–50%, >50–100%, dan >100%: ${ratioBuckets.filter((b) => b.value > 0).map((b) => `${b.value} permohonan ${b.label === "Tidak dapat dihitung" ? "tidak dapat dihitung karena modal operasi belum tercatat" : `dengan rasio ${b.label}`}`).join(", ")}${median !== null ? `. Median rasio adalah ${ratioText(median)}` : ""} (Gambar 7.6).`
      : "",
    trend.length
      ? `Gambar 7.7 menyajikan median rasio per bulan terbit LHVIU; median dipakai agar satu permohonan dengan rasio sangat besar tidak mendominasi. Median tertinggi terjadi pada ${peak?.label} (${ratioText(peak?.median ?? 0)}, ${peak?.count} permohonan). Tren ini menggambarkan rasio rencana impor yang tercakup dalam VIU per periode, bukan tren kesehatan finansial perusahaan.`
      : "Tanggal terbit LHVIU belum dicatat, sehingga tren rasio menurut periode pelaksanaan VIU belum dapat disajikan.",
  ].filter(Boolean);
  const sub76 = [
    `Technical Analyst menilai kecukupan modal pada analisis Modal: ${decisions.map((d) => `${d.count} permohonan ${d.label.toLowerCase()}`).join(", ")}${tidakSesuai.length ? `. Permohonan yang dinyatakan tidak sesuai adalah ${andList(tidakSesuai.map((r) => r.company))}` : ""}. Rincian modal operasi, rencana nilai impor, dan rasio setiap permohonan disajikan pada Tabel 7.1.`,
  ];

  const highlights = [
    `Rencana nilai impor ${withWords(rows.length)} permohonan VIU mencapai ${rp(totalPlan)}; tiga permohonan teratas mencakup ${pct1(top3, totalPlan)} dari total.`,
    withModal.length ? `Modal operasi tercatat pada ${withModal.length} dari ${rows.length} permohonan dengan total ${rp(totalModal)}${aggRatio !== null ? `; rasio agregat rencana impor terhadap modal operasi ${ratioText(aggRatio)}` : ""}.` : "Modal operasi belum tercatat pada permohonan periode ini.",
    withModal.length ? `${over.length} permohonan memiliki rencana nilai impor melebihi modal operasinya (rasio > 100%)${median !== null ? `; median rasio ${ratioText(median)}` : ""}.` : "",
    tidakSesuai.length ? `Analisis Modal Technical Analyst menyatakan ${tidakSesuai.length} permohonan tidak sesuai.` : "",
    unconverted ? `${nf(unconverted)} product line dalam mata uang asing belum memiliki kurs sehingga tidak termasuk dalam nilai.` : "",
  ].filter(Boolean);

  return { ...base, highlights, sub71, sub72, sub73, sub74, sub75, sub76, limits };
}
