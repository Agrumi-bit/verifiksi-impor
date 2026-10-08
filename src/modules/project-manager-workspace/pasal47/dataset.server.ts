import "server-only";

import { db } from "@/lib/db";
import { assignmentDateKey } from "@/lib/assignment-date";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { statementAmount } from "@/modules/applications/viu-import-plan";
import { konsumsiProductTotal } from "@/modules/applications/viu-schemes/konsumsi/schema";
import { APPLICANT_BRAND_ROLE_LABELS, IMPORT_APPOINTMENT_SOURCE_LABELS } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import { qualityTestSubmissionWindow } from "@/modules/applications/viu-schemes/konsumsi/quality-test-window";
import { MERK_EVIDENCE_TYPE_LABELS, type MerkEvidenceType } from "@/modules/merk/schema";
import { composeLocationAddress, splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { TECHNICAL_MODULE_LABELS, type TechnicalModuleKey } from "@/modules/technical-analyst-workspace/status";
import { resolveKonsumsiBrandContexts } from "@/modules/verifikator-workspace/konsumsi-brand-context";
import { productVerificationsSchema } from "@/modules/verifikator-workspace/schema";
import { status, uniq } from "./format";
import type { P47Application, P47Brand, P47BrandUse, P47Dataset, P47Finding, P47Line, P47Place, P47Technical, P47Value, P47Warehouse, Status } from "./types";

const OWNERSHIP_LABEL: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };
const SEVERITY = { MINOR: "Minor", MAJOR: "Major", CRITICAL: "Critical" } as const;
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

function place(loc: Partial<LocationValues> | undefined): P47Place {
  return {
    address: composeLocationAddress({ address: loc?.address, addressDesa: loc?.addressDesa, addressKecamatan: loc?.addressKecamatan }),
    city: loc?.city ?? "",
    province: loc?.province ?? "",
    ownership: OWNERSHIP_LABEL[loc?.buildingStatus ?? ""] ?? "",
  };
}

/** Where a review left a document: the latest version's verification status per field key. */
function docStatusLabel(s: string | undefined): Status {
  if (s === "VERIFIED") return status("Terverifikasi", "ok");
  if (s === "REJECTED") return status("Ditolak", "bad");
  if (s === "NEED_REVISION") return status("Perlu Revisi", "warn");
  if (s === "EXPIRED") return status("Kedaluwarsa", "bad");
  return status("Belum Diverifikasi", "na");
}

function areaOfKey(key: string): string {
  if (key.startsWith("konsumsi-brand:")) return "Dokumen Merek";
  if (key.startsWith("konsumsi-qt:")) return "Sertifikat Uji Mutu";
  if (key.startsWith("konsumsi-label:")) return "Dokumen Label";
  if (key.startsWith("location:")) return "Dokumen Lokasi";
  if (key.startsWith("konsumsi-financial:")) return "Bukti Kemampuan Finansial";
  return "Dokumen Permohonan";
}

/**
 * Every VIU Barang Konsumsi application whose Tanggal Pengajuan falls inside the period (drafts and
 * withdrawn ones excluded), flattened into the report dataset. Nothing is invented: a figure the
 * system does not hold stays empty and the UI says so.
 */
export async function buildPasal47Dataset(period: { from: string; to: string }): Promise<P47Dataset> {
  const rows = await db.application.findMany({
    where: { verificationType: "VIU", status: { notIn: ["DRAFT", "WITHDRAWN"] } },
    include: {
      company: true,
      locationVisits: { select: { id: true, locationType: true, address: true, findings: true, reportVerification: true } },
      assignments: {
        select: {
          scheduleType: true, technicalAnalysisData: true, productVerifications: true,
          surveyor: { select: { name: true } }, verifikator: { select: { name: true } }, technicalReviewer: { select: { name: true } },
        },
      },
    },
  });
  const inScope = rows.filter((a) => {
    const payload = a.payload as ApplicationWizardValues;
    if (payload.importTypes?.[0] !== "BARANG_KONSUMSI") return false;
    const day = assignmentDateKey(effectiveSubmissionDate(a).value);
    return day >= period.from && day <= period.to;
  });
  const ids = inScope.map((a) => a.id);

  const [lhviuRows, docVersions] = await Promise.all([
    ids.length ? db.$queryRaw<{ id: string; lhviuDocument: unknown }[]>`SELECT "id", "lhviuDocument" FROM "application" WHERE "id" = ANY(${ids})` : Promise.resolve([]),
    ids.length
      ? db.applicationDocumentVersion.findMany({
          where: { applicationId: { in: ids } },
          orderBy: { version: "desc" },
          select: { applicationId: true, fieldKey: true, verificationStatus: true, rejectionNote: true, verifiedBy: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);
  const lhviuById = new Map(lhviuRows.map((r) => [r.id, r.lhviuDocument as { path?: string; fileName?: string; uploadedAt?: string } | null]));
  const latestDoc = new Map<string, (typeof docVersions)[number]>();
  for (const v of docVersions) if (!latestDoc.has(`${v.applicationId}|${v.fieldKey}`)) latestDoc.set(`${v.applicationId}|${v.fieldKey}`, v);
  const docOf = (appId: string, key: string) => latestDoc.get(`${appId}|${key}`);

  const applications: P47Application[] = [];
  const lines: P47Line[] = [];
  const technical: P47Technical[] = [];
  const warehouses: P47Warehouse[] = [];
  const values: P47Value[] = [];
  const findings: P47Finding[] = [];
  const brandUses = new Map<string, P47BrandUse[]>();
  const brandNameFromSnapshot = new Map<string, string>();

  for (const a of inScope) {
    const payload = a.payload as ApplicationWizardValues;
    const company = a.company?.companyName ?? payload.companyName ?? "—";
    const liveLocations = (a.company?.locations as LocationValues[] | null) ?? [];
    const locs = (payload.locations ?? []).map((loc) => liveLocations.find((l) => l.id === loc.companyLocationId) ?? loc);
    const kbliEntries = (a.company?.kbliEntries as { code: string; description: string; category?: "UTAMA" | "PENDUKUNG" }[] | null) ?? payload.kbliEntries ?? [];
    const lhviu = lhviuById.get(a.id);
    const survey = a.assignments.find((x) => x.scheduleType === "survey");
    const dokumen = a.assignments.find((x) => x.scheduleType === "dokumen");
    const tech = a.assignments.find((x) => x.scheduleType === "technical");
    const ta = technicalAnalysisDataSchema.safeParse(tech?.technicalAnalysisData ?? {});
    const taData = ta.success ? ta.data : {};

    applications.push({
      id: a.id, applicationNumber: a.applicationNumber, companyId: a.companyId, company,
      nib: a.company?.nibNumber ?? payload.nibNumber ?? "",
      kbli: splitKbliEntries(kbliEntries).utama.map((k) => ({ code: k.code, description: k.description })),
      submittedAt: assignmentDateKey(effectiveSubmissionDate(a).value),
      status: a.status,
      lhviu: lhviu?.path ? { path: lhviu.path, fileName: lhviu.fileName ?? "LHVIU.pdf", uploadedAt: lhviu.uploadedAt ?? "" } : null,
      kantor: locs.find((l) => l.locationType === "KANTOR") ? place(locs.find((l) => l.locationType === "KANTOR")) : null,
      gudang: locs.filter((l) => l.locationType === "GUDANG").map(place),
    });

    // Product lines ------------------------------------------------------------------------------
    const products = payload.konsumsiProducts ?? [];
    for (const p of products) {
      if (p.productSnapshot?.brandName) brandNameFromSnapshot.set(p.brandId, p.productSnapshot.brandName);
      lines.push({
        id: `${a.id}:${p.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company,
        productName: p.productName, brandId: p.brandId, brandName: p.productSnapshot?.brandName ?? "",
        hs: p.hsCode, hsDescription: p.hsDescription ?? p.productSnapshot?.hsDescription ?? "",
        kelompok: p.industryName ?? "", subKelompok: p.commodityName ?? p.productSnapshot?.commodityName ?? "", komoditas: p.commoditySubGroupName ?? "",
        // Older products carry no origin country at all — always an array, the report pages count it.
        countries: p.originCountryNames?.length ? p.originCountryNames : (p.productSnapshot?.countryOfOriginNames ?? p.originCountries ?? []),
        countryAutoFilled: p.originCountryAutoFilled === true,
        quantity: Number(p.quantity) || 0, stock: Number(p.stockQuantity) || 0, unit: p.unit ?? "",
        price: Number(p.averageUnitPrice) || 0, currency: p.currency ?? "USD", total: konsumsiProductTotal(p),
      });
    }

    // Brand use per application -----------------------------------------------------------------
    const entries = payload.applicationBrands ?? [];
    const contexts = await resolveKonsumsiBrandContexts(entries);
    entries.forEach((entry, i) => {
      const ctx = contexts[i];
      const missing = (ctx?.requiredRelationshipDocuments ?? []).filter((d) => !entry.relationshipDocuments?.[d.code]?.filePath).map((d) => d.label);
      const keys = [`konsumsi-brand:${entry.brandId}:evidence`, ...(ctx?.requiredRelationshipDocuments ?? []).map((d) => `konsumsi-brand:${entry.brandId}:rel:${d.code}`)];
      const statuses = keys.map((k) => docOf(a.id, k)?.verificationStatus);
      const docStatus = !ctx?.registrationDocumentPath || missing.length
        ? status("Tidak Lengkap", "bad")
        : statuses.some((s) => s === "REJECTED") ? status("Ditolak", "bad")
        : statuses.every((s) => s === "VERIFIED") ? status("Valid", "ok") : status("Perlu Review", "warn");
      const role = entry.applicantRole ? APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole] : "Belum dipilih";
      const basis = entry.applicantRole === "IMPORTER_ONLY" && entry.appointmentSource ? `Ditunjuk oleh ${IMPORT_APPOINTMENT_SOURCE_LABELS[entry.appointmentSource]}` : role;
      const list = brandUses.get(entry.brandId) ?? [];
      list.push({ applicationId: a.id, applicationNumber: a.applicationNumber, company, role, basis, docStatus, missingDocuments: missing });
      brandUses.set(entry.brandId, list);
    });

    // Persyaratan teknis: Sertifikat Hasil Uji Mutu per Merek x Sub Kelompok + label statement --------
    const labelDoc = payload.labelStatementDocument?.filePath ? docStatusLabel(docOf(a.id, "konsumsi-label:statement")?.verificationStatus) : status("Belum Ada", "bad");
    for (const c of payload.productGroupCertificates ?? []) {
      const ver = docOf(a.id, `konsumsi-qt:${c.brandId}:${c.commodityGroupId}`)?.verificationStatus;
      const window = qualityTestSubmissionWindow(c.issueDate, payload.submissionDate);
      const st = !c.filePath ? status("Tidak Lengkap", "bad")
        : c.validUntil && c.validUntil.slice(0, 10) < period.to ? status("Kedaluwarsa", "bad")
        : ver === "REJECTED" ? status("Ditolak", "bad")
        : window.withinWindow === false ? status("Lewat 6 Bulan", "warn")
        : ver === "VERIFIED" && labelDoc.tone === "ok" ? status("Lengkap", "ok") : status("Perlu Review", "warn");
      technical.push({
        id: `${a.id}:${c.brandId}:${c.commodityGroupId}`, applicationId: a.id, applicationNumber: a.applicationNumber, company,
        brandName: c.brandId, subKelompok: c.commodityName ?? "", documentType: "Sertifikat Hasil Uji Mutu",
        laboratory: c.laboratoryName ?? "", reportNumber: c.certificateNumber ?? "", issueDate: (c.issueDate ?? "").slice(0, 10), validUntil: (c.validUntil ?? "").slice(0, 10),
        labelStatement: labelDoc, verification: docStatusLabel(ver).label, status: st,
      });
    }

    // Gudang: TA's Kapasitas Gudang module figures belong to the application, shown on its first gudang
    const stockByUnit: Record<string, number> = {};
    for (const p of products) if (p.unit) stockByUnit[p.unit] = (stockByUnit[p.unit] ?? 0) + (Number(p.stockQuantity) || 0);
    const penyimpanan = taData.penyimpanan;
    locs.filter((l) => l.locationType === "GUDANG").forEach((l, i) => {
      warehouses.push({
        id: `${a.id}:${l.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, place: place(l),
        capacity: i === 0 ? num(penyimpanan?.inputs?.kapasitasGudang) : null,
        analystStock: i === 0 ? num(penyimpanan?.inputs?.stokTerkini) : null,
        declaredStock: i === 0 ? stockByUnit : {},
        analystDecision: penyimpanan?.status === "SESUAI" ? "Sesuai" : penyimpanan?.status === "TIDAK_SESUAI" ? "Tidak Sesuai" : "Belum Dianalisis",
      });
    });

    // Nilai impor per currency vs Modal Kerja (Rp) ----------------------------------------------------
    const modal = taData.modal;
    const modalKerja = statementAmount(payload.konsumsiFinancialDocuments);
    for (const currency of uniq(products.map((p) => p.currency ?? "USD"))) {
      const plan = products.filter((p) => (p.currency ?? "USD") === currency).reduce((s, p) => s + konsumsiProductTotal(p), 0);
      values.push({
        applicationId: a.id, applicationNumber: a.applicationNumber, company, currency, plan, modalKerja,
        rate: currency === "IDR" ? 1 : num(modal?.inputs?.[`kurs_${currency}`]),
        decision: modal?.status === "SESUAI" ? status("Sesuai", "ok") : modal?.status === "TIDAK_SESUAI" ? status("Tidak Sesuai", "bad") : status("Belum Dianalisis", "na"),
      });
    }

    // Temuan ------------------------------------------------------------------------------------------
    for (const v of a.locationVisits) {
      const decision = (v.reportVerification as { decision?: string | null } | null)?.decision;
      const st = decision === "VERIFIED" ? status("Ditinjau Verifikator", "ok") : decision === "REVISION" ? status("Revisi Diminta", "warn") : decision === "REJECTED" ? status("Ditolak", "bad") : status("Belum Ditinjau", "warn");
      for (const f of (v.findings as { id: string; title: string; severity: keyof typeof SEVERITY; description: string }[] | null) ?? []) {
        findings.push({
          key: `survey:${v.id}:${f.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Survei Lapangan",
          area: `Survei ${v.locationType === "KANTOR" ? "Kantor" : v.locationType === "GUDANG" ? "Gudang" : "Pabrik"}`,
          text: f.description ? `${f.title} — ${f.description}` : f.title, severity: SEVERITY[f.severity] ?? "Minor", status: st, followUp: "—", pic: survey?.surveyor?.name ?? "—",
        });
      }
    }
    for (const [key, v] of latestDoc) {
      if (!key.startsWith(`${a.id}|`) || (v.verificationStatus !== "REJECTED" && v.verificationStatus !== "NEED_REVISION")) continue;
      findings.push({
        key: `doc:${key}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Verifikasi Dokumen", area: areaOfKey(v.fieldKey),
        text: v.rejectionNote || `Dokumen ${v.fieldKey} ${v.verificationStatus === "REJECTED" ? "ditolak" : "perlu revisi"}`,
        severity: v.verificationStatus === "REJECTED" ? "Major" : "Minor", status: docStatusLabel(v.verificationStatus), followUp: "Unggah dokumen perbaikan", pic: v.verifiedBy?.name ?? dokumen?.verifikator?.name ?? "—",
      });
    }
    for (const [module, d] of Object.entries(taData)) {
      if (d.status !== "TIDAK_SESUAI") continue;
      findings.push({
        key: `ta:${a.id}:${module}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Analisis Teknis",
        area: TECHNICAL_MODULE_LABELS[module as TechnicalModuleKey] ?? module, text: d.kesimpulan || d.keterangan || "Modul dinyatakan Tidak Sesuai",
        severity: "Major", status: status("Tidak Sesuai", "bad"), followUp: "—", pic: tech?.technicalReviewer?.name ?? "—",
      });
    }
    const pv = productVerificationsSchema.safeParse(dokumen?.productVerifications ?? {});
    for (const [productId, d] of Object.entries(pv.success ? pv.data : {})) {
      if (d.status !== "NEED_REVISION" && d.status !== "REJECTED") continue;
      const product = products.find((p) => p.id === productId);
      findings.push({
        key: `product:${a.id}:${productId}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Verifikasi Produk",
        area: "Product Information", text: `${product?.productName ?? productId}${d.note ? ` — ${d.note}` : ""}`,
        severity: d.status === "REJECTED" ? "Major" : "Minor", status: d.status === "REJECTED" ? status("Ditolak", "bad") : status("Perlu Revisi", "warn"), followUp: "—", pic: dokumen?.verifikator?.name ?? "—",
      });
    }
  }

  // Brands ----------------------------------------------------------------------------------------------
  const brandIds = uniq([...lines.map((l) => l.brandId), ...brandUses.keys()]);
  const merks = brandIds.length
    ? await db.merk.findMany({
        where: { id: { in: brandIds } },
        select: {
          id: true, brandName: true, brandOwnerName: true, certificateType: true, hasCertificate: true, registrationNumber: true,
          registrationDate: true, registrationExpiryDate: true, registrationDocumentPath: true, trademarkClass: true,
          trademarkClassEntries: { select: { trademarkClass: true }, orderBy: { createdAt: "asc" } },
          brandOwner: { select: { name: true } },
          ownership: { select: { ownerLocation: true, ownerName: true, ownerCountryCode: true, ownerCompany: { select: { name: true } }, officialRepresentative: { select: { name: true } } } },
        },
      })
    : [];
  const brands: P47Brand[] = merks.map((m) => ({
    id: m.id, name: m.brandName,
    owner: m.ownership?.ownerCompany?.name || m.ownership?.ownerName || m.brandOwner?.name || m.brandOwnerName || "",
    ownerCountry: m.ownership?.ownerLocation === "DOMESTIC" ? "Indonesia" : m.ownership?.ownerCountryCode ?? "",
    representative: m.ownership?.officialRepresentative?.name ?? "",
    evidenceType: !m.hasCertificate ? "Tidak mempunyai sertifikat" : MERK_EVIDENCE_TYPE_LABELS[m.certificateType as MerkEvidenceType] ?? "",
    registrationNumber: m.registrationNumber ?? "", registrationDate: iso(m.registrationDate), expiryDate: iso(m.registrationExpiryDate),
    classes: m.trademarkClassEntries.length ? m.trademarkClassEntries.map((c) => c.trademarkClass) : m.trademarkClass ? [m.trademarkClass] : [],
    evidencePath: m.registrationDocumentPath, uses: brandUses.get(m.id) ?? [],
  }));
  const nameById = new Map(brands.map((b) => [b.id, b.name]));
  for (const l of lines) l.brandName = nameById.get(l.brandId) || l.brandName || brandNameFromSnapshot.get(l.brandId) || "Merek tidak ditemukan";
  for (const t of technical) t.brandName = nameById.get(t.brandName) || brandNameFromSnapshot.get(t.brandName) || t.brandName;

  return { period, generatedAt: new Date().toISOString(), applications, lines, brands, technical, warehouses, values, findings };
}
