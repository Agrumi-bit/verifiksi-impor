import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { complianceSummary, totalRequirements } from "./consolidation";
import { caseStepsOf, requirementWeights, requirementsOf, stepOfRequirement } from "./requirements";
import { schemeOfApplication } from "./scheme";
import { buildAnalisisStage, buildBahanBakuStage, buildListrikStage, buildKapasitasStage, buildMesinStage, buildPenjualanStage, buildProdukStage } from "./vki-stages";
import { deriveWorkspaceStatuses, workspaceKeysOf, type AssignmentForWorkspaceStatus } from "./workspace-status";

function assignment(overrides: Partial<AssignmentForWorkspaceStatus>): AssignmentForWorkspaceStatus {
  return { scheduleType: "dokumen", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED", ...overrides };
}

const DONE = [
  assignment({ scheduleType: "dokumen" }),
  assignment({ scheduleType: "survey", status: "SUBMITTED" }),
  assignment({ scheduleType: "technical", status: "SUBMITTED", pmReviewStatus: null }),
];

describe("schemeOfApplication", () => {
  it("covers VKI and VIU Konsumsi (by its first import type) only", () => {
    assert.equal(schemeOfApplication("VKI", []), "vki");
    assert.equal(schemeOfApplication("VIU", ["BARANG_KONSUMSI"]), "konsumsi");
    assert.equal(schemeOfApplication("VIU", ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"]), null);
    assert.equal(schemeOfApplication("VIU", []), null);
  });
});

describe("workspaces per scheme", () => {
  it("gives VKI a Technical Analyst that must complete before handover", () => {
    const statuses = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: DONE, lhviuIssued: false, scheme: "vki" });
    assert.deepEqual(workspaceKeysOf(statuses), ["CR", "SV", "VF", "TA", "PM"]);
    assert.equal(statuses.TA, "IN_PROGRESS");
  });

  it("leaves the Technical Analyst out of VIU Konsumsi", () => {
    const statuses = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: DONE, lhviuIssued: false });
    assert.deepEqual(workspaceKeysOf(statuses), ["CR", "SV", "VF", "PM"]);
    assert.equal(statuses.TA, undefined);
    assert.equal(statuses.PM, "IN_PROGRESS");
  });
});

describe("VKI requirements and stages", () => {
  it("has 16 stages: Produk, Alur Proses Produksi, Pemakaian Listrik, then Data Mesin, Kapasitas Produksi, Kebutuhan Bahan Baku and Penjualan, Analisis Teknis from the Technical Analyst", () => {
    const steps = caseStepsOf("vki");
    assert.equal(steps.length, 16);
    assert.equal(steps[4].label, "Produk");
    assert.equal(steps[5].label, "Alur Proses Produksi");
    assert.equal(steps[6].label, "Pemakaian Listrik");
    assert.equal(steps[7].label, "Data Mesin");
    assert.equal(steps[8].label, "Kapasitas Produksi");
    assert.equal(steps[9].label, "Kebutuhan Bahan Baku");
    assert.equal(steps[10].label, "Penjualan Dalam Negeri & Ekspor");
    assert.equal(steps[13].label, "Analisis Teknis");
    assert.equal(steps[13].source, "TA");
    assert.equal(steps[15].label, "LHVKI");
  });

  it("traces each VKI requirement on its own stage and weighs one per row", () => {
    assert.equal(stepOfRequirement("kapasitas", "vki"), 14);
    assert.equal(stepOfRequirement("penjualan", "vki"), 11);
    assert.equal(stepOfRequirement("kebutuhanBahanBaku", "vki"), 10);
    assert.equal(stepOfRequirement("produk", "vki"), 5);
    assert.equal(stepOfRequirement("produksi", "vki"), 6);
    assert.equal(stepOfRequirement("listrik", "vki"), 7);
    assert.equal(stepOfRequirement("jumlahProduksi", "vki"), 9);
    assert.equal(stepOfRequirement("mesin", "vki"), 8);
    assert.equal(stepOfRequirement("pajak", "vki"), 3);
    assert.equal(stepOfRequirement("kantor", "konsumsi"), 3);
    const weights = requirementWeights("vki");
    assert.equal(weights.TA, 3);
    assert.equal(totalRequirements("vki"), requirementsOf("vki").length + 2);
  });

  it("scores a VKI case over its own requirements", () => {
    const statuses = deriveWorkspaceStatuses({ applicationStatus: "COMPLETED", returnedByRole: null, assignments: DONE, lhviuIssued: true, scheme: "vki" });
    const summary = complianceSummary(statuses, [], { finalReviewDone: false, dossierComplete: false, lhviuIssuedAt: "2026-08-26", scheme: "vki" });
    assert.equal(summary.total, requirementsOf("vki").length);
    assert.equal(summary.pending, 3);
  });
});

describe("buildMesinStage", () => {
  it("computes capacity and power as the Verifikator and Technical Analyst do, and marks the bottleneck", () => {
    const machine = (id: string, nama: string, jumlah: string, perJam: string, power: string) => ({
      id, nama, proses: "Jahit", merk: "", model: "", tahun: "", quantity: jumlah, quantitySatuan: "Pcs", kapasitas: "", kapasitasSatuan: "",
      kapasitasJam: perJam, kapasitasJamSatuan: "Pasang", waktuBeroperasi: "8",
      kapasitasPerHari: String(Number(jumlah) * Number(perJam) * 8), hariEfektifPerTahun: "300",
      kapasitasPerTahun: String(Number(jumlah) * Number(perJam) * 8 * 300), kondisi: "AKTIF" as const, power, powerSatuan: "kW", input: "", output: "", photoMesinPath: null,
    });
    const stage = buildMesinStage({
      submittedAt: null, sales: [], documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], capacity: [], productionQty: [], productionQtyStatuses: {}, rawMaterialUsage: [], electricity: [], workforce: [], statements: [], modules: {},
      machines: [machine("a", "Mesin A", "2", "10", "1,5"), machine("b", "Mesin B", "1", "5", "0,5")],
    });
    assert.equal(stage.totalUnits, 3);
    assert.equal(stage.line.machine, "Mesin B");
    assert.equal(stage.capacity.find((row) => row.isBottleneck)?.name, "Mesin B");
    assert.equal(stage.power[0].totalPower, "3 kW");
    assert.equal(stage.power[0].perDay, "24 kWh");
    assert.equal(stage.totalPower, "3,5 kW");
  });
});

describe("buildKapasitasStage", () => {
  it("shows licensed capacity, last year's production and next year's plan with growth and the Verifikator's decisions", () => {
    const qty = (section: "sebelumnya" | "rencana", productId: string, jumlah: string) => ({
      key: `${section}:${productId}`, section, productId, jenisProduk: `Produk ${productId}`, deskripsiProduk: "", hsCode: "6403", jumlah, satuan: "Pasang",
    });
    const stage = buildKapasitasStage({
      submittedAt: null, sales: [], documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], rawMaterialUsage: [], electricity: [], workforce: [], statements: [], modules: {}, machines: [],
      capacity: [{ id: "c1", jenisProduk: "Sepatu", kbliCode: "15201", kbliDescription: "", berdasarkanIzin: "1.500.000", kapasitasTerpasang: "1.000.000", satuan: "Pasang" }],
      productionQty: [qty("sebelumnya", "a", "100"), qty("rencana", "a", "120"), qty("sebelumnya", "b", "50"), qty("rencana", "b", "50")],
      productionQtyStatuses: {
        "sebelumnya:a": { status: "SESUAI", keterangan: null, kesimpulan: null },
        "summary:rencana": { status: "MEMENUHI", keterangan: null, kesimpulan: "Rencana wajar" },
      },
    });
    assert.equal(stage.licensed[0].kbli, "15201");
    assert.equal(stage.licensed[0].utilisation, "66,67%");
    assert.equal(stage.previous.total, "150 Pasang");
    assert.equal(stage.previous.rows[0].verdict.tone, "green");
    assert.equal(stage.previous.rows[1].verdict.tone, "slate");
    assert.equal(stage.plan.rows[0].growth, "+20%");
    assert.equal(stage.plan.rows[1].growth, "+0%");
    assert.equal(stage.plan.conclusion, "Rencana wajar");
    assert.deepEqual(
      stage.checks.map((item) => [item.verdict.label, item.regulation]),
      [
        ["Sesuai", "Pasal 30 ayat (2) huruf a angka 1"],
        ["Belum Diperiksa", "Pasal 30 ayat (2) huruf a angka 2"],
        ["Memenuhi", "Pasal 30 ayat (2) huruf a angka 4"],
      ],
    );
  });
});

describe("buildBahanBakuStage", () => {
  it("counts a raw material used for several products once and carries the Verifikator's decisions", () => {
    const row = (id: string, rawMaterialId: string, productName: string) => ({
      id, rawMaterialId, jenis: `Bahan ${rawMaterialId}`, hsCode: "5407", hsDesc: "", deskripsi: "", productId: productName, productName, conversionId: null,
      penggunaan: "1.000", dataStock: "200", rencanaKebutuhan: "", rencanaKebutuhanDalamNegeri: "300", rencanaKebutuhanLuarNegeri: "900", rencanaKebutuhanNegaraAsal: "China", satuan: "Meter",
    });
    const stage = buildBahanBakuStage({
      submittedAt: null, sales: [], documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], capacity: [], productionQty: [], electricity: [], workforce: [], statements: [], modules: {}, machines: [],
      rawMaterialUsage: [row("r1", "a", "Boots"), row("r2", "a", "Loafers"), row("r3", "b", "Boots")],
      productionQtyStatuses: {
        "penggunaan-row:r1": { status: "SESUAI", keterangan: null, kesimpulan: null },
        "summary:stok": { status: "MEMENUHI", keterangan: null, kesimpulan: "Stok cukup" },
      },
    });
    assert.equal(stage.usage.rows.length, 3);
    assert.equal(stage.usage.total, "2.000 Meter");
    assert.equal(stage.usage.rows[0].verdict.tone, "green");
    assert.equal(stage.stock.total, "400 Meter");
    assert.equal(stage.stock.conclusion, "Stok cukup");
    assert.equal(stage.plan.rows[0].quantity, 1200);
    assert.equal(stage.plan.rows[0].origin, "China");
    assert.equal(stage.plan.total, "2.400 Meter");
  });
});

describe("buildProdukStage", () => {
  it("lists products with the Verifikator's decision, the raw materials with the products they go into, and the conversion ratios", () => {
    const product = (id: string, materialType: string) => ({
      id, kategori: "Alas Kaki", materialType, hsCode: "6404.19.90", hsDesc: "Alas kaki", deskripsi: "", estimatedVolume: "1000", volumeUnit: "Pasang", intendedUse: "", photoPath: null, source: "generic" as const,
    });
    const conversion = (id: string, productId: string, productName: string) => ({
      id, productId, productName, productHsCode: "", rawMaterialId: "m1", jenis: "Kulit Imitasi", hsCode: "5903", hsDesc: "", deskripsi: "", photoPath: null,
      kategori: "BAHAN_BAKU", volumeProduksiJumlah: "1000", volumeProduksiSatuan: "Pasang", volumeKebutuhanJumlah: "500", volumeKebutuhanSatuan: "Yard", rasioKonversi: "0,5", keterangan: "",
    });
    const stage = buildProdukStage({
      submittedAt: null, sales: [], documents: [], capacity: [], productionQty: [], rawMaterialUsage: [], electricity: [], workforce: [], statements: [], modules: {}, machines: [],
      products: [product("p1", "Boots"), product("p2", "Loafers")],
      productStatuses: { p1: { status: "VERIFIED", note: null } },
      rawMaterials: [{ id: "m1", jenis: "Kulit Imitasi", hsCode: "5903", hsDesc: "", deskripsi: "", photoPath: null }],
      conversions: [conversion("c1", "p1", "Boots"), conversion("c2", "p2", "Loafers")],
      productionQtyStatuses: { "summary:konversi": { status: "MEMENUHI", keterangan: null, kesimpulan: "Rasio wajar" } },
    });
    assert.equal(stage.products[0].verdict.tone, "green");
    assert.equal(stage.products[1].verdict.tone, "slate");
    assert.equal(stage.products[0].volume, "1.000 Pasang");
    assert.equal(stage.materials[0].usedFor, "Boots, Loafers");
    assert.equal(stage.conversions.rows[0].category, "Bahan Baku");
    assert.equal(stage.conversions.rows[0].need, "500 Yard");
    assert.equal(stage.conversions.conclusion, "Rasio wajar");
    assert.deepEqual(
      stage.checks.map((item) => [item.verdict.label, item.type, item.regulation]),
      [
        ["Belum Diperiksa", "Wajib", "Pasal 30 ayat (2) huruf a angka 1 sampai dengan angka 6"],
        ["Tersedia", "Wajib", "Pasal 30 ayat (2) huruf a angka 1 sampai dengan angka 6"],
        ["Memenuhi", "Wajib", "Pasal 30 ayat (2) huruf a angka 3"],
      ],
    );
  });
});

describe("buildPenjualanStage", () => {
  it("totals domestic and export sales per unit and gives each product its export share", () => {
    const sale = (id: string, dalamNegeri: string, luarNegeri: string) => ({
      id, productId: id, productName: `Produk ${id}`, deskripsi: "", hsCode: "6404", dalamNegeri, luarNegeri, negaraTujuan: "Jepang", satuan: "Pasang",
    });
    const stage = buildPenjualanStage({
      submittedAt: null, documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], capacity: [], productionQty: [], rawMaterialUsage: [],
      electricity: [], workforce: [], statements: [], modules: {}, machines: [],
      sales: [sale("a", "300", "100"), sale("b", "", "")],
      productionQtyStatuses: { "summary:penjualan": { status: "MEMENUHI", keterangan: null, kesimpulan: "Penjualan wajar" } },
    });
    assert.equal(stage.totalDomestic, "300 Pasang");
    assert.equal(stage.totalExport, "100 Pasang");
    assert.equal(stage.rows[0].exportShare, "25%");
    assert.equal(stage.rows[1].total, null);
    assert.equal(stage.verdict?.tone, "green");
    assert.equal(stage.conclusion, "Penjualan wajar");
  });
});

describe("buildListrikStage", () => {
  it("totals the electricity bills and gives the monthly average", () => {
    const stage = buildListrikStage({
      submittedAt: null, sales: [], documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], capacity: [], productionQty: [], productionQtyStatuses: {},
      rawMaterialUsage: [], workforce: [], statements: [], modules: {}, machines: [],
      electricity: [
        { month: "Juli", kwh: "30.000", nominal: null, document: null },
        { month: "Agustus", kwh: "36.000", nominal: null, document: null },
        { month: "September", kwh: null, nominal: null, document: null },
      ],
    });
    assert.equal(stage.totalKwh, "66.000 kWh");
    assert.equal(stage.averageKwh, "33.000 kWh");
  });
});

describe("buildAnalisisStage", () => {
  it("splits Analisis Teknis into the three sub-stages, with the analyst's capacity and bill comparison", () => {
    const stage = buildAnalisisStage({
      submittedAt: null, sales: [], documents: [], products: [], productStatuses: {}, rawMaterials: [], conversions: [], productionQty: [], productionQtyStatuses: {},
      rawMaterialUsage: [], workforce: [], statements: [], machines: [],
      capacity: [{ id: "c1", jenisProduk: "Sepatu", kbliCode: "15201", kbliDescription: "", berdasarkanIzin: "1.000", kapasitasTerpasang: "800", satuan: "Pasang" }],
      kapasitasInputs: { kapasitasVki: JSON.stringify({ c1: "900" }) },
      electricity: [{ month: "Juli", kwh: "1.000", nominal: "1.500.000", document: null }],
      tariff: { label: "I-3/TM", perKwh: 1000 },
      modules: { listrik: { status: "SESUAI", keterangan: null, kesimpulan: "Wajar" } },
    });
    assert.deepEqual(stage.map((item) => [item.number, item.label]), [
      ["14.1", "Analisis Kebutuhan dan Pemakaian Energi Listrik"],
      ["14.2", "Analisis Kapasitas Produksi"],
      ["14.3", "Analisis Kapasitas Kebutuhan Bahan Baku"],
    ]);
    assert.equal(stage[0].verdict.tone, "green");
    assert.equal(stage[0].kesimpulan, "Wajar");
    assert.deepEqual(stage[0].parts.map((part) => part.title), [
      "A. Data Mesin dan Perhitungan Daya",
      "B. Beban Produksi Teoritis",
      "C. Analisis Tagihan Listrik terhadap Kapasitas Produksi",
    ]);
    assert.equal(stage[0].parts[2].tables[0].rows[0][2], "Rp 1.500.000");
    assert.deepEqual(stage[1].parts.map((part) => part.title.slice(0, 2)), ["A.", "B.", "C.", "D."]);
    assert.deepEqual(stage[1].parts[2].tables[0].rows[0].slice(3), ["1.000", "800", "900", "Pasang", "-10%"]);
    assert.equal(stage[2].parts[0].tables[0].rows.length, 0);
  });
});
