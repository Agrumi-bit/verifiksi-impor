import { z } from "zod";

export const SESUAI_VALUES = ["sesuai", "tidak"] as const;
export type SesuaiValue = (typeof SESUAI_VALUES)[number];

const answerSchema = z.object({
  value: z.enum(SESUAI_VALUES).nullable().default(null),
  reason: z.string().trim().optional(),
});
export type AnswerValues = z.infer<typeof answerSchema>;

const docCheckSchema = z.object({
  key: z.string(),
  name: z.string(),
  // "Uraian yang Diperiksa" for this section is a single question: does the location address on
  // file match what the surveyor actually finds on-site? `addressText` is that on-site answer —
  // a real input field, not a display value.
  addressText: z.string().trim().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  // Baked in once at row-creation time (buildDefaultSection1Docs), same as `name` — the source
  // document a surveyor is looking at while filling this row, not something they edit themselves.
  documentPath: z.string().trim().nullable().optional(),
});
export type DocCheckValues = z.infer<typeof docCheckSchema>;

const documentationItemSchema = z.object({
  filePath: z.string().trim().optional(),
  caption: z.string().trim().optional(),
});
export type DocumentationItemValues = z.infer<typeof documentationItemSchema>;

// "Dokumentasi Lainnya" is the one documentation type that isn't a single fixed slot — a surveyor
// can have any number of miscellaneous photos, so it's a real array instead of one more key in the
// single-slot `documentation` record below.
const documentationOtherItemSchema = z.object({
  id: z.string(),
  filePath: z.string().trim().optional(),
  caption: z.string().trim().optional(),
});
export type DocumentationOtherItemValues = z.infer<typeof documentationOtherItemSchema>;

export const FINDINGS_IMPACTS = [
  "Memerlukan klarifikasi",
  "Tidak mempengaruhi kelayakan",
  "Menggagalkan verifikasi",
] as const;

export const CONCLUSION_STATUSES = ["Sesuai", "Perlu Klarifikasi", "Tidak Sesuai"] as const;
export const CONCLUSION_RECOMMENDATIONS = [
  "Disetujui",
  "Memerlukan perbaikan / klarifikasi",
  "Ditolak",
] as const;

export const officeVerificationSchema = z.object({
  assignedDate: z.string().trim().optional(),
  actualVisitDate: z.string().trim().optional(),
  dateNotes: z.string().trim().optional(),

  section1Docs: z.array(docCheckSchema).default([]),

  section2Answers: z.record(z.string(), answerSchema).default({}),
  section2Notes: z.string().trim().optional(),

  ownershipAnswer: answerSchema.default({ value: null }),
  sewaAnswers: z.record(z.string(), answerSchema).default({}),
  section3Notes: z.string().trim().optional(),

  section4Answers: z.record(z.string(), answerSchema).default({}),
  section4Notes: z.string().trim().optional(),

  section5Answers: z.record(z.string(), answerSchema).default({}),
  section5Notes: z.string().trim().optional(),

  documentation: z.record(z.string(), documentationItemSchema).default({}),
  documentationOther: z.array(documentationOtherItemSchema).default([]),

  findingsExplanation: z.string().trim().optional(),
  findingsImpact: z.enum(FINDINGS_IMPACTS).nullable().default(null),
  findingsRecommendation: z.string().trim().optional(),

  conclusionStatus: z.enum(CONCLUSION_STATUSES).nullable().default(null),
  conclusionRecommendation: z.enum(CONCLUSION_RECOMMENDATIONS).nullable().default(null),
  conclusionSummary: z.string().trim().optional(),
});
export type OfficeVerificationValues = z.infer<typeof officeVerificationSchema>;

export function emptyOfficeVerification(): OfficeVerificationValues {
  return officeVerificationSchema.parse({});
}

type QuestionDef = { key: string; no: number; title: string; question: string };

export const SECTION2_QUESTIONS: QuestionDef[] = [
  { key: "q1", no: 1, title: "Kesesuaian alamat kantor", question: "Apakah alamat kantor yang dikunjungi sesuai dengan alamat yang tercantum dalam permohonan?" },
  { key: "q2", no: 2, title: "Kemudahan menemukan lokasi", question: "Apakah lokasi kantor dapat ditemukan dengan jelas berdasarkan alamat yang tercantum?" },
  { key: "q3", no: 3, title: "Identitas perusahaan pada lokasi", question: "Apakah terdapat papan nama atau identitas perusahaan di lokasi kantor?" },
  { key: "q4", no: 4, title: "Kesesuaian nama perusahaan", question: "Apakah nama perusahaan pada papan nama sesuai dengan nama perusahaan pada dokumen permohonan?" },
];

export const SECTION4_QUESTIONS: QuestionDef[] = [
  { key: "s4q1", no: 1, title: "Ruang kerja untuk administrasi", question: "Apakah kantor memiliki ruang kerja yang digunakan untuk kegiatan administrasi perusahaan?" },
  { key: "s4q2", no: 2, title: "Fasilitas kerja yang memadai", question: "Apakah kantor memiliki fasilitas kerja yang memadai (meja kerja, kursi, komputer, atau peralatan administrasi lainnya)?" },
  { key: "s4q3", no: 3, title: "Ruang penyimpanan dokumen", question: "Apakah kantor memiliki area atau ruang yang digunakan untuk penyimpanan dokumen perusahaan?" },
  { key: "s4q4", no: 4, title: "Fasilitas pendukung administrasi", question: "Apakah kantor memiliki fasilitas pendukung kegiatan administrasi seperti jaringan internet atau sarana komunikasi?" },
  { key: "s4q5", no: 5, title: "Ruang untuk tamu dan pertemuan", question: "Apakah kantor memiliki ruang yang digunakan untuk menerima tamu atau kegiatan pertemuan kerja?" },
  { key: "s4q6", no: 6, title: "Fasilitas dasar", question: "Apakah kantor memiliki fasilitas dasar yang mendukung aktivitas kerja sehari-hari (misalnya listrik dan air)?" },
  { key: "s4q7", no: 7, title: "Kantor digunakan secara aktif", question: "Apakah fasilitas kantor secara umum menunjukkan bahwa kantor tersebut digunakan secara aktif untuk kegiatan operasional perusahaan?" },
];

export const SECTION5_QUESTIONS: QuestionDef[] = [
  { key: "s5q1", no: 1, title: "Aktivitas administrasi berlangsung", question: "Apakah terdapat aktivitas administrasi perusahaan yang berlangsung di kantor pada saat verifikasi dilakukan?" },
  { key: "s5q2", no: 2, title: "Pegawai bekerja di kantor", question: "Apakah terdapat pegawai perusahaan yang bekerja di kantor pada saat verifikasi dilakukan?" },
  { key: "s5q3", no: 3, title: "Kegiatan administrasi dari kantor", question: "Apakah kegiatan administrasi perusahaan (dokumen, komunikasi bisnis, dll) dilakukan dari kantor tersebut?" },
  { key: "s5q4", no: 4, title: "Pusat koordinasi operasional", question: "Apakah kantor digunakan sebagai pusat koordinasi kegiatan operasional perusahaan?" },
  { key: "s5q5", no: 5, title: "Staf bertanggung jawab", question: "Apakah perusahaan memiliki staf atau personel yang bertanggung jawab atas kegiatan administrasi usaha di kantor tersebut?" },
  { key: "s5q6", no: 6, title: "Operasi rutin pada hari kerja", question: "Apakah kantor beroperasi secara rutin pada hari kerja?" },
];

export const SEWA_QUESTIONS: QuestionDef[] = [
  { key: "r1", no: 1, title: "Pertanyaan 1", question: "Apakah dokumen perjanjian sewa tersedia dan sesuai dengan penggunaan kantor perusahaan?" },
  { key: "r2", no: 2, title: "Pertanyaan 2", question: "Apakah masa sewa bangunan masih berlaku pada saat verifikasi dilakukan?" },
  { key: "r3", no: 3, title: "Pertanyaan 3", question: "Apakah masa sewa memenuhi persyaratan minimum yang ditetapkan?" },
];

export const OWNERSHIP_QUESTION: QuestionDef = {
  key: "ownership",
  no: 1,
  title: "Pertanyaan Verifikasi",
  question: "Apakah dokumen kepemilikan bangunan sesuai dengan penggunaan kantor perusahaan?",
};

export const DOC_TYPE_DEFS: { key: string; label: string }[] = [
  { key: "frontBuilding", label: "Tampak Depan Bangunan Kantor" },
  { key: "signage", label: "Papan Nama Perusahaan" },
  { key: "workspace", label: "Ruang Kerja Kantor" },
  { key: "operationalActivity", label: "Aktivitas Operasional Kantor" },
  { key: "surroundings", label: "Lingkungan Sekitar Kantor" },
  { key: "map", label: "Map Kantor" },
  { key: "other", label: "Dokumentasi Lainnya" },
];

export const MIN_DOCUMENTATION_REQUIRED = 3;

export const SECTION_TITLES = [
  "Tanggal Verifikasi",
  "Kesesuaian Lokasi Berdasarkan Dokumen Resmi",
  "Identifikasi Lokasi Kantor",
  "Status Kepemilikan Kantor",
  "Keberadaan dan Kondisi Fisik Kantor",
  "Aktivitas Operasional Kantor",
  "Dokumentasi Lapangan",
  "Review Temuan Ketidaksesuaian",
  "Kesimpulan Verifikasi Kantor",
] as const;

export type SectionKind = "unfilled" | "ok" | "issue";

function kindForKeys(keys: string[], answers: Record<string, AnswerValues>): SectionKind {
  const vals = keys.map((k) => answers[k]?.value).filter(Boolean);
  if (vals.length === 0) return "unfilled";
  if (vals.includes("tidak")) return "issue";
  if (vals.length === keys.length) return "ok";
  return "unfilled";
}

export type Finding = { no: number; section: string; question: string; note: string };

export function computeFindings(values: OfficeVerificationValues): Finding[] {
  const all: { key: string; section: string; question: string; answers: Record<string, AnswerValues> }[] = [
    ...SECTION2_QUESTIONS.map((q) => ({
      key: q.key,
      question: q.question,
      section: "Section 2: Identifikasi Lokasi Kantor",
      answers: values.section2Answers,
    })),
    ...SECTION4_QUESTIONS.map((q) => ({
      key: q.key,
      question: q.question,
      section: "Section 4: Keberadaan dan Kondisi Fisik Kantor",
      answers: values.section4Answers,
    })),
    ...SECTION5_QUESTIONS.map((q) => ({
      key: q.key,
      question: q.question,
      section: "Section 5: Aktivitas Operasional Kantor",
      answers: values.section5Answers,
    })),
  ];
  return all
    .filter((q) => q.answers[q.key]?.value === "tidak")
    .map((q, i) => ({ no: i + 1, section: q.section, question: q.question, note: q.answers[q.key]?.reason ?? "" }));
}

export function computeSectionKinds(
  values: OfficeVerificationValues,
  buildingStatus: "MILIK_SENDIRI" | "SEWA" | null,
): SectionKind[] {
  const s0: SectionKind = values.assignedDate && values.actualVisitDate ? "ok" : "unfilled";

  const docStatuses = values.section1Docs.map((d) => d.status);
  const s1: SectionKind =
    docStatuses.length === 0
      ? "unfilled"
      : docStatuses.includes("rejected")
        ? "issue"
        : docStatuses.every((s) => s === "approved")
          ? "ok"
          : "unfilled";

  const s2 = kindForKeys(SECTION2_QUESTIONS.map((q) => q.key), values.section2Answers);

  const s3: SectionKind =
    buildingStatus === "MILIK_SENDIRI"
      ? values.ownershipAnswer.value === "tidak"
        ? "issue"
        : values.ownershipAnswer.value === "sesuai"
          ? "ok"
          : "unfilled"
      : kindForKeys(SEWA_QUESTIONS.map((q) => q.key), values.sewaAnswers);

  const s4 = kindForKeys(SECTION4_QUESTIONS.map((q) => q.key), values.section4Answers);
  const s5 = kindForKeys(SECTION5_QUESTIONS.map((q) => q.key), values.section5Answers);

  const docCount =
    Object.values(values.documentation).filter((d) => d.filePath).length +
    values.documentationOther.filter((d) => d.filePath).length;
  const s6: SectionKind = docCount >= MIN_DOCUMENTATION_REQUIRED ? "ok" : "unfilled";

  const findingsCount = computeFindings(values).length;
  const s7: SectionKind = findingsCount > 0 ? "issue" : "ok";

  const s8: SectionKind =
    values.conclusionStatus === "Sesuai" ? "ok" : values.conclusionStatus === "Tidak Sesuai" ? "issue" : "unfilled";

  return [s0, s1, s2, s3, s4, s5, s6, s7, s8];
}
