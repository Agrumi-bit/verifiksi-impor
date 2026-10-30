import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clarificationRequest, issueTabFor, nextIssueNumber, validateFollowUp } from "./finding-rules";

const OWNER = { ownerId: "u1", ownerName: "Budi Santoso" };

describe("nextIssueNumber", () => {
  it("starts at ISS-0001 and continues after the highest number", () => {
    assert.equal(nextIssueNumber([]), "ISS-0001");
    assert.equal(nextIssueNumber(["ISS-0002", "ISS-0041", "lain"]), "ISS-0042");
    assert.equal(nextIssueNumber(["ISS-9999"]), "ISS-10000");
  });
});

describe("validateFollowUp", () => {
  it("requires a note of at least 10 characters before Resolved", () => {
    const result = validateFollowUp({ current: { kind: "OPEN", ...OWNER }, next: { kind: "RESOLVED", ...OWNER }, note: "  oke  " });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /min\. 10 karakter/);
  });

  it("records the status change, owner change and note", () => {
    const result = validateFollowUp({
      current: { kind: "OPEN", ...OWNER },
      next: { kind: "RESOLVED", ownerId: "u2", ownerName: "Siti Rahmawati" },
      note: "Surat pernyataan pengganti sudah diterima.",
    });
    assert.deepEqual(result, {
      ok: true,
      text: "Status Open Issue → Resolved · Owner → Siti Rahmawati · Catatan: Surat pernyataan pengganti sudah diterima.",
      kindChanged: true,
      ownerChanged: true,
    });
  });

  it("rejects a follow-up that changes nothing", () => {
    const result = validateFollowUp({ current: { kind: "OPEN", ...OWNER }, next: { kind: "OPEN", ...OWNER }, note: "   " });
    assert.deepEqual(result, { ok: false, error: "Tidak ada perubahan untuk disimpan." });
  });

  it("accepts a note alone, and reopening without the resolution rule", () => {
    assert.equal(validateFollowUp({ current: { kind: "OPEN", ...OWNER }, next: { kind: "OPEN", ...OWNER }, note: "Dicek ulang" }).ok, true);
    assert.equal(validateFollowUp({ current: { kind: "RESOLVED", ...OWNER }, next: { kind: "OPEN", ...OWNER }, note: "" }).ok, true);
  });
});

describe("clarificationRequest", () => {
  it("keeps a conflict, turns anything else into Perlu Klarifikasi, and refuses a resolved finding", () => {
    assert.deepEqual(clarificationRequest("CONFLICT", "Surveyor"), { ok: true, kind: "CONFLICT", text: "Permintaan klarifikasi ke Surveyor dicatat." });
    assert.equal((clarificationRequest("OPEN", "Verifikator") as { kind: string }).kind, "KLARIFIKASI");
    assert.deepEqual(clarificationRequest("RESOLVED", "Verifikator"), { ok: false, error: "Temuan sudah Resolved." });
  });
});

describe("issueTabFor", () => {
  it("opens the most serious active kind", () => {
    assert.equal(issueTabFor(["KLARIFIKASI", "CONFLICT"]), "CONFLICT");
    assert.equal(issueTabFor(["KLARIFIKASI", "OPEN"]), "OPEN");
    assert.equal(issueTabFor([]), "RESOLVED");
  });
});
