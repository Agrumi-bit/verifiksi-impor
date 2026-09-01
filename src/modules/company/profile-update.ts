import { NextResponse } from "next/server";
import { z } from "zod";
import type { Company } from "@/generated/prisma/client";

import { db } from "@/lib/db";
import { locationsSchema, type LocationValues } from "@/modules/shared/schema";
import {
  companyContactsSchema,
  companyDataSchema,
  companyLegalSchema,
  companyTaxSchema,
  type TaxProofEntryValues,
} from "@/modules/company/schema";
import { recordDocumentVersion } from "@/modules/company/document-versions";
import { recordApplicationDocumentVersion } from "@/modules/applications/document-versions";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

/** The 6 document fields a Company Profile edit can attach a new version to — shared by every
 * GET that computes `documentMeta` for `CompanyProfileData` (Company Workspace's own profile and
 * admin's Company Detail) so the two never list a different set of fields. */
export const LEGAL_TAX_DOCUMENT_FIELD_KEYS = [
  "nibDocumentPath",
  "kbliDocumentPath",
  "notarialDocumentPath",
  "notarialAmendmentDocPath",
  "skDocumentPath",
  "npwpDocumentPath",
  "sktDocumentPath",
] as const;

export const COMPANY_PROFILE_SECTIONS = ["data", "contacts", "legal", "tax", "facilities"] as const;
export type CompanyProfileSection = (typeof COMPANY_PROFILE_SECTIONS)[number];

export function isCompanyProfileSection(value: unknown): value is CompanyProfileSection {
  return typeof value === "string" && (COMPANY_PROFILE_SECTIONS as readonly string[]).includes(value);
}

type PatchResult = { data: Company } | { error: NextResponse };

function invalidResponse(error: z.ZodError): PatchResult {
  return { error: NextResponse.json({ error: "Data tidak valid", issues: z.treeifyError(error) }, { status: 400 }) };
}

/**
 * Applies one Company Profile editor section's PATCH to a Company row — shared by Company
 * Workspace's own profile editor (`/api/company-workspace/profile`, `companyId` from the
 * caller's own session) and admin's Company Detail edit (`/api/companies/[id]/profile`,
 * `companyId` from the URL param) so the two edit surfaces never drift apart. `body` is the raw
 * PATCH request body (already known to have a valid `section`); `uploadedById` is whoever's
 * session is making the edit, credited on any new document version recorded.
 */
export async function patchCompanyProfileSection(
  companyId: string,
  section: CompanyProfileSection,
  body: unknown,
  uploadedById: string,
): Promise<PatchResult> {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return { error: NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 }) };
  }

  if (section === "data") {
    const parsed = companyDataSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        logoPath: v.logoPath || null,
        apiType: v.apiType,
        companyName: v.companyName,
        companyType: v.companyType,
        investmentStatus: v.investmentStatus,
        addressJalan: v.addressJalan,
        addressDesa: v.addressDesa,
        addressKecamatan: v.addressKecamatan,
        addressKota: v.addressKota,
        addressProvinsi: v.addressProvinsi,
        addressKodePos: v.addressKodePos,
        companyEmail: v.companyEmail,
        companyPhone: v.companyPhone,
        companyWebsite: v.companyWebsite || null,
      },
    });
  } else if (section === "contacts") {
    const parsed = companyContactsSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    const firstContact = v.contacts[0];
    await db.company.update({
      where: { id: companyId },
      data: {
        contacts: v.contacts,
        // Legacy singular columns — no other reader left in the codebase
        // besides `/api/companies` POST, but kept mirrored for safety.
        contactFullName: firstContact.name,
        contactDesignation: firstContact.jabatan,
        contactEmail: firstContact.email,
        contactPhone: firstContact.whatsapp,
      },
    });
  } else if (section === "legal") {
    const parsed = companyLegalSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        nibNumber: v.nibNumber,
        nibIssueDate: new Date(v.nibIssueDate),
        nibDocumentPath: v.nibDocumentPath,
        kbliEntries: v.kbliEntries,
        kbliDocumentPath: v.kbliDocumentPath,
        notarialDeedNumber: v.notarialDeedNumber,
        notarialDeedIssueDate: new Date(v.notarialDeedIssueDate),
        notarialIssuingAuthority: v.notarialIssuingAuthority,
        notarialDocumentPath: v.notarialDocumentPath,
        notarialAmendmentNumber: v.hasAmendment ? v.notarialAmendmentNumber || null : null,
        notarialAmendmentDate: v.hasAmendment && v.notarialAmendmentDate ? new Date(v.notarialAmendmentDate) : null,
        notarialAmendmentAuthority: v.hasAmendment ? v.notarialAmendmentAuthority || null : null,
        notarialAmendmentDocPath: v.hasAmendment ? v.notarialAmendmentDocPath || null : null,
        skNumber: v.skNumber,
        skDate: new Date(v.skDate),
        skDocumentPath: v.skDocumentPath,
      },
    });

    const newLegalDocs: Record<string, string | null> = {
      nibDocumentPath: v.nibDocumentPath,
      kbliDocumentPath: v.kbliDocumentPath,
      notarialDocumentPath: v.notarialDocumentPath,
      notarialAmendmentDocPath: v.hasAmendment ? v.notarialAmendmentDocPath || null : null,
      skDocumentPath: v.skDocumentPath,
    };
    await Promise.all(
      Object.entries(newLegalDocs)
        .filter(([key, path]) => path && path !== company[key as keyof typeof company])
        .map(([key, path]) => {
          const previousPath = company[key as keyof typeof company] as string | null;
          return recordDocumentVersion(
            companyId,
            key,
            path!,
            uploadedById,
            previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
          );
        }),
    );
  } else if (section === "tax") {
    const parsed = companyTaxSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        npwpNumber: v.npwpNumber,
        npwpIssuer: v.npwpIssuer,
        npwpDocumentPath: v.npwpDocumentPath,
        companyAge: v.companyAge,
        taxProofs: v.companyAge === "OVER_3" ? v.taxProofs : [],
        sktNumber: v.companyAge === "UNDER_3" ? v.sktNumber || null : null,
        sktIssuer: v.companyAge === "UNDER_3" ? v.sktIssuer || null : null,
        sktDate: v.companyAge === "UNDER_3" && v.sktDate ? new Date(v.sktDate) : null,
        sktDocumentPath: v.companyAge === "UNDER_3" ? v.sktDocumentPath || null : null,
      },
    });

    const newTaxDocs: Record<string, string | null> = {
      npwpDocumentPath: v.npwpDocumentPath,
      sktDocumentPath: v.companyAge === "UNDER_3" ? v.sktDocumentPath || null : null,
    };
    await Promise.all(
      Object.entries(newTaxDocs)
        .filter(([key, path]) => path && path !== company[key as keyof typeof company])
        .map(([key, path]) => {
          const previousPath = company[key as keyof typeof company] as string | null;
          return recordDocumentVersion(
            companyId,
            key,
            path!,
            uploadedById,
            previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
          );
        }),
    );
    if (v.companyAge === "OVER_3") {
      const oldTaxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
      const oldByYear = new Map(oldTaxProofs.map((tp) => [tp.year, tp.docPath]));
      await Promise.all(
        v.taxProofs
          .filter((tp) => tp.docPath && tp.docPath !== oldByYear.get(tp.year))
          .map((tp) => {
            const previousPath = oldByYear.get(tp.year);
            return recordDocumentVersion(
              companyId,
              `taxProof:${tp.year}`,
              tp.docPath!,
              uploadedById,
              previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
            );
          }),
      );
    }
  } else {
    const parsed = locationsSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    const oldLocations = (company.locations as LocationValues[] | null) ?? [];

    await db.company.update({
      where: { id: companyId },
      data: { locations: v.locations },
    });

    // Every submitted application freezes a copy of the company's locations into its own
    // payload at submission time, and the verifikator/technical-analyst/PM checklists version
    // location documents per-application (`ApplicationDocumentVersion`, not the company-scoped
    // `CompanyDocumentVersion` used above for legal/tax) — so a re-upload here has to be recorded
    // against every application that already has this location id, or the reviewing workspace
    // keeps showing "version 1" even though `buildDocumentChecklist` now resolves the live path
    // (see `ChecklistCompanyContext.locations`). Mirrors the legal/tax `recordDocumentVersion`
    // calls above, just keyed by applicationId instead of companyId.
    const changedDocs: { locationId: string; key: string; path: string; previousPath: string | null }[] = [];
    for (const loc of v.locations) {
      const oldLoc = oldLocations.find((l) => l.id === loc.id);
      for (const entry of loc.ownershipDocuments ?? []) {
        const previousPath = oldLoc?.ownershipDocuments?.find((e) => e.type === entry.type)?.documentPath ?? null;
        if (entry.documentPath && entry.documentPath !== previousPath) {
          changedDocs.push({ locationId: loc.id, key: `location:${loc.id}:ownership:${entry.type}`, path: entry.documentPath, previousPath });
        }
      }
      for (const entry of loc.leaseDocuments ?? []) {
        const previousPath = oldLoc?.leaseDocuments?.find((e) => e.type === entry.type)?.documentPath ?? null;
        if (entry.documentPath && entry.documentPath !== previousPath) {
          changedDocs.push({ locationId: loc.id, key: `location:${loc.id}:lease:${entry.type}`, path: entry.documentPath, previousPath });
        }
      }
      if (loc.warehouseRegistrationDocumentPath && loc.warehouseRegistrationDocumentPath !== oldLoc?.warehouseRegistrationDocumentPath) {
        changedDocs.push({
          locationId: loc.id,
          key: `location:${loc.id}:warehouseRegistration`,
          path: loc.warehouseRegistrationDocumentPath,
          previousPath: oldLoc?.warehouseRegistrationDocumentPath ?? null,
        });
      }
      if (loc.warehouseLayoutDocumentPath && loc.warehouseLayoutDocumentPath !== oldLoc?.warehouseLayoutDocumentPath) {
        changedDocs.push({
          locationId: loc.id,
          key: `location:${loc.id}:warehouseLayout`,
          path: loc.warehouseLayoutDocumentPath,
          previousPath: oldLoc?.warehouseLayoutDocumentPath ?? null,
        });
      }
    }

    if (changedDocs.length) {
      const applications = await db.application.findMany({
        where: { companyId },
        select: { id: true, createdAt: true, payload: true },
      });
      await Promise.all(
        applications.flatMap((application) => {
          const payloadLocationIds = new Set(
            ((application.payload as ApplicationWizardValues).locations ?? []).map((l) => l.id),
          );
          return changedDocs
            .filter((doc) => payloadLocationIds.has(doc.locationId))
            .map((doc) =>
              recordApplicationDocumentVersion(
                application.id,
                doc.key,
                doc.path,
                uploadedById,
                doc.previousPath ? { previousPath: doc.previousPath, createdAt: application.createdAt } : undefined,
              ),
            );
        }),
      );
    }
  }

  const updated = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  return { data: updated };
}
