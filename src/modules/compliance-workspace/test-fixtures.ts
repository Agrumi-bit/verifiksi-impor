import type { CaseDetailInput } from "./case-detail";
import { buildCaseRow, type CaseSource } from "./case-list";

/** Shared test data for the Compliance Workspace unit tests — one handed-over VIU Konsumsi case. */

const DONE_ASSIGNMENTS = [
  { scheduleType: "dokumen", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "survey", status: "SUBMITTED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "technical", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
];

export function caseRow(overrides: Partial<CaseSource> = {}) {
  return buildCaseRow({
    applicationId: "a1",
    applicationNumber: "APP-VIU-0001",
    companyName: "PT Maju Tekstil Indonesia",
    nib: "8123456789012",
    submittedAt: "2026-07-25T00:00:00.000Z",
    submittedIsSystemDate: false,
    updatedAt: "2026-07-25T09:40:00.000Z",
    applicationStatus: "COMPLETED",
    returnedByRole: null,
    assignments: DONE_ASSIGNMENTS,
    lhviuIssued: true,
    lhviuNumber: "3/LHVIU/TBI/III/2026",
    lhviuIssuedAt: "2026-07-25",
    complianceStatus: "BELUM_DIREVIEW",
    picUserId: null,
    picName: null,
    reviewFlag: false,
    finalReviewDone: false,
    dossierComplete: false,
    findings: [],
    ...overrides,
  });
}

export function detailInput(overrides: Partial<CaseDetailInput> = {}): CaseDetailInput {
  return {
    row: caseRow(),
    applicationCategory: "NEW",
    applicationStatus: "VERIFICATION",
    contact: { name: "Budi", designation: "Direktur", phone: "0812-3456-7890", email: "budi@majutekstil.co.id" },
    legal: { npwp: "12.345.678.9-012.000", nib: "8123456789012", kbli: [{ code: "46412", description: "Perdagangan Besar Pakaian" }], notarialDeedNumber: "12", documents: [{ label: "NIB", path: "documents/nib.pdf" }] },
    locations: [{ type: "Kantor", address: "Jl. Industri No. 10", buildingStatus: "Milik Sendiri", surveyStatus: "Selesai", documents: [] }],
    surveyorNames: ["Rizky"],
    brands: [{ name: "ABC", role: "Perwakilan Resmi", documents: [] }],
    products: [
      { brandId: "b1", commodityGroupId: "g1", hsCode: "6109.10", quantity: 10, averageUnitPrice: 5, currency: "USD", stockQuantity: 0 },
      { brandId: "b1", commodityGroupId: "g2", hsCode: "6204.42", quantity: 2, averageUnitPrice: 10, currency: "USD", stockQuantity: 4 },
    ],
    certificates: [
      { brandId: "b1", commodityGroupId: "g1", brandName: "ABC", commodityName: "Kaos", certificateNumber: "C-1", laboratoryName: "Lab", issueDate: "2026-05-01", file: { label: "C-1", path: "certificates/c1.pdf" } },
    ],
    label: { statement: { label: "SP Label", path: "documents/label.pdf" }, documentation: null },
    workingCapital: { amount: "Rp 5.000.000.000", statement: { label: "SP Modal Kerja", path: "documents/modal.pdf" }, supporting: [] },
    pmReviews: [
      { source: "SV", title: "Laporan Survey Lokasi Kantor", report: "Laporan Survey", status: "Disetujui", by: "Hendra", at: null },
      { source: "VF", title: "Laporan Verifikasi Dokumen", report: "Laporan Verifikasi Dokumen", status: null, by: null, at: null },
    ],
    lhviu: { number: "3/LHVIU/TBI/III/2026", issuedAt: "2026-07-25", validUntil: "2027-07-25", issuedBy: "Hendra", file: { label: "LHVIU", path: "lhviu/x.pdf" } },
    findings: [],
    ...overrides,
  };
}
