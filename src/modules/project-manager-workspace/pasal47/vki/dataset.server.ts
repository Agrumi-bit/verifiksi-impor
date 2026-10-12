import "server-only";

import { db } from "@/lib/db";
import { assignmentDateKey } from "@/lib/assignment-date";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { TECHNICAL_MODULE_NAV_LABELS, type TechnicalModuleKey } from "@/modules/technical-analyst-workspace/status";
import { productVerificationsSchema } from "@/modules/verifikator-workspace/schema";
import { docStatusLabel, place } from "../dataset.server";
import { status } from "../format";
import type { P47Finding, Status } from "../types";
import type { VkiAnalysis, VkiApplication, VkiCapacity, VkiDataset, VkiElectricity, VkiMachine, VkiMaterial, VkiModuleKey, VkiProduct, VkiWorkforce } from "./types";

const SEVERITY = { MINOR: "Minor", MAJOR: "Major", CRITICAL: "Critical" } as const;
const MODULES: VkiModuleKey[] = ["listrik", "kapasitas", "bahanbaku"];
const num = (v: string | undefined | null) => {
  const s = String(v ?? "").trim();
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return s !== "" && Number.isFinite(n) ? n : null;
};
const decision = (s: string | undefined): Status =>
  s === "SESUAI" ? status("Sesuai", "ok") : s === "TIDAK_SESUAI" ? status("Tidak Sesuai", "bad") : status("Belum Dianalisis", "na");
const CATEGORY = { BAHAN_BAKU: "Bahan Baku", BAHAN_PENOLONG: "Bahan Penolong" } as const;

function areaOfKey(key: string): string {
  if (key.startsWith("location:")) return "Dokumen Lokasi";
  if (key.startsWith("vki") || key.includes("listrik") || key.includes("tenaga")) return "Dokumen Pendukung VKI";
  return "Dokumen Permohonan";
}

/**
 * Every VKI application of the period (drafts and withdrawn ones excluded), flattened into the report
 * dataset. An application belongs to the period of its LHVKI Tanggal Terbit when the Project Manager
 * recorded one (LHVKI tab), otherwise to the period of its Tanggal Pengajuan — the same rule as the VIU
 * reports. Nothing is invented: a figure the system does not hold stays empty.
 */
export async function buildVkiDataset(period: { from: string; to: string }): Promise<VkiDataset> {
  const rows = await db.application.findMany({
    where: { verificationType: "VKI", status: { notIn: ["DRAFT", "WITHDRAWN"] } },
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
  // The LHVKI is stored like the LHVIU (Application.lhviuDocument, read with SQL — lhviu-store.ts).
  const allIds = rows.map((a) => a.id);
  const docRows = allIds.length
    ? await db.$queryRaw<{ id: string; lhviuDocument: unknown }[]>`SELECT "id", "lhviuDocument" FROM "application" WHERE "id" = ANY(${allIds})`
    : [];
  const lhvkiById = new Map(docRows.map((r) => [r.id, r.lhviuDocument as { path?: string; fileName?: string; uploadedAt?: string; number?: string; issuedAt?: string } | null]));
  const issuedOf = (id: string) => {
    const l = lhvkiById.get(id);
    return l?.path && typeof l.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.issuedAt) ? l.issuedAt : null;
  };
  const inScope = rows.filter((a) => {
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

  const applications: VkiApplication[] = [];
  const products: VkiProduct[] = [];
  const capacities: VkiCapacity[] = [];
  const materials: VkiMaterial[] = [];
  const machines: VkiMachine[] = [];
  const workforce: VkiWorkforce[] = [];
  const electricity: VkiElectricity[] = [];
  const analysis: VkiAnalysis[] = [];
  const findings: P47Finding[] = [];

  for (const a of inScope) {
    const payload = a.payload as ApplicationWizardValues;
    const company = a.company?.companyName ?? payload.companyName ?? "—";
    const liveLocations = (a.company?.locations as LocationValues[] | null) ?? [];
    const locs = (payload.locations ?? []).map((loc) => liveLocations.find((l) => l.id === loc.companyLocationId) ?? loc);
    const kbliEntries = (a.company?.kbliEntries as { code: string; description: string; category?: "UTAMA" | "PENDUKUNG" }[] | null) ?? payload.kbliEntries ?? [];
    const survey = a.assignments.find((x) => x.scheduleType === "survey");
    const dokumen = a.assignments.find((x) => x.scheduleType === "dokumen");
    const tech = a.assignments.find((x) => x.scheduleType === "technical");
    const ta = technicalAnalysisDataSchema.safeParse(tech?.technicalAnalysisData ?? {});
    const taData = ta.success ? ta.data : {};
    const ref = { applicationId: a.id, applicationNumber: a.applicationNumber, company };
    const byType = (t: string) => locs.filter((l) => l.locationType === t).map((l) => place(l, a.locationVisits));

    applications.push({
      id: a.id, applicationNumber: a.applicationNumber, companyId: a.companyId, company,
      nib: a.company?.nibNumber ?? payload.nibNumber ?? "",
      kbli: splitKbliEntries(kbliEntries).utama.map((k) => ({ code: k.code, description: k.description })),
      submittedAt: assignmentDateKey(effectiveSubmissionDate(a).value),
      status: a.status,
      lhviu: lhvkiById.get(a.id)?.path
        ? {
            path: lhvkiById.get(a.id)!.path!, fileName: lhvkiById.get(a.id)!.fileName ?? "LHVKI.pdf", uploadedAt: lhvkiById.get(a.id)!.uploadedAt ?? "",
            number: typeof lhvkiById.get(a.id)!.number === "string" && lhvkiById.get(a.id)!.number!.trim() ? lhvkiById.get(a.id)!.number!.trim() : null,
            issuedAt: issuedOf(a.id),
          }
        : null,
      kantor: byType("KANTOR")[0] ?? null, gudang: byType("GUDANG"), pabrik: byType("PABRIK"),
    });

    // Produk, produksi dan penjualan ------------------------------------------------------------------
    const productList = payload.products ?? [];
    for (const p of productList) {
      const qty = (payload.productionQty ?? []).find((q) => q.productId === p.id);
      const sale = (payload.sales ?? []).find((s) => s.productId === p.id);
      products.push({
        ...ref, id: `${a.id}:${p.id}`, category: p.kategori?.trim() ?? "", name: p.materialType?.trim() || p.deskripsi?.trim() || "—", hs: p.hsCode?.trim() ?? "", hsDescription: p.hsDesc?.trim() ?? "",
        producedLastYear: num(qty?.perTahunSebelumnya), plannedProduction: num(qty?.perTahunRencana), productionUnit: qty?.satuan?.trim() ?? "",
        salesDomestic: num(sale?.dalamNegeri), salesExport: num(sale?.luarNegeri), exportDestination: sale?.negaraTujuan?.trim() ?? "", salesUnit: sale?.satuan?.trim() ?? "",
      });
    }
    for (const c of payload.capacity ?? []) {
      capacities.push({ ...ref, product: c.jenisProduk?.trim() || "—", kbli: [c.kbliCode, c.kbliDescription].filter(Boolean).join(" · "), basis: c.berdasarkanIzin?.trim() ?? "", capacity: num(c.kapasitasTerpasang), unit: c.satuan?.trim() ?? "" });
    }

    // Bahan baku/penolong -----------------------------------------------------------------------------
    for (const m of payload.rawMaterials ?? []) {
      const usage = (payload.rawMaterialUsage ?? []).find((u) => u.rawMaterialId === m.id);
      const kinds = [...new Set((payload.rawMaterialConversions ?? []).filter((c) => c.rawMaterialId === m.id && c.kategori).map((c) => CATEGORY[c.kategori!]))];
      const domestic = num(usage?.rencanaKebutuhanDalamNegeri);
      const imported = num(usage?.rencanaKebutuhanLuarNegeri);
      materials.push({
        ...ref, id: `${a.id}:${m.id}`, name: m.jenis?.trim() || m.deskripsi?.trim() || "—", hs: m.hsCode?.trim() ?? "", hsDescription: m.hsDesc?.trim() ?? "",
        category: kinds.join(" / "), use: usage?.penggunaan?.trim() ?? "", stock: num(usage?.dataStock),
        needDomestic: domestic, needImport: imported, needTotal: num(usage?.rencanaKebutuhan) ?? (domestic !== null || imported !== null ? (domestic ?? 0) + (imported ?? 0) : null),
        importCountry: usage?.rencanaKebutuhanNegaraAsal?.trim() ?? "", unit: usage?.satuan?.trim() ?? "",
      });
    }

    // Mesin, tenaga kerja, listrik ----------------------------------------------------------------------
    for (const m of payload.machines ?? []) {
      machines.push({
        ...ref, name: m.nama?.trim() || "—", brand: [m.merk, m.model].filter(Boolean).join(" ").trim(), year: m.tahun?.trim() ?? "", count: num(m.jumlah) ?? 1, process: m.proses?.trim() ?? "",
        capacity: num(m.kapasitas), capacityUnit: m.kapasitasSatuan?.trim() ?? "", condition: m.kondisi === "AKTIF" ? "Aktif" : m.kondisi === "TIDAK_AKTIF" ? "Tidak Aktif" : "",
        power: num(m.power), powerUnit: m.powerSatuan?.trim() ?? "",
      });
    }
    for (const t of payload.tenagaKerjaEntries ?? []) {
      const count = num(t.jumlah);
      if (count !== null) workforce.push({ ...ref, category: t.kategori?.trim() || "Tidak diisi", count });
    }
    for (const e of payload.electricityMonths ?? []) electricity.push({ ...ref, month: e.bulan?.trim() ?? "", kwh: num(e.kwh), nominal: num(e.nominal) });

    // Analisis Teknis per module ----------------------------------------------------------------------
    for (const key of MODULES) {
      const d = taData[key];
      analysis.push({ ...ref, moduleKey: key, module: TECHNICAL_MODULE_NAV_LABELS[key as TechnicalModuleKey], status: decision(d?.status), conclusion: d?.kesimpulan?.trim() || d?.keterangan?.trim() || "" });
    }

    // Temuan ------------------------------------------------------------------------------------------
    for (const v of a.locationVisits) {
      const verdict = (v.reportVerification as { decision?: string | null } | null)?.decision;
      const st = verdict === "VERIFIED" ? status("Ditinjau Verifikator", "ok") : verdict === "REVISION" ? status("Revisi Diminta", "warn") : verdict === "REJECTED" ? status("Ditolak", "bad") : status("Belum Ditinjau", "warn");
      for (const f of (v.findings as { id: string; title: string; severity: keyof typeof SEVERITY; description: string }[] | null) ?? []) {
        findings.push({
          ...ref, key: `survey:${v.id}:${f.id}`, source: "Survei Lapangan",
          area: `Survei ${v.locationType === "KANTOR" ? "Kantor" : v.locationType === "GUDANG" ? "Gudang" : "Pabrik"}`,
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
      const product = productList.find((p) => p.id === productId);
      findings.push({
        ...ref, key: `product:${a.id}:${productId}`, source: "Verifikasi Produk",
        area: "Data Produk", text: `${product?.materialType ?? productId}${d.note ? ` — ${d.note}` : ""}`,
        severity: d.status === "REJECTED" ? "Major" : "Minor", status: d.status === "REJECTED" ? status("Ditolak", "bad") : status("Perlu Revisi", "warn"), followUp: "—", pic: dokumen?.verifikator?.name ?? "—",
      });
    }
  }

  return { period, generatedAt: new Date().toISOString(), applications, products, capacities, materials, machines, workforce, electricity, analysis, findings };
}
