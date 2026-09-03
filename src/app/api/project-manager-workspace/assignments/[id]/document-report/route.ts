import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import { getDocumentMeta } from "@/modules/company/document-versions";
import {
  buildDocumentChecklist,
  buildMachineChecklist,
  buildProductChecklist,
  buildRawMaterialChecklist,
  buildCapacityRows,
  buildProductionQtyChecklist,
  buildRawMaterialUsageChecklist,
  buildRawMaterialConversionRows,
  buildSalesChecklist,
  machineVerificationsSchema,
  productVerificationsSchema,
  productionQtyVerificationsSchema,
  COMPANY_MAPPED_DOCUMENT_KEYS,
  toChecklistStatus,
} from "@/modules/verifikator-workspace/schema";
import { toChecklistCompanyContext, toCompanyLegalContext, toCompanyLocationsContext } from "@/modules/verifikator-workspace/company-context";
import { resolvePartnerContexts } from "@/modules/verifikator-workspace/partner-context";
import {
  PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY,
  PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY,
  PRODUCTION_QTY_STOK_SUMMARY_KEY,
  PRODUCTION_QTY_KONVERSI_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_SUMMARY_KEY,
  PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY,
  PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY,
} from "@/modules/verifikator-workspace/status";

/**
 * PM-facing mirror of `verifikator-workspace/assignments/[id]/document-report/route.ts` — same
 * read-only reshape. Unlike verifikator/technical-analyst's mirrors, PM has no "owned"
 * assignment and no sibling indirection needed: `id` is the "dokumen" assignment's own
 * assignmentNumber directly (PM oversees everything, no ownership scoping).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true, verifikator: true, technicalReviewer: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED" && assignment.status !== "COMPLETED" && assignment.status !== "RETURNED") {
    return NextResponse.json({ error: "Laporan belum tersedia" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;

  const partners = await resolvePartnerContexts(payload);
  const checklist = buildDocumentChecklist(payload, toChecklistCompanyContext(company), partners);
  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);

  const companyMeta = company
    ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const appMeta = await getApplicationDocumentMeta(assignment.application.id, appOnlyKeys, assignment.application.createdAt);

  const documents = checklist.map((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key];
    return {
      key: item.key,
      label: item.label,
      category: item.category,
      documentPath: item.documentPath,
      hasDocument: Boolean(item.documentPath),
      status: meta ? toChecklistStatus(meta.verificationStatus) : "PENDING",
      note: meta?.rejectionNote ?? null,
      verifiedAt: meta?.verifiedAt ?? null,
    };
  });

  const kantorLocation = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];
  const businessAddress = kantorLocation ? `${kantorLocation.address}, ${kantorLocation.city}, ${kantorLocation.province}` : null;

  const machineDecisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});
  const machines = buildMachineChecklist(payload).map((item) => ({
    ...item,
    photoMesinPath: machineDecisions[item.id]?.photoPath || item.photoMesinPath,
    status: machineDecisions[item.id]?.status ?? "PENDING",
    note: machineDecisions[item.id]?.note ?? "",
    jumlahTerpasang: machineDecisions[item.id]?.jumlahTerpasang ?? "",
    jumlahTidakAktif: machineDecisions[item.id]?.jumlahTidakAktif ?? "",
    keteranganJumlah: machineDecisions[item.id]?.keteranganJumlah ?? "",
  }));

  const productDecisions = productVerificationsSchema.parse(assignment.productVerifications ?? {});
  const products = buildProductChecklist(payload).map((item) => ({
    ...item,
    status: productDecisions[item.id]?.status ?? "PENDING",
  }));
  const rawMaterials = buildRawMaterialChecklist(payload);

  const capacity = buildCapacityRows(payload);
  const productionQtyDecisions = productionQtyVerificationsSchema.parse(assignment.productionQtyVerifications ?? {});
  const productionQty = buildProductionQtyChecklist(payload).map((item) => ({
    ...item,
    status: productionQtyDecisions[item.key]?.status ?? "PENDING",
  }));
  const rawMaterialUsage = buildRawMaterialUsageChecklist(payload);
  const rawMaterialConversion = buildRawMaterialConversionRows(payload);
  const sales = buildSalesChecklist(payload);
  function summaryConclusion(key: string) {
    return {
      status: productionQtyDecisions[key]?.status ?? "PENDING",
      keterangan: productionQtyDecisions[key]?.keterangan ?? "",
      kesimpulan: productionQtyDecisions[key]?.kesimpulan ?? "",
    };
  }

  const companyLegal = toCompanyLegalContext(company);
  const companyLocations = toCompanyLocationsContext(company);

  return NextResponse.json({
    data: {
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      validationNotes: assignment.validationNotes,
      validatedAt: assignment.validatedAt,
      signaturePath: assignment.signaturePath,
      signatureDate: assignment.signatureDate,
      companyName: payload.companyName,
      businessAddress,
      verifikatorName: assignment.verifikator?.name ?? null,
      technicalReviewerName: assignment.technicalReviewer?.name ?? null,
      documents,
      machines,
      products,
      rawMaterials,
      capacity,
      productionQty,
      rawMaterialUsage,
      rawMaterialConversion,
      sales,
      productionSebelumnyaConclusion: summaryConclusion(PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY),
      penggunaanConclusion: summaryConclusion(PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY),
      stokConclusion: summaryConclusion(PRODUCTION_QTY_STOK_SUMMARY_KEY),
      konversiConclusion: summaryConclusion(PRODUCTION_QTY_KONVERSI_SUMMARY_KEY),
      rencanaConclusion: summaryConclusion(PRODUCTION_QTY_RENCANA_SUMMARY_KEY),
      rencanaKebutuhanConclusion: summaryConclusion(PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY),
      penjualanConclusion: summaryConclusion(PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY),
      payload,
      companyLegal,
      companyLocations,
      partners,
    },
  });
}
