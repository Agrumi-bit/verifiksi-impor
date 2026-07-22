import { z } from "zod";

import {
  FINDINGS_IMPACTS,
  CONCLUSION_STATUSES,
  CONCLUSION_RECOMMENDATIONS,
  type AnswerValues,
  type DocCheckValues,
  type DocumentationItemValues,
} from "../office-verification/schema";

export { FINDINGS_IMPACTS, CONCLUSION_STATUSES, CONCLUSION_RECOMMENDATIONS };
export type { AnswerValues, DocCheckValues, DocumentationItemValues };

export type FieldKind = "GUDANG" | "PABRIK";

export const LOCATION_LABEL: Record<FieldKind, string> = { GUDANG: "Gudang", PABRIK: "Pabrik" };

const answerSchema = z.object({
  value: z.enum(["sesuai", "tidak"]).nullable().default(null),
  reason: z.string().trim().optional(),
});

const docCheckSchema = z.object({
  key: z.string(),
  name: z.string(),
  addressText: z.string().trim().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

const documentationItemSchema = z.object({
  filePath: z.string().trim().optional(),
  caption: z.string().trim().optional(),
});

const capacitySchema = z.object({
  luasTotal: z.number().nullable().default(null),
  jumlahLine: z.number().nullable().default(null),
  luasDigunakan: z.number().nullable().default(null),
  tinggiEfektif: z.number().nullable().default(null),
  utilisasiAman: z.number().nullable().default(null),
  sistemPenyimpanan: z.record(z.string(), z.boolean()).default({}),
});
export type CapacityValues = z.infer<typeof capacitySchema>;

export const SISTEM_PENYIMPANAN_OPTIONS = ["Pallet", "Rak Gudang", "Floor Stacking", "Kombinasi"] as const;

export const fieldVerificationSchema = z.object({
  assignedDate: z.string().trim().optional(),
  actualVisitDate: z.string().trim().optional(),
  dateNotes: z.string().trim().optional(),

  section1Docs: z.array(docCheckSchema).default([]),
  section1Answers: z.record(z.string(), answerSchema).default({}),

  ownershipAnswer: answerSchema.default({ value: null }),
  sewaAnswers: z.record(z.string(), answerSchema).default({}),
  section2Notes: z.string().trim().optional(),

  legalityAnswers: z.record(z.string(), answerSchema).default({}),
  legalityNotes: z.string().trim().optional(),

  section4Answers: z.record(z.string(), answerSchema).default({}),
  section4Notes: z.string().trim().optional(),

  capacity: capacitySchema.default(capacitySchema.parse({})),
  capacityAnswers: z.record(z.string(), answerSchema).default({}),
  capacityLayoutPath: z.string().trim().optional(),

  section6Answers: z.record(z.string(), answerSchema).default({}),
  section6Notes: z.string().trim().optional(),

  documentation: z.record(z.string(), documentationItemSchema).default({}),

  findingsExplanation: z.string().trim().optional(),
  findingsImpact: z.enum(FINDINGS_IMPACTS).nullable().default(null),
  findingsRecommendation: z.string().trim().optional(),

  conclusionStatus: z.enum(CONCLUSION_STATUSES).nullable().default(null),
  conclusionRecommendation: z.enum(CONCLUSION_RECOMMENDATIONS).nullable().default(null),
  conclusionSummary: z.string().trim().optional(),
});
export type FieldVerificationValues = z.infer<typeof fieldVerificationSchema>;

export function emptyFieldVerification(): FieldVerificationValues {
  return fieldVerificationSchema.parse({});
}

type QuestionDef = { key: string; no: number; title: string; question: string };

export const SECTION1_QUESTIONS: Record<FieldKind, QuestionDef[]> = {
  GUDANG: [
    { key: "q1", no: 1, title: "Kesesuaian alamat gudang", question: "Apakah alamat gudang yang dikunjungi sesuai dengan alamat yang tercantum dalam dokumen permohonan?" },
    { key: "q2", no: 2, title: "Kemudahan menemukan lokasi", question: "Apakah lokasi gudang dapat ditemukan dengan jelas berdasarkan alamat yang tercantum?" },
  ],
  PABRIK: [
    { key: "q1", no: 1, title: "Kesesuaian alamat pabrik", question: "Apakah alamat pabrik yang dikunjungi sesuai dengan alamat yang tercantum dalam dokumen permohonan?" },
    { key: "q2", no: 2, title: "Kemudahan menemukan lokasi", question: "Apakah lokasi pabrik dapat ditemukan dengan jelas berdasarkan alamat yang tercantum?" },
  ],
};

export function ownershipQuestion(kind: FieldKind): QuestionDef {
  const label = LOCATION_LABEL[kind].toLowerCase();
  return {
    key: "ownership",
    no: 1,
    title: "Pertanyaan Verifikasi",
    question: `Apakah dokumen kepemilikan bangunan sesuai dengan penggunaan ${label} perusahaan?`,
  };
}

export function sewaQuestions(kind: FieldKind): QuestionDef[] {
  const label = LOCATION_LABEL[kind].toLowerCase();
  return [
    { key: "r1", no: 1, title: "Pertanyaan 1", question: `Apakah dokumen perjanjian sewa tersedia dan sesuai dengan penggunaan ${label} perusahaan?` },
    { key: "r2", no: 2, title: "Pertanyaan 2", question: "Apakah masa sewa bangunan masih berlaku pada saat verifikasi dilakukan?" },
    { key: "r3", no: 3, title: "Pertanyaan 3", question: "Apakah masa sewa memenuhi persyaratan minimum yang ditetapkan?" },
  ];
}

export const LEGALITY_QUESTIONS: Record<FieldKind, QuestionDef[]> = {
  GUDANG: [
    { key: "l1", no: 1, title: "Kesesuaian nomor TDG", question: "Apakah nomor Tanda Daftar Gudang (TDG) pada dokumen permohonan sesuai dengan dokumen TDG yang ditunjukkan di lokasi?" },
    { key: "l2", no: 2, title: "Masa berlaku TDG", question: "Apakah dokumen TDG masih berlaku pada saat verifikasi dilakukan?" },
    { key: "l3", no: 3, title: "Kesesuaian data penerbitan", question: "Apakah lembaga penerbit dan tanggal penerbitan TDG sesuai dengan yang tercantum dalam sistem?" },
  ],
  PABRIK: [
    { key: "l1", no: 1, title: "Kesesuaian kode KBLI", question: "Apakah kode KBLI yang diajukan dalam dokumen permohonan sesuai dengan aktivitas industri yang dilaksanakan di lokasi pabrik?" },
    { key: "l2", no: 2, title: "Kesesuaian kegiatan produksi", question: "Apakah kegiatan produksi yang diamati di lapangan sesuai dengan uraian KBLI yang terdaftar?" },
    { key: "l3", no: 3, title: "Legalitas usaha", question: "Apakah dokumen legalitas usaha (KBLI/IUI) yang ditunjukkan di lokasi masih berlaku?" },
  ],
};

export const SECTION4_QUESTIONS: Record<FieldKind, QuestionDef[]> = {
  GUDANG: [
    { key: "s4q1", no: 1, title: "Ruang/area penyimpanan barang", question: "Apakah gudang memiliki area penyimpanan yang memadai untuk kegiatan penyimpanan barang perusahaan?" },
    { key: "s4q2", no: 2, title: "Fasilitas penunjang penyimpanan", question: "Apakah gudang memiliki fasilitas penunjang yang memadai (rak, pallet, forklift, atau peralatan penyimpanan lainnya)?" },
    { key: "s4q3", no: 3, title: "Sistem keamanan gudang", question: "Apakah gudang memiliki sistem keamanan yang memadai (pagar, CCTV, atau petugas keamanan)?" },
    { key: "s4q4", no: 4, title: "Akses bongkar muat", question: "Apakah gudang memiliki akses yang memadai untuk kendaraan bongkar muat barang?" },
    { key: "s4q5", no: 5, title: "Ruang administrasi gudang", question: "Apakah gudang memiliki ruang atau area yang digunakan untuk kegiatan administrasi pergudangan?" },
    { key: "s4q6", no: 6, title: "Fasilitas dasar", question: "Apakah gudang memiliki fasilitas dasar yang mendukung aktivitas kerja sehari-hari (misalnya listrik dan penerangan)?" },
    { key: "s4q7", no: 7, title: "Gudang digunakan secara aktif", question: "Apakah fasilitas gudang secara umum menunjukkan bahwa gudang tersebut digunakan secara aktif untuk kegiatan penyimpanan barang?" },
  ],
  PABRIK: [
    { key: "s4q1", no: 1, title: "Ruang/area produksi", question: "Apakah pabrik memiliki area produksi yang memadai untuk kegiatan pengolahan barang perusahaan?" },
    { key: "s4q2", no: 2, title: "Fasilitas mesin produksi", question: "Apakah pabrik memiliki mesin dan peralatan produksi yang sesuai dengan kegiatan usaha yang diajukan?" },
    { key: "s4q3", no: 3, title: "Keamanan dan keselamatan kerja", question: "Apakah pabrik memiliki sistem keamanan dan keselamatan kerja yang memadai?" },
    { key: "s4q4", no: 4, title: "Akses bongkar muat", question: "Apakah pabrik memiliki akses yang memadai untuk kendaraan pengangkut bahan baku dan hasil produksi?" },
    { key: "s4q5", no: 5, title: "Ruang administrasi produksi", question: "Apakah pabrik memiliki ruang atau area yang digunakan untuk kegiatan administrasi produksi?" },
    { key: "s4q6", no: 6, title: "Fasilitas dasar", question: "Apakah pabrik memiliki fasilitas dasar yang mendukung aktivitas produksi sehari-hari (misalnya listrik dan air)?" },
    { key: "s4q7", no: 7, title: "Pabrik digunakan secara aktif", question: "Apakah fasilitas pabrik secara umum menunjukkan bahwa pabrik tersebut digunakan secara aktif untuk kegiatan produksi?" },
  ],
};

export const CAPACITY_QUESTIONS: QuestionDef[] = [
  { key: "c1", no: 1, title: "Kesesuaian data teknis", question: "Apakah data teknis gudang (luas, kapasitas) yang disampaikan dalam dokumen sesuai dengan hasil pengukuran/observasi di lapangan?" },
  { key: "c2", no: 2, title: "Kesesuaian layout gudang", question: "Apakah layout/denah gudang yang diunggah sesuai dengan kondisi aktual di lapangan?" },
  { key: "c3", no: 3, title: "Kecukupan kapasitas efektif", question: "Apakah kapasitas efektif gudang memadai untuk mendukung rencana volume impor yang diajukan?" },
];

export const SECTION6_QUESTIONS: Record<FieldKind, QuestionDef[]> = {
  GUDANG: [
    { key: "s6q1", no: 1, title: "Aktivitas penyimpanan berlangsung", question: "Apakah terdapat aktivitas penyimpanan barang yang berlangsung di gudang pada saat verifikasi dilakukan?" },
    { key: "s6q2", no: 2, title: "Petugas bekerja di gudang", question: "Apakah terdapat petugas gudang yang bekerja pada saat verifikasi dilakukan?" },
    { key: "s6q3", no: 3, title: "Bongkar muat rutin", question: "Apakah kegiatan bongkar muat barang dilakukan secara rutin di gudang tersebut?" },
    { key: "s6q4", no: 4, title: "Pusat penyimpanan operasional", question: "Apakah gudang digunakan sebagai pusat penyimpanan untuk kegiatan operasional perusahaan?" },
    { key: "s6q5", no: 5, title: "Staf bertanggung jawab", question: "Apakah perusahaan memiliki staf atau personel yang bertanggung jawab atas kegiatan pergudangan?" },
    { key: "s6q6", no: 6, title: "Operasi rutin pada hari kerja", question: "Apakah gudang beroperasi secara rutin pada hari kerja?" },
    { key: "s6q7", no: 7, title: "Pencatatan keluar-masuk barang", question: "Apakah terdapat pencatatan keluar-masuk barang (inventory) yang dikelola di gudang?" },
    { key: "s6q8", no: 8, title: "Kesesuaian jenis barang", question: "Apakah barang yang tersimpan di gudang sesuai dengan jenis barang yang diajukan dalam permohonan?" },
    { key: "s6q9", no: 9, title: "Standar penyimpanan", question: "Apakah kondisi penyimpanan barang di gudang sesuai dengan standar penyimpanan yang berlaku?" },
    { key: "s6q10", no: 10, title: "Aktivitas berkelanjutan", question: "Apakah gudang menunjukkan tanda-tanda aktivitas operasional yang berkelanjutan (bukan gudang kosong/tidak terpakai)?" },
  ],
  PABRIK: [
    { key: "s6q1", no: 1, title: "Aktivitas produksi berlangsung", question: "Apakah terdapat aktivitas produksi yang berlangsung di pabrik pada saat verifikasi dilakukan?" },
    { key: "s6q2", no: 2, title: "Operator bekerja di area produksi", question: "Apakah terdapat operator/pekerja yang bertugas di area produksi pada saat verifikasi dilakukan?" },
    { key: "s6q3", no: 3, title: "Produksi rutin", question: "Apakah proses produksi dilakukan secara rutin di pabrik tersebut?" },
    { key: "s6q4", no: 4, title: "Pusat kegiatan produksi", question: "Apakah pabrik digunakan sebagai pusat kegiatan produksi perusahaan?" },
    { key: "s6q5", no: 5, title: "Staf bertanggung jawab", question: "Apakah perusahaan memiliki staf atau personel yang bertanggung jawab atas kegiatan produksi?" },
    { key: "s6q6", no: 6, title: "Operasi rutin pada hari kerja", question: "Apakah pabrik beroperasi secara rutin pada hari kerja?" },
    { key: "s6q7", no: 7, title: "Pencatatan hasil produksi", question: "Apakah terdapat pencatatan hasil produksi yang dikelola di pabrik?" },
    { key: "s6q8", no: 8, title: "Kesesuaian bahan baku dan hasil produksi", question: "Apakah bahan baku dan hasil produksi di pabrik sesuai dengan jenis barang yang diajukan dalam permohonan?" },
    { key: "s6q9", no: 9, title: "Standar produksi", question: "Apakah proses produksi di pabrik sesuai dengan standar produksi yang berlaku?" },
    { key: "s6q10", no: 10, title: "Aktivitas berkelanjutan", question: "Apakah pabrik menunjukkan tanda-tanda aktivitas operasional yang berkelanjutan (bukan pabrik kosong/tidak beroperasi)?" },
  ],
};

export function docTypeDefs(kind: FieldKind): { key: string; label: string }[] {
  const label = LOCATION_LABEL[kind];
  return [
    { key: "frontBuilding", label: `Tampak Depan Bangunan ${label}` },
    { key: "signage", label: "Papan Nama Perusahaan" },
    { key: "mainArea", label: label === "Gudang" ? "Area Penyimpanan Gudang" : "Area Produksi Pabrik" },
    { key: "operationalActivity", label: `Aktivitas Operasional ${label}` },
    { key: "surroundings", label: `Lingkungan Sekitar ${label}` },
    { key: "map", label: `Map ${label}` },
    { key: "other", label: "Dokumentasi Lainnya" },
  ];
}

export const MIN_DOCUMENTATION_REQUIRED = 3;

export function sectionTitles(kind: FieldKind): string[] {
  const label = LOCATION_LABEL[kind];
  const titles = [
    "Tanggal Verifikasi",
    `Kesesuaian Lokasi ${label} Berdasarkan Dokumen`,
    `Status Kepemilikan ${label}`,
    `Legalitas ${label}`,
    `Kondisi Fisik ${label}`,
  ];
  if (kind === "GUDANG") titles.push(`Kapasitas ${label}`);
  titles.push(`Aktivitas Operasional ${label}`, "Dokumentasi Lapangan", "Review Temuan Ketidaksesuaian", `Kesimpulan Verifikasi ${label}`);
  return titles;
}

export type Finding = { no: number; section: string; question: string; note: string };

export function computeFindings(kind: FieldKind, values: FieldVerificationValues): Finding[] {
  const label = LOCATION_LABEL[kind];
  const groups: { key: string; section: string; question: string; answers: Record<string, AnswerValues> }[] = [
    ...SECTION1_QUESTIONS[kind].map((q) => ({ key: q.key, question: q.question, section: `Section 1: Kesesuaian Lokasi ${label}`, answers: values.section1Answers })),
    ...LEGALITY_QUESTIONS[kind].map((q) => ({ key: q.key, question: q.question, section: `Section 3: Legalitas ${label}`, answers: values.legalityAnswers })),
    ...SECTION4_QUESTIONS[kind].map((q) => ({ key: q.key, question: q.question, section: `Section 4: Kondisi Fisik ${label}`, answers: values.section4Answers })),
    ...(kind === "GUDANG" ? CAPACITY_QUESTIONS.map((q) => ({ key: q.key, question: q.question, section: "Section 5: Kapasitas Gudang", answers: values.capacityAnswers })) : []),
    ...SECTION6_QUESTIONS[kind].map((q) => ({ key: q.key, question: q.question, section: `Section ${kind === "GUDANG" ? 6 : 5}: Aktivitas Operasional ${label}`, answers: values.section6Answers })),
  ];
  return groups
    .filter((g) => g.answers[g.key]?.value === "tidak")
    .map((g, i) => ({ no: i + 1, section: g.section, question: g.question, note: g.answers[g.key]?.reason ?? "" }));
}

export type SectionKind = "unfilled" | "ok" | "issue";

function kindForKeys(keys: string[], answers: Record<string, AnswerValues>): SectionKind {
  const vals = keys.map((k) => answers[k]?.value).filter(Boolean);
  if (vals.length === 0) return "unfilled";
  if (vals.includes("tidak")) return "issue";
  if (vals.length === keys.length) return "ok";
  return "unfilled";
}

export function computeSectionKinds(
  kind: FieldKind,
  values: FieldVerificationValues,
  buildingStatus: "MILIK_SENDIRI" | "SEWA" | null,
): SectionKind[] {
  const s0: SectionKind = values.assignedDate && values.actualVisitDate ? "ok" : "unfilled";

  const docStatuses = values.section1Docs.map((d) => d.status);
  const docsKind: SectionKind =
    docStatuses.length === 0 ? "unfilled" : docStatuses.includes("rejected") ? "issue" : docStatuses.every((s) => s === "approved") ? "ok" : "unfilled";
  const questionsKind = kindForKeys(SECTION1_QUESTIONS[kind].map((q) => q.key), values.section1Answers);
  const s1: SectionKind = docsKind === "issue" || questionsKind === "issue" ? "issue" : docsKind === "ok" && questionsKind === "ok" ? "ok" : "unfilled";

  const s2: SectionKind =
    buildingStatus === "MILIK_SENDIRI"
      ? values.ownershipAnswer.value === "tidak"
        ? "issue"
        : values.ownershipAnswer.value === "sesuai"
          ? "ok"
          : "unfilled"
      : kindForKeys(sewaQuestions(kind).map((q) => q.key), values.sewaAnswers);

  const s3 = kindForKeys(LEGALITY_QUESTIONS[kind].map((q) => q.key), values.legalityAnswers);
  const s4 = kindForKeys(SECTION4_QUESTIONS[kind].map((q) => q.key), values.section4Answers);

  const result: SectionKind[] = [s0, s1, s2, s3, s4];

  if (kind === "GUDANG") {
    result.push(kindForKeys(CAPACITY_QUESTIONS.map((q) => q.key), values.capacityAnswers));
  }

  result.push(kindForKeys(SECTION6_QUESTIONS[kind].map((q) => q.key), values.section6Answers));

  const docCount = Object.values(values.documentation).filter((d) => d.filePath).length;
  result.push(docCount >= MIN_DOCUMENTATION_REQUIRED ? "ok" : "unfilled");

  const findingsCount = computeFindings(kind, values).length;
  result.push(findingsCount > 0 ? "issue" : "ok");

  result.push(
    values.conclusionStatus === "Sesuai" ? "ok" : values.conclusionStatus === "Tidak Sesuai" ? "issue" : "unfilled",
  );

  return result;
}

export function computeCapacityEfektif(capacity: CapacityValues): number {
  const luas = capacity.luasDigunakan ?? 0;
  const tinggi = capacity.tinggiEfektif ?? 0;
  const utilisasi = (capacity.utilisasiAman ?? 0) / 100;
  return Math.round(luas * tinggi * utilisasi);
}
