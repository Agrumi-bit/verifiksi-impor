import { stepStatus, type CaseDetailInput, type DetailFinding, type Evidence, type StepStatus } from "./case-detail";
import { requirementsOf, type RequirementKey } from "./requirements";
import { buildBahanBakuStage, buildKapasitasStage, buildPenjualanStage, buildProdukStage, buildMesinStage, moduleVerdict } from "./vki-stages";
import { WORKSPACE_LABELS, stateOf, type WorkspaceKey } from "./workspace-status";

/**
 * Compliance Matrix (pure): Requirement → Workspace Source → Evidence → Result → Status for one case.
 * Status comes from the source workspace's handover and the findings recorded on the requirement —
 * Compliance does not verify again. `result` repeats what the workspace recorded, nothing derived.
 */

export type MatrixRow = {
  key: RequirementKey;
  label: string;
  type: string;
  regulation: string;
  source: WorkspaceKey;
  sourceLabel: string;
  step: number;
  evidence: Evidence[];
  result: string;
  status: StepStatus;
  /** The most serious active finding on the requirement, else the latest resolved one. */
  finding: DetailFinding | null;
  verifiedBy: string;
};

const NOT_RECORDED = "Belum tercatat";

function join(values: (string | null | undefined)[]): string {
  const present = values.filter((value): value is string => Boolean(value));
  return present.length ? present.join(", ") : "—";
}

function locationsOf(input: CaseDetailInput, type: string) {
  return input.locations.filter((location) => location.type === type);
}

function resultAndEvidence(key: RequirementKey, input: CaseDetailInput): { result: string; evidence: Evidence[] } {
  const legalDoc = (label: string) => input.legal.documents.filter((doc) => doc.label === label);
  switch (key) {
    case "npwp":
      return { result: input.legal.npwp ?? NOT_RECORDED, evidence: legalDoc("NPWP") };
    case "nib":
      return { result: input.legal.nib ?? input.row.nib ?? NOT_RECORDED, evidence: legalDoc("NIB") };
    case "kbli":
      return {
        result: input.legal.kbli.length ? input.legal.kbli.map((kbli) => `${kbli.code} – ${kbli.description}`).join("; ") : NOT_RECORDED,
        evidence: [...legalDoc("Dokumen KBLI"), ...legalDoc("NIB")],
      };
    case "kantor":
    case "gudang": {
      const locations = locationsOf(input, key === "kantor" ? "Kantor" : "Gudang");
      return {
        result: locations.length
          ? locations.map((location) => [location.address, location.surveyStatus ? `survey ${location.surveyStatus.toLowerCase()}` : null].filter(Boolean).join(" · ")).join("; ")
          : NOT_RECORDED,
        evidence: locations.flatMap((location) => location.documents),
      };
    }
    case "merek":
      return {
        result: input.brands.length ? `${input.brands.length} merek: ${input.brands.map((brand) => brand.name).join(", ")}` : NOT_RECORDED,
        evidence: input.brands.flatMap((brand) => brand.documents),
      };
    case "hs": {
      const hsCodes = new Set(input.products.map((product) => product.hsCode).filter(Boolean));
      return { result: input.products.length ? `${input.products.length} produk · ${hsCodes.size} HS` : NOT_RECORDED, evidence: [] };
    }
    case "stok":
      return { result: input.products.length ? `Stok terlapor untuk ${input.products.length} produk` : NOT_RECORDED, evidence: [] };
    case "uji": {
      const required = new Set(input.products.map((product) => `${product.brandId}::${product.commodityGroupId}`));
      const covered = new Set(
        input.certificates.map((certificate) => `${certificate.brandId}::${certificate.commodityGroupId}`).filter((combination) => required.has(combination)),
      );
      return {
        result: input.certificates.length ? `${input.certificates.length} sertifikat · ${covered.size} dari ${required.size} kombinasi merek × komoditas` : NOT_RECORDED,
        evidence: input.certificates.map((certificate) => certificate.file).filter((file): file is Evidence => file !== null),
      };
    }
    case "label":
      return {
        result: input.label.statement ? "Surat pernyataan tersedia" : NOT_RECORDED,
        evidence: [input.label.statement, input.label.documentation].filter((doc): doc is Evidence => doc !== null),
      };
    case "modal":
      return {
        result: input.workingCapital.amount ? `Nominal tercantum: ${input.workingCapital.amount}` : input.workingCapital.statement ? "Nominal belum tercantum" : NOT_RECORDED,
        evidence: [input.workingCapital.statement, ...input.workingCapital.supporting].filter((doc): doc is Evidence => doc !== null),
      };
    case "approval": {
      const approved = input.pmReviews.filter((review) => review.status === "Disetujui").length;
      return { result: input.pmReviews.length ? `${approved} dari ${input.pmReviews.length} laporan disetujui PM` : NOT_RECORDED, evidence: [] };
    }
    default:
      return vkiResult(key, input);
  }
}

/** VKI's own requirements, from its production / workforce / statement / technical-analysis data. */
function vkiResult(key: RequirementKey, input: CaseDetailInput): { result: string; evidence: Evidence[] } {
  const vki = input.vki;
  const docs = (match: (key: string) => boolean): Evidence[] =>
    (vki?.documents ?? []).filter((row) => match(row.key) && row.document).map((row) => row.document!);
  switch (key) {
    case "pajak": {
      const tax = input.legal.documents.filter((doc) => /SKT|Pajak/i.test(doc.label));
      return { result: tax.length ? tax.map((doc) => doc.label).join(", ") : NOT_RECORDED, evidence: tax };
    }
    case "pabrik": {
      const locations = locationsOf(input, "Pabrik");
      return {
        result: locations.length ? locations.map((location) => [location.address, location.surveyStatus ? `survey ${location.surveyStatus.toLowerCase()}` : null].filter(Boolean).join(" · ")).join("; ") : NOT_RECORDED,
        evidence: locations.flatMap((location) => location.documents),
      };
    }
    case "produksi": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const alur = docs((docKey) => docKey === "vki-support:alur-proses");
      return { result: `Alur proses ${alur.length ? "tersedia" : "belum tersedia"}`, evidence: alur };
    }
    case "mesin": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const mesin = buildMesinStage(vki);
      return {
        result: mesin.machines.length ? `${mesin.machines.length} jenis mesin · ${mesin.totalUnits.toLocaleString("id-ID")} unit · daya ${mesin.totalPower} · lini ${mesin.line.perDay}/hari` : NOT_RECORDED,
        evidence: [],
      };
    }
    case "listrik": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      return { result: vki.electricity.length ? `Tagihan ${vki.electricity.length} bulan` : NOT_RECORDED, evidence: docs((docKey) => docKey.startsWith("vki-support:listrik")) };
    }
    case "jumlahProduksi": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const stage = buildKapasitasStage(vki);
      return {
        result: stage.previous.rows.length || stage.plan.rows.length ? `Tahun sebelumnya ${stage.previous.total} · rencana ${stage.plan.total}` : NOT_RECORDED,
        evidence: [],
      };
    }
    case "produk": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const stage = buildProdukStage(vki);
      return {
        result: stage.products.length
          ? `${stage.products.length} produk · ${stage.materials.length} bahan baku · ${stage.conversions.rows.length} rasio konversi`
          : NOT_RECORDED,
        evidence: [],
      };
    }
    case "kebutuhanBahanBaku": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const stage = buildBahanBakuStage(vki);
      return {
        result: stage.usage.rows.length ? `Penggunaan ${stage.usage.total} · stok ${stage.stock.total} · rencana ${stage.plan.total}` : NOT_RECORDED,
        evidence: [],
      };
    }
    case "penjualan": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const stage = buildPenjualanStage(vki);
      return {
        result: stage.rows.length ? `Dalam negeri ${stage.totalDomestic} · ekspor ${stage.totalExport}` : NOT_RECORDED,
        evidence: [],
      };
    }
    case "tenaga": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const total = vki.workforce.reduce((sum, entry) => sum + entry.count, 0);
      return { result: total ? `${total} orang tenaga kerja` : "Jumlah tenaga kerja belum tercantum", evidence: docs((docKey) => docKey === "vki-support:tenaga-kerja") };
    }
    case "pernyataan": {
      if (!vki) return { result: NOT_RECORDED, evidence: [] };
      const statements = vki.statements.filter((statement) => statement.key !== "alur-proses");
      return { result: statements.length ? `${statements.length} surat pernyataan` : NOT_RECORDED, evidence: statements.map((statement) => statement.document).filter((doc): doc is Evidence => doc !== null) };
    }
    case "energi":
    case "kapasitas":
    case "bahanbaku": {
      const decision = vki?.modules[key === "energi" ? "listrik" : key];
      if (!decision) return { result: "Belum dianalisis", evidence: [] };
      // The analyst's Kesimpulan is long; the matrix shows the decision (the stage shows the text).
      return { result: moduleVerdict(decision).label, evidence: [] };
    }
    default:
      return { result: NOT_RECORDED, evidence: [] };
  }
}

const KIND_RANK = { CONFLICT: 3, OPEN: 2, KLARIFIKASI: 1, RESOLVED: 0 } as const;

export function buildMatrix(input: CaseDetailInput, assignees: Partial<Record<WorkspaceKey, string[]>>): MatrixRow[] {
  return requirementsOf(input.row.scheme).map((requirement) => {
    const findings = input.findings.filter((finding) => finding.requirementKey === requirement.key);
    const finding = [...findings].sort((a, b) => KIND_RANK[b.kind] - KIND_RANK[a.kind])[0] ?? null;
    const handedOver = stateOf(input.row.workspaces, requirement.source) === "COMPLETED";
    const { result, evidence } = resultAndEvidence(requirement.key, input);
    return {
      key: requirement.key,
      label: requirement.label,
      type: requirement.type,
      regulation: requirement.regulation,
      source: requirement.source,
      sourceLabel: WORKSPACE_LABELS[requirement.source],
      step: requirement.step,
      evidence,
      result: handedOver ? result : "—",
      status: stepStatus(requirement.source, input.row.workspaces, findings),
      finding,
      verifiedBy: handedOver ? join(assignees[requirement.source] ?? []) : "—",
    };
  });
}

export const MATRIX_SUMMARY_ORDER: StepStatus[] = ["Sesuai", "Perlu Klarifikasi", "Conflict", "Open Issue", "Menunggu Handover"];

/** Counts per status for the matrix header ("Completed" counts as Sesuai). */
export function matrixSummary(rows: MatrixRow[]): { status: StepStatus; count: number }[] {
  const counts = new Map<StepStatus, number>();
  for (const row of rows) {
    const status = row.status === "Completed" ? "Sesuai" : row.status;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return MATRIX_SUMMARY_ORDER.filter((status) => counts.get(status)).map((status) => ({ status, count: counts.get(status)! }));
}
