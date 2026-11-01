import "server-only";

import { db } from "@/lib/db";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { parseNumeric } from "@/modules/technical-analyst-workspace/components/detail/analysis-types";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import {
  buildCapacityRows,
  buildMachineChecklist,
  buildProductChecklist,
  buildProductionQtyChecklist,
  buildRawMaterialChecklist,
  buildRawMaterialConversionRows,
  buildRawMaterialUsageChecklist,
  buildSalesChecklist,
  productionQtyVerificationsSchema,
  productVerificationsSchema,
} from "@/modules/verifikator-workspace/schema";
import { buildDocumentRows } from "../document-matrix";
import { plainText, statementLabel, VKI_MODULE_KEYS, type VkiStageInput } from "../vki-stages";
import { loadCaseDocuments } from "./document-statuses";

/** The VKI checklist categories Compliance shows (Legalitas/Perpajakan/Lokasi have their own stages). */
export const VKI_STAGE_CATEGORIES = ["Dokumen Lokasi", "Surat Pernyataan", "Dokumen Pendukung VKI", "Tenaga Kerja"];

/* The application payload is JSON — every field is read defensively (older payloads miss some). */
type VkiPayload = {
  capacity?: { jenisProduk?: string; kbliCode?: string; satuan?: string; berdasarkanIzin?: string; kapasitasTerpasang?: string }[];
  machines?: {
    nama?: string;
    merk?: string;
    model?: string;
    jumlah?: string;
    jumlahSatuan?: string;
    kondisi?: string;
    proses?: string;
    kapasitas?: string;
    kapasitasSatuan?: string;
    power?: string;
  }[];
  electricityMonths?: { bulan?: string; kwh?: string; nominal?: string; documentPath?: string }[];
  tenagaKerjaEntries?: { kategori?: string; jumlah?: string }[];
  vkiSupportDocs?: { key?: string; nomorSurat?: string; tanggal?: string; penandatangan?: string; documentPath?: string }[];
};

const text = (value: string | undefined | null): string | null => (value && value.trim() ? value.trim() : null);

/**
 * Tahap 5–13 data for one VKI case: products and raw materials, production capability (capacity, machines, electricity), sales,
 * workforce, the applicant's statements, the Verifikator's document status and the Technical
 * Analyst's module decisions. Read only.
 */
export async function loadVkiStage(applicationId: string): Promise<VkiStageInput | null> {
  const documents = await loadCaseDocuments(applicationId, VKI_STAGE_CATEGORIES);
  if (!documents) return null;
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      submissionDate: true,
      createdAt: true,
      assignments: {
        where: { scheduleType: { in: ["technical", "dokumen"] } },
        select: { scheduleType: true, updatedAt: true, technicalAnalysisData: true, productionQtyVerifications: true, productVerifications: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!application) return null;

  const payload = documents.payload as unknown as VkiPayload;
  const category = new Map(documents.checklist.map((item) => [item.key, item.category]));
  const latestOf = (type: string) => application.assignments.find((a) => a.scheduleType === type);
  const analysis = technicalAnalysisDataSchema.safeParse(latestOf("technical")?.technicalAnalysisData ?? {});
  const production = productionQtyVerificationsSchema.safeParse(latestOf("dokumen")?.productionQtyVerifications ?? {});
  const productDecisions = productVerificationsSchema.safeParse(latestOf("dokumen")?.productVerifications ?? {});
  const tarifId = analysis.success ? analysis.data.listrik?.inputs?.tarifId : undefined;
  const tariffRow = tarifId
    ? await db.electricityTariffMasterData.findUnique({ where: { id: tarifId }, select: { kelompok: true, golongan: true, batasDaya: true, tarifPerKwh: true } })
    : null;
  const tariff = tariffRow ? { label: `${tariffRow.kelompok} — ${tariffRow.golongan} (${tariffRow.batasDaya})`, perKwh: parseNumeric(tariffRow.tarifPerKwh) } : null;

  return {
    submittedAt: effectiveSubmissionDate(application).value,
    documents: buildDocumentRows(documents.checklist, documents.statuses, { categories: VKI_STAGE_CATEGORIES, schemeId: "VKI" }).map((row) => ({
      ...row,
      category: category.get(row.key) ?? "",
    })),
    products: buildProductChecklist(documents.payload).filter((product) => product.source === "generic"),
    productStatuses: productDecisions.success
      ? Object.fromEntries(Object.entries(productDecisions.data).map(([id, entry]) => [id, { status: entry.status, note: entry.note || null }]))
      : {},
    rawMaterials: buildRawMaterialChecklist(documents.payload),
    conversions: buildRawMaterialConversionRows(documents.payload),
    capacity: buildCapacityRows(documents.payload),
    productionQty: buildProductionQtyChecklist(documents.payload),
    rawMaterialUsage: buildRawMaterialUsageChecklist(documents.payload),
    sales: buildSalesChecklist(documents.payload),
    productionQtyStatuses: production.success
      ? Object.fromEntries(
          Object.entries(production.data).map(([key, entry]) => [key, { status: entry.status, keterangan: entry.keterangan || null, kesimpulan: plainText(entry.kesimpulan) }]),
        )
      : {},
    machines: buildMachineChecklist(documents.payload),
    kapasitasInputs: analysis.success ? analysis.data.kapasitas?.inputs : undefined,
    electricity: (payload.electricityMonths ?? []).map((month) => ({
      month: text(month.bulan),
      kwh: text(month.kwh),
      nominal: text(month.nominal),
      document: month.documentPath ? { label: `Tagihan listrik ${month.bulan ?? ""}`.trim(), path: month.documentPath } : null,
    })),
    workforce: (payload.tenagaKerjaEntries ?? [])
      .filter((entry) => entry.kategori)
      .map((entry) => ({ category: entry.kategori!, count: Number(entry.jumlah) || 0 })),
    statements: (payload.vkiSupportDocs ?? [])
      .filter((doc) => doc.key && doc.key !== "listrik" && doc.key !== "tenaga-kerja")
      .map((doc) => ({
        key: doc.key!,
        label: statementLabel(doc.key!),
        number: text(doc.nomorSurat),
        date: text(doc.tanggal),
        signer: text(doc.penandatangan),
        document: doc.documentPath ? { label: statementLabel(doc.key!), path: doc.documentPath } : null,
      })),
    technicalInputs: analysis.success
      ? Object.fromEntries(VKI_MODULE_KEYS.flatMap((key) => (analysis.data[key]?.inputs ? [[key, analysis.data[key]!.inputs!]] : [])))
      : {},
    tariff,
    modules: analysis.success
      ? Object.fromEntries(
          VKI_MODULE_KEYS.flatMap((key) => {
            const decision = analysis.data[key];
            return decision ? [[key, { status: decision.status, keterangan: plainText(decision.keterangan), kesimpulan: plainText(decision.kesimpulan) }]] : [];
          }),
        )
      : {},
  };
}
