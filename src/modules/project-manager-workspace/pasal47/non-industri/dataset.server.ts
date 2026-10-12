import "server-only";

import { db } from "@/lib/db";
import { assignmentDateKey } from "@/lib/assignment-date";
import { NON_INDUSTRI_SUPPORT_DOC_DEFS } from "@/modules/applications/financial-capability-defs";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { statementAmount } from "@/modules/applications/viu-import-plan";
import { splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { TECHNICAL_MODULE_NAV_LABELS, type TechnicalModuleKey } from "@/modules/technical-analyst-workspace/status";
import { productVerificationsSchema } from "@/modules/verifikator-workspace/schema";
import { docStatusLabel, place } from "../dataset.server";
import { status } from "../format";
import type { P47Application, P47Finding, Status } from "../types";
import type { NonIndustriAnalysis, NonIndustriDataset, NonIndustriLine, NonIndustriModuleKey, NonIndustriNeed, NonIndustriValue, NonIndustriWarehouse } from "./types";

const SEVERITY = { MINOR: "Minor", MAJOR: "Major", CRITICAL: "Critical" } as const;
const MODULES: NonIndustriModuleKey[] = ["kebutuhanNonIndustri", "penyimpanan", "modal"];
const EVIDENCE_TITLE = new Map(NON_INDUSTRI_SUPPORT_DOC_DEFS.map((d) => [d.key, d.title]));
const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};
const decision = (s: string | undefined): Status =>
  s === "SESUAI" ? status("Sesuai", "ok") : s === "TIDAK_SESUAI" ? status("Tidak Sesuai", "bad") : status("Belum Dianalisis", "na");

function areaOfKey(key: string): string {
  if (key.startsWith("location:")) return "Dokumen Lokasi";
  if (key.startsWith("nonIndustri") || key.includes("modal")) return "Dokumen Kemampuan Finansial";
  return "Dokumen Permohonan";
}

/**
 * Every VIU Bahan Baku Non Industri application of the period (drafts and withdrawn ones excluded),
 * flattened into the report dataset. An application belongs to the period of its LHVIU Tanggal Terbit
 * when the Project Manager recorded one, otherwise to the period of its Tanggal Pengajuan — the same rule
 * as the Barang Konsumsi report. Nothing is invented: a figure the system does not hold stays empty.
 */
export async function buildNonIndustriDataset(period: { from: string; to: string }): Promise<NonIndustriDataset> {
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
  const nonIndustri = rows.filter((a) => (a.payload as ApplicationWizardValues).importTypes?.[0] === "BAHAN_BAKU_NON_INDUSTRI");
  const allIds = nonIndustri.map((a) => a.id);
  const lhviuRows = allIds.length
    ? await db.$queryRaw<{ id: string; lhviuDocument: unknown }[]>`SELECT "id", "lhviuDocument" FROM "application" WHERE "id" = ANY(${allIds})`
    : [];
  const lhviuById = new Map(lhviuRows.map((r) => [r.id, r.lhviuDocument as { path?: string; fileName?: string; uploadedAt?: string; number?: string; issuedAt?: string } | null]));
  const issuedOf = (id: string) => {
    const l = lhviuById.get(id);
    return l?.path && typeof l.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.issuedAt) ? l.issuedAt : null;
  };
  const inScope = nonIndustri.filter((a) => {
    const day = issuedOf(a.id) ?? assignmentDateKey(effectiveSubmissionDate(a).value);
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

  const applications: P47Application[] = [];
  const lines: NonIndustriLine[] = [];
  const needs: NonIndustriNeed[] = [];
  const warehouses: NonIndustriWarehouse[] = [];
  const analysis: NonIndustriAnalysis[] = [];
  const values: NonIndustriValue[] = [];
  const findings: P47Finding[] = [];

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
    const ref = { applicationId: a.id, applicationNumber: a.applicationNumber, company };
    const gudangLocs = locs.filter((l) => l.locationType === "GUDANG");

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
            issuedAt: issuedOf(a.id),
          }
        : null,
      kantor: locs.find((l) => l.locationType === "KANTOR") ? place(locs.find((l) => l.locationType === "KANTOR"), a.locationVisits) : null,
      gudang: gudangLocs.map((l) => place(l, a.locationVisits)),
    });

    // Bahan baku / penolong ------------------------------------------------------------------------
    const products = payload.products ?? [];
    for (const p of products) {
      lines.push({
        ...ref, id: `${a.id}:${p.id}`,
        material: p.materialType?.trim() || p.deskripsi?.trim() || "—", hs: p.hsCode?.trim() ?? "", hsDescription: p.hsDesc?.trim() ?? "",
        quantity: num(p.estimatedVolume) ?? 0, unit: p.volumeUnit?.trim() ?? "", intendedUse: p.intendedUse?.trim() ?? "",
      });
    }

    // Kebutuhan Mitra Non Industri (TA) -----------------------------------------------------------------
    const need = taData.kebutuhanNonIndustri;
    needs.push({
      ...ref, hs: need?.inputs?.hsCode?.trim() ?? "",
      contractNeed: num(need?.inputs?.kebutuhanKontrak), stock: num(need?.inputs?.stokTerkini), requested: num(need?.inputs?.rencanaImpor), status: decision(need?.status),
    });

    // Gudang: surveyor's luas/kapasitas per gudang; TA's Kapasitas Gudang figures on the first gudang ---
    const penyimpanan = taData.penyimpanan;
    gudangLocs.forEach((l, i) => {
      const p = place(l, a.locationVisits);
      warehouses.push({
        ...ref, id: `${a.id}:${l.id ?? i}`, city: p.city, province: p.province, ownership: p.ownership,
        area: p.area ?? null, capacity: p.capacity ?? null,
        analystCapacity: i === 0 ? num(penyimpanan?.inputs?.kapasitasGudang) : null,
        analystStock: i === 0 ? num(penyimpanan?.inputs?.stokTerkini) : null,
        analystPlan: i === 0 ? num(penyimpanan?.inputs?.rencanaImpor) : null,
        analystDecision: decision(penyimpanan?.status),
      });
    });

    // Analisis Teknis per module ----------------------------------------------------------------------
    for (const key of MODULES) {
      const d = taData[key];
      analysis.push({
        ...ref, moduleKey: key, module: TECHNICAL_MODULE_NAV_LABELS[key as TechnicalModuleKey], status: decision(d?.status),
        conclusion: d?.kesimpulan?.trim() || d?.keterangan?.trim() || "",
      });
    }
    const modal = taData.modal;
    values.push({
      ...ref, nilaiImpor: num(modal?.inputs?.nilaiImpor), modalKerja: statementAmount(payload.nonIndustriDocuments),
      evidence: (payload.nonIndustriDocuments ?? []).filter((d) => d.enabled && EVIDENCE_TITLE.has(d.key)).map((d) => EVIDENCE_TITLE.get(d.key)!),
      decision: decision(modal?.status),
    });

    // Temuan ------------------------------------------------------------------------------------------
    for (const v of a.locationVisits) {
      const verdict = (v.reportVerification as { decision?: string | null } | null)?.decision;
      const st = verdict === "VERIFIED" ? status("Ditinjau Verifikator", "ok") : verdict === "REVISION" ? status("Revisi Diminta", "warn") : verdict === "REJECTED" ? status("Ditolak", "bad") : status("Belum Ditinjau", "warn");
      for (const f of (v.findings as { id: string; title: string; severity: keyof typeof SEVERITY; description: string }[] | null) ?? []) {
        findings.push({
          ...ref, key: `survey:${v.id}:${f.id}`, source: "Survei Lapangan",
          area: `Survei ${v.locationType === "KANTOR" ? "Kantor" : v.locationType === "GUDANG" ? "Gudang" : "Lokasi"}`,
          text: f.description ? `${f.title} — ${f.description}` : f.title, severity: SEVERITY[f.severity] ?? "Minor", status: st, followUp: "—", pic: survey?.surveyor?.name ?? "—",
        });
      }
    }
    for (const [docKey, v] of latestDoc) {
      if (!docKey.startsWith(`${a.id}|`) || (v.verificationStatus !== "REJECTED" && v.verificationStatus !== "NEED_REVISION")) continue;
      findings.push({
        ...ref, key: `doc:${docKey}`, source: "Verifikasi Dokumen", area: areaOfKey(v.fieldKey),
        text: v.rejectionNote || `Dokumen ${v.fieldKey} ${v.verificationStatus === "REJECTED" ? "ditolak" : "perlu revisi"}`,
        severity: v.verificationStatus === "REJECTED" ? "Major" : "Minor", status: docStatusLabel(v.verificationStatus), followUp: "Unggah dokumen perbaikan", pic: v.verifiedBy?.name ?? dokumen?.verifikator?.name ?? "—",
      });
    }
    for (const [module, d] of Object.entries(taData)) {
      if (d.status !== "TIDAK_SESUAI") continue;
      findings.push({
        ...ref, key: `ta:${a.id}:${module}`, source: "Analisis Teknis",
        area: TECHNICAL_MODULE_NAV_LABELS[module as TechnicalModuleKey] ?? module, text: d.kesimpulan || d.keterangan || "Modul dinyatakan Tidak Sesuai",
        severity: "Major", status: status("Tidak Sesuai", "bad"), followUp: "—", pic: tech?.technicalReviewer?.name ?? "—",
      });
    }
    const pv = productVerificationsSchema.safeParse(dokumen?.productVerifications ?? {});
    for (const [productId, d] of Object.entries(pv.success ? pv.data : {})) {
      if (d.status !== "NEED_REVISION" && d.status !== "REJECTED") continue;
      const product = products.find((p) => p.id === productId);
      findings.push({
        ...ref, key: `product:${a.id}:${productId}`, source: "Verifikasi Produk",
        area: "Product Information", text: `${product?.materialType ?? productId}${d.note ? ` — ${d.note}` : ""}`,
        severity: d.status === "REJECTED" ? "Major" : "Minor", status: d.status === "REJECTED" ? status("Ditolak", "bad") : status("Perlu Revisi", "warn"), followUp: "—", pic: dokumen?.verifikator?.name ?? "—",
      });
    }
  }

  return { period, generatedAt: new Date().toISOString(), applications, lines, needs, analysis, warehouses, values, findings };
}
