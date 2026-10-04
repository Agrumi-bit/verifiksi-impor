import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { applicationSubmitSchema, type ApplicationWizardValues, type LocationValues } from "@/modules/applications/schema";
import { findDisallowedViuImportType, viuKbliRequirementMessage } from "@/modules/applications/viu-kbli-requirements";
import { konsumsiScheme } from "@/modules/applications/viu-schemes/konsumsi/registry";
import { syncMerkRelationshipsForApplication, syncQualityTestCertificatesForApplication } from "@/modules/merk/application-relationship-sync";

/**
 * Schemes with a registered DB-aware server validator — only Konsumsi for
 * now (Industri/Non-Industri aren't separated into scheme modules yet, see
 * the VIU Konsumsi implementation plan). Each validator may return a
 * replacement `applicationBrands`-shaped slice of `values` (e.g. Konsumsi
 * attaches a server-built submission snapshot) — when it does, that
 * replacement is what gets persisted, never the client-submitted payload
 * for that slice.
 */
const REGISTERED_VIU_SCHEMES = [konsumsiScheme];

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
}

const locationKey = (loc: LocationValues) => `${loc.locationType}::${loc.address}`;

/**
 * A wizard applicant can add a new facility (e.g. Pabrik) directly in the
 * application's Location step without ever visiting Company Profile — that
 * facility only lives in Application.payload.locations until we mirror it
 * back here. Existing facilities are left untouched; only genuinely new
 * ones (by locationType+address) get appended.
 */
async function syncNewFacilitiesToCompany(companyId: string, submittedLocations: LocationValues[]): Promise<void> {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { locations: true } });
  if (!company) return;

  const existingLocations = (company.locations as LocationValues[] | null) ?? [];
  const existingKeys = new Set(existingLocations.map(locationKey));
  const newLocations = submittedLocations.filter((loc) => !existingKeys.has(locationKey(loc)));
  if (newLocations.length === 0) return;

  await db.company.update({
    where: { id: companyId },
    data: { locations: [...existingLocations, ...newLocations] },
  });
}

export async function GET() {
  const applications = await db.application.findMany({
    orderBy: { createdAt: "desc" },
  });

  const data = applications.map((application) => {
    const payload = application.payload as { companyName?: string } | null;
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      companyName: payload?.companyName ?? "—",
      status: application.status,
      createdAt: application.createdAt,
    };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { draftApplicationId, ...wizardBody } = body ?? {};
  // Discriminated by verificationType — the authoritative gate, structurally unable to run
  // a VIU-only rule against a VKI payload (see applicationSubmitSchema's own comment).
  const parsed = applicationSubmitSchema.safeParse(wizardBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  let values: ApplicationWizardValues = parsed.data;

  // The schema checked the VIU type ↔ KBLI rule against the payload's own company snapshot;
  // re-check it against the Company row so a stale or edited payload can't bypass it.
  if (values.verificationType === "VIU" && values.companyId) {
    const company = await db.company.findUnique({
      where: { id: values.companyId },
      select: { apiType: true, kbliEntries: true },
    });
    const companyKbli = Array.isArray(company?.kbliEntries) ? (company.kbliEntries as { code: string; category?: "UTAMA" | "PENDUKUNG" }[]) : [];
    const disallowed = company ? findDisallowedViuImportType(values.importTypes, company.apiType, companyKbli) : undefined;
    if (disallowed) {
      return NextResponse.json({ error: viuKbliRequirementMessage(disallowed) }, { status: 400 });
    }
  }

  // The generic `products` list is only meaningful for Bahan Baku Industri/Non Industri — a
  // Barang-Konsumsi-only (or VKI-only-fields-irrelevant) submission may still carry a stray
  // leftover row (e.g. an empty default item from before this list stopped requiring
  // materialType/hsCode unconditionally); normalize it away before persisting rather than storing
  // dead data forever. Validation already passed either way — this is cleanup, not a gate.
  if (
    values.verificationType === "VIU" &&
    !values.importTypes.includes("BAHAN_BAKU_INDUSTRI") &&
    !values.importTypes.includes("BAHAN_BAKU_NON_INDUSTRI")
  ) {
    values = { ...values, products: [] };
  }

  // Run every registered scheme's server-side validator whose key is
  // actually enabled on this application — never the client's own computed
  // readiness/document count/brand metadata. A scheme's validator may
  // return a server-authoritative replacement for its own slice of
  // `values` (Konsumsi attaches a submission snapshot to each brand entry
  // here); when it does, that replacement is what gets persisted below.
  for (const scheme of REGISTERED_VIU_SCHEMES) {
    if (!values.importTypes.includes(scheme.key)) continue;
    const result = await scheme.validateServerSide(values);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    values = {
      ...values,
      applicationBrands: result.applicationBrands,
      konsumsiProducts: result.konsumsiProducts,
      productGroupCertificates: result.productGroupCertificates,
    };
  }

  // Promote the draft row saved during the wizard instead of creating a
  // second, orphaned Application — same applicationNumber carries over.
  if (typeof draftApplicationId === "string") {
    const existing = await db.application.findUnique({ where: { id: draftApplicationId } });
    const isEditable = existing?.status === "DRAFT" || existing?.status === "RETURNED";
    if (existing && isEditable && existing.companyId === values.companyId) {
      const wasRevision = existing.status === "RETURNED";
      const promoted = await db.application.update({
        where: { id: draftApplicationId },
        data: {
          verificationType: values.verificationType,
          applicationCategory: values.applicationCategory,
          payload: values,
          status: "SUBMITTED",
        },
      });
      await db.applicationMessage.create({
        data: {
          applicationId: promoted.id,
          direction: "SYSTEM",
          text: wasRevision
            ? `Revisi permohonan ${promoted.applicationNumber} berhasil dikirim ulang.`
            : `Permohonan ${promoted.applicationNumber} berhasil diajukan.`,
        },
      });
      if (values.companyId) {
        await syncNewFacilitiesToCompany(values.companyId, values.locations);
      }
      // "Every non-draft update of the application" — a RETURNED application resubmitted
      // through this same promote-draft path counts, since its status becomes SUBMITTED here.
      await syncMerkRelationshipsForApplication({
        applicationId: promoted.id,
        companyId: values.companyId,
        companyName: values.companyName,
        applicationBrands: values.applicationBrands ?? [],
      });
      await syncQualityTestCertificatesForApplication({
        applicationId: promoted.id,
        productGroupCertificates: values.productGroupCertificates ?? [],
      });
      return NextResponse.json({
        applicationNumber: promoted.applicationNumber,
        id: promoted.id,
        createdAt: promoted.createdAt,
      });
    }
  }

  const applicationNumber = generateApplicationNumber(values.verificationType);

  const application = await db.application.create({
    data: {
      applicationNumber,
      verificationType: values.verificationType,
      applicationCategory: values.applicationCategory,
      payload: values,
      companyId: values.companyId,
    },
  });
  await db.applicationMessage.create({
    data: {
      applicationId: application.id,
      direction: "SYSTEM",
      text: `Permohonan ${application.applicationNumber} berhasil diajukan.`,
    },
  });
  if (values.companyId) {
    await syncNewFacilitiesToCompany(values.companyId, values.locations);
  }
  await syncMerkRelationshipsForApplication({
    applicationId: application.id,
    companyId: values.companyId,
    companyName: values.companyName,
    applicationBrands: values.applicationBrands ?? [],
  });
  await syncQualityTestCertificatesForApplication({
    applicationId: application.id,
    productGroupCertificates: values.productGroupCertificates ?? [],
  });

  return NextResponse.json({
    applicationNumber: application.applicationNumber,
    id: application.id,
    createdAt: application.createdAt,
  });
}
