import "server-only";

import { db } from "@/lib/db";
import { assignmentDateKey } from "@/lib/assignment-date";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { statementAmount } from "@/modules/applications/viu-import-plan";
import { splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { TECHNICAL_MODULE_NAV_LABELS, type TechnicalModuleKey } from "@/modules/technical-analyst-workspace/status";
import { productVerificationsSchema } from "@/modules/verifikator-workspace/schema";
import { docStatusLabel, place } from "../dataset.server";
import { status, uniq } from "../format";
import type { P47Application, P47Finding, P47Warehouse, Status } from "../types";
import type { IndustriAnalysis, IndustriDataset, IndustriLine, IndustriModuleKey, IndustriPartner, IndustriValue } from "./types";

const SEVERITY = { MINOR: "Minor", MAJOR: "Major", CRITICAL: "Critical" } as const;
const MODULES: IndustriModuleKey[] = ["rencana", "penyimpanan", "modal"];
const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};
const decision = (s: string | undefined): Status =>
  s === "SESUAI" ? status("Sesuai", "ok") : s === "TIDAK_SESUAI" ? status("Tidak Sesuai", "bad") : status("Belum Dianalisis", "na");

function areaOfKey(key: string): string {
  if (key.startsWith("location:")) return "Dokumen Lokasi";
  if (key.startsWith("partner")) return "Dokumen Partner Industri";
  return "Dokumen Permohonan";
}

/**
 * Every VIU Bahan Baku Industri application of the period (drafts and withdrawn ones excluded), flattened
 * into the report dataset. An application belongs to the period of its LHVIU Tanggal Terbit when the
 * Project Manager recorded one, otherwise to the period of its Tanggal Pengajuan — the same rule as the
 * Barang Konsumsi report. Nothing is invented: a figure the system does not hold stays empty.
 */
export async function buildIndustriDataset(period: { from: string; to: string }): Promise<IndustriDataset> {
  const rows = await db.application.findMany({
    where: { verificationType: "VIU", status: { notIn: ["DRAFT", "WITHDRAWN"] } },
    include: {
      company: true,
      locationVisits: { select: { id: true, locationType: true, address: true, companyLocationId: true, officeVerification: true, warehouseVerification: true, findings: true, reportVerification: true } },
      assignments: {
        select: {
          scheduleType: true, technicalAnalysisData: true, productVerifications: true,
          surveyor: { select: { name: true } }, verifikator: { select: { name: true } }, technicalReviewer: { select: { name: true } },
        },
      },
    },
  });
  const industri = rows.filter((a) => (a.payload as ApplicationWizardValues).importTypes?.[0] === "BAHAN_BAKU_INDUSTRI");
  const industriIds = industri.map((a) => a.id);
  const lhviuRows = industriIds.length
    ? await db.$queryRaw<{ id: string; lhviuDocument: unknown }[]>`SELECT "id", "lhviuDocument" FROM "application" WHERE "id" = ANY(${industriIds})`
    : [];
  const lhviuById = new Map(lhviuRows.map((r) => [r.id, r.lhviuDocument as { path?: string; fileName?: string; uploadedAt?: string; number?: string; issuedAt?: string } | null]));
  const inScope = industri.filter((a) => {
    const lhviu = lhviuById.get(a.id);
    const issuedAt = lhviu?.path && typeof lhviu.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lhviu.issuedAt) ? lhviu.issuedAt : null;
    const day = issuedAt ?? assignmentDateKey(effectiveSubmissionDate(a).value);
    return day >= period.from && day <= period.to;
  });
  const ids = inScope.map((a) => a.id);

  const docVersions = ids.length
    ? await db.applicationDocumentVersion.findMany({
        where: { applicationId: { in: ids } },
        orderBy: { version: "desc" },
        select: { applicationId: true, fieldKey: true, verificationStatus: true, rejectionNote: true, verifiedBy: { select: { name: true } } },
      })
    : [];
  const latestDoc = new Map<string, (typeof docVersions)[number]>();
  for (const v of docVersions) if (!latestDoc.has(`${v.applicationId}|${v.fieldKey}`)) latestDoc.set(`${v.applicationId}|${v.fieldKey}`, v);

  const partnerIds = uniq(inScope.flatMap((a) => ((a.payload as ApplicationWizardValues).partnerIndustriEntries ?? []).filter((e) => e.enabled).map((e) => e.partnerId)));
  const partnerRows = partnerIds.length
    ? await db.partner.findMany({ where: { id: { in: partnerIds } }, include: { company: { select: { companyName: true, nibNumber: true } } } })
    : [];
  const partnerById = new Map(partnerRows.map((p) => [p.id, p]));

  const applications: P47Application[] = [];
  const lines: IndustriLine[] = [];
  const warehouses: P47Warehouse[] = [];
  const analysis: IndustriAnalysis[] = [];
  const values: IndustriValue[] = [];
  const findings: P47Finding[] = [];
  const partners = new Map<string, IndustriPartner>();

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
      lhviu: lhviu?.path
        ? {
            path: lhviu.path, fileName: lhviu.fileName ?? "LHVIU.pdf", uploadedAt: lhviu.uploadedAt ?? "",
            number: typeof lhviu.number === "string" && lhviu.number.trim() ? lhviu.number.trim() : null,
            issuedAt: typeof lhviu.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lhviu.issuedAt) ? lhviu.issuedAt : null,
          }
        : null,
      kantor: locs.find((l) => l.locationType === "KANTOR") ? place(locs.find((l) => l.locationType === "KANTOR"), a.locationVisits) : null,
      gudang: locs.filter((l) => l.locationType === "GUDANG").map((l) => place(l, a.locationVisits)),
    });

    // Partner Industri of this application -------------------------------------------------------
    const entries = (payload.partnerIndustriEntries ?? []).filter((e) => e.enabled);
    const nameOf = (partnerId: string) => partnerById.get(partnerId)?.company.companyName ?? "Partner tidak ditemukan";
    for (const e of entries) {
      const row = partnerById.get(e.partnerId);
      const entry = partners.get(e.partnerId) ?? {
        id: e.partnerId, name: nameOf(e.partnerId), nib: row?.company.nibNumber ?? "", type: row?.type ?? "",
        contractNumber: row?.contractNumber ?? "", contractEnd: row?.contractEndDate ? row.contractEndDate.toISOString().slice(0, 10) : "", uses: [],
      };
      entry.uses.push({
        applicationId: a.id, applicationNumber: a.applicationNumber, company, lhvki: e.lhvki?.trim() ?? "", lhvkiPath: e.lhvkiDocumentPath?.trim() || null,
        lines: (payload.products ?? []).filter((p) => p.partnerIndustriId === e.partnerId).length,
      });
      partners.set(e.partnerId, entry);
    }

    // Bahan baku / penolong ------------------------------------------------------------------------
    const products = payload.products ?? [];
    for (const p of products) {
      lines.push({
        id: `${a.id}:${p.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company,
        material: p.materialType?.trim() || p.deskripsi?.trim() || "—", hs: p.hsCode?.trim() ?? "", hsDescription: p.hsDesc?.trim() ?? "",
        quantity: num(p.estimatedVolume) ?? 0, unit: p.volumeUnit?.trim() ?? "", intendedUse: p.intendedUse?.trim() ?? "",
        partnerId: p.partnerIndustriId ?? "", partnerName: p.partnerIndustriId ? nameOf(p.partnerIndustriId) : "—",
      });
    }

    // Gudang: TA's Kapasitas Gudang figures belong to the application, shown on its first gudang
    const penyimpanan = taData.penyimpanan;
    locs.filter((l) => l.locationType === "GUDANG").forEach((l, i) => {
      warehouses.push({
        id: `${a.id}:${l.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, place: place(l),
        capacity: i === 0 ? num(penyimpanan?.inputs?.kapasitasGudang) : null,
        analystStock: i === 0 ? num(penyimpanan?.inputs?.stokTerkini) : null,
        analystPlan: i === 0 ? num(penyimpanan?.inputs?.rencanaImpor) : null,
        declaredStock: {},
        analystDecision: penyimpanan?.status === "SESUAI" ? "Sesuai" : penyimpanan?.status === "TIDAK_SESUAI" ? "Tidak Sesuai" : "Belum Dianalisis",
      });
    });

    // Analisis Teknis per module ----------------------------------------------------------------------
    for (const key of MODULES) {
      const d = taData[key];
      analysis.push({
        applicationId: a.id, applicationNumber: a.applicationNumber, company, moduleKey: key,
        module: TECHNICAL_MODULE_NAV_LABELS[key as TechnicalModuleKey], status: decision(d?.status), conclusion: d?.kesimpulan?.trim() || d?.keterangan?.trim() || "",
      });
    }
    const modal = taData.modal;
    values.push({
      applicationId: a.id, applicationNumber: a.applicationNumber, company,
      nilaiImpor: num(modal?.inputs?.nilaiImpor), modalKerja: statementAmount(payload.nonIndustriDocuments), decision: decision(modal?.status),
    });

    // Temuan ------------------------------------------------------------------------------------------
    for (const v of a.locationVisits) {
      const verdict = (v.reportVerification as { decision?: string | null } | null)?.decision;
      const st = verdict === "VERIFIED" ? status("Ditinjau Verifikator", "ok") : verdict === "REVISION" ? status("Revisi Diminta", "warn") : verdict === "REJECTED" ? status("Ditolak", "bad") : status("Belum Ditinjau", "warn");
      for (const f of (v.findings as { id: string; title: string; severity: keyof typeof SEVERITY; description: string }[] | null) ?? []) {
        findings.push({
          key: `survey:${v.id}:${f.id}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Survei Lapangan",
          area: `Survei ${v.locationType === "KANTOR" ? "Kantor" : v.locationType === "GUDANG" ? "Gudang" : "Pabrik"}`,
          text: f.description ? `${f.title} — ${f.description}` : f.title, severity: SEVERITY[f.severity] ?? "Minor", status: st, followUp: "—", pic: survey?.surveyor?.name ?? "—",
        });
      }
    }
    for (const [docKey, v] of latestDoc) {
      if (!docKey.startsWith(`${a.id}|`) || (v.verificationStatus !== "REJECTED" && v.verificationStatus !== "NEED_REVISION")) continue;
      findings.push({
        key: `doc:${docKey}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Verifikasi Dokumen", area: areaOfKey(v.fieldKey),
        text: v.rejectionNote || `Dokumen ${v.fieldKey} ${v.verificationStatus === "REJECTED" ? "ditolak" : "perlu revisi"}`,
        severity: v.verificationStatus === "REJECTED" ? "Major" : "Minor", status: docStatusLabel(v.verificationStatus), followUp: "Unggah dokumen perbaikan", pic: v.verifiedBy?.name ?? dokumen?.verifikator?.name ?? "—",
      });
    }
    for (const [module, d] of Object.entries(taData)) {
      if (d.status !== "TIDAK_SESUAI") continue;
      findings.push({
        key: `ta:${a.id}:${module}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Analisis Teknis",
        area: TECHNICAL_MODULE_NAV_LABELS[module as TechnicalModuleKey] ?? module, text: d.kesimpulan || d.keterangan || "Modul dinyatakan Tidak Sesuai",
        severity: "Major", status: status("Tidak Sesuai", "bad"), followUp: "—", pic: tech?.technicalReviewer?.name ?? "—",
      });
    }
    const pv = productVerificationsSchema.safeParse(dokumen?.productVerifications ?? {});
    for (const [productId, d] of Object.entries(pv.success ? pv.data : {})) {
      if (d.status !== "NEED_REVISION" && d.status !== "REJECTED") continue;
      const product = products.find((p) => p.id === productId);
      findings.push({
        key: `product:${a.id}:${productId}`, applicationId: a.id, applicationNumber: a.applicationNumber, company, source: "Verifikasi Produk",
        area: "Product Information", text: `${product?.materialType ?? productId}${d.note ? ` — ${d.note}` : ""}`,
        severity: d.status === "REJECTED" ? "Major" : "Minor", status: d.status === "REJECTED" ? status("Ditolak", "bad") : status("Perlu Revisi", "warn"), followUp: "—", pic: dokumen?.verifikator?.name ?? "—",
      });
    }
  }

  return { period, generatedAt: new Date().toISOString(), applications, lines, partners: [...partners.values()], analysis, warehouses, values, findings };
}
