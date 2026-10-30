import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { answerLabel, buildLokasiStage, monthsUntil, type LocationInput, type LocationVisitResult } from "./lokasi";

const visit = (overrides: Partial<LocationVisitResult> = {}): LocationVisitResult => ({
  status: "COMPLETED",
  surveyorName: "Rizky",
  actualVisitDate: "2026-07-15",
  addressFound: "Jl. Industri No. 10",
  addressMatch: "sesuai",
  ownershipMatch: "sesuai",
  leaseStillValid: "sesuai",
  registrationMatch: null,
  conclusionStatus: "Sesuai",
  recommendation: "Disetujui",
  summary: null,
  findings: null,
  photos: [{ label: "Tampak Depan", path: "photos/a.jpg", caption: null }],
  ...overrides,
});

const kantor: LocationInput = {
  id: "L1",
  type: "Kantor",
  address: "Jl. Industri No. 10, Jakarta Barat",
  buildingStatus: "SEWA",
  leaseEndDate: "2027-12-31",
  leaseOriginalOwnerName: "PT Properti",
  registration: null,
  documents: [{ key: "location:L1:lease:SEWA_MENYEWA", label: "Perjanjian Sewa Kantor", path: "documents/sewa.pdf", status: "VERIFIED" }],
  visit: visit(),
};
const gudang: LocationInput = {
  id: "L2",
  type: "Gudang",
  address: "Jl. Pergudangan No. 5, Cikarang",
  buildingStatus: "MILIK_SENDIRI",
  leaseEndDate: null,
  leaseOriginalOwnerName: null,
  registration: "TDG TDG-2025-001234",
  documents: [
    { key: "location:L2:ownership:SHM", label: "SHM Gudang", path: "documents/shm.pdf", status: "NOT_YET_VERIFIED" },
    { key: "location:L2:warehouseRegistration", label: "Tanda Daftar Gudang", path: "documents/tdg.pdf", status: "VERIFIED" },
  ],
  visit: null,
};

describe("monthsUntil / answerLabel", () => {
  it("counts whole months from the submission date", () => {
    assert.equal(monthsUntil("2026-07-25T00:00:00.000Z", "2027-12-31"), 17);
    assert.equal(monthsUntil("2026-07-25T00:00:00.000Z", "2026-06-30"), -1);
  });

  it("labels the surveyor's answer, or why there is none", () => {
    assert.equal(answerLabel("tidak", true), "Tidak Sesuai");
    assert.equal(answerLabel(null, true), "Belum diisi");
    assert.equal(answerLabel(null, false), "Belum dikunjungi");
  });
});

describe("buildLokasiStage", () => {
  const view = buildLokasiStage({ submittedAt: "2026-07-25T00:00:00.000Z", locations: [kantor, gudang] });

  it("has rows per location: address, tenure, lease when rented, warehouse registration for a gudang", () => {
    assert.deepEqual(view.groups[0].rows.map((row) => row.parameter), ["Alamat Kantor", "Status Penguasaan", "Masa Berlaku Sewa"]);
    assert.deepEqual(view.groups[1].rows.map((row) => row.parameter), ["Alamat Gudang", "Status Penguasaan", "Tanda Daftar Gudang"]);
  });

  it("shows the lease left at submission and the surveyor's findings as recorded", () => {
    const lease = view.groups[0].rows[2];
    assert.equal(lease.detail, "Sisa ±17 bulan sejak pengajuan");
    assert.equal(lease.field, "Sesuai");
    assert.equal(view.groups[1].rows[0].field, "Belum dikunjungi");
  });

  it("takes requirement type and regulation from the scheme for the location document", () => {
    const registration = view.groups[1].rows[2];
    assert.equal(registration.document?.path, "documents/tdg.pdf");
    assert.notEqual(registration.regulation, "—");
  });

  it("summarises the examination flow", () => {
    assert.deepEqual(
      view.flow.map((step) => [step.label, step.value]),
      [
        ["Alamat Dilaporkan", "2 lokasi"],
        ["Dokumen Legal", "3 dokumen tersedia"],
        ["Lokasi Aktual", "1 dari 2 dikunjungi"],
        ["Evidence", "1 foto"],
        ["Hasil Verifikasi", "3/3 parameter sesuai"],
        ["Kesimpulan", "Belum disimpulkan"],
      ],
    );
  });
});
