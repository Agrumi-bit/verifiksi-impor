import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicReportHref, signFilePath, verifyFilePathSignature } from "./signed-file-link";

// Read at call time by signed-file-link.ts.
process.env.FILE_LINK_SECRET = "test-secret";
process.env.NEXT_PUBLIC_APP_URL = "https://verifikasiimpor.online/";

describe("signed file links in downloaded reports", () => {
  it("signs a path and accepts only that path before expiry", () => {
    const now = Date.UTC(2026, 10, 2);
    const signed = signFilePath("temporary/a.pdf", now);
    assert.ok(signed);
    assert.equal(verifyFilePathSignature("temporary/a.pdf", String(signed.exp), signed.sig, now), true);
    assert.equal(verifyFilePathSignature("temporary/b.pdf", String(signed.exp), signed.sig, now), false);
    assert.equal(verifyFilePathSignature("temporary/a.pdf", String(signed.exp + 1), signed.sig, now), false);
    assert.equal(verifyFilePathSignature("temporary/a.pdf", String(signed.exp), signed.sig, signed.exp * 1000 + 1), false);
    assert.equal(verifyFilePathSignature("temporary/a.pdf", null, null, now), false);
  });

  it("rewrites internal links to the public address, /api/files ones signed", () => {
    const internal = "http://127.0.0.1:3000";
    const file = new URL(publicReportHref("http://127.0.0.1:3000/api/files?path=temporary%2FNIB%20PT.pdf", internal));
    assert.equal(file.origin, "https://verifikasiimpor.online");
    assert.equal(file.pathname, "/api/files");
    assert.equal(file.searchParams.get("path"), "temporary/NIB PT.pdf");
    assert.ok(verifyFilePathSignature("temporary/NIB PT.pdf", file.searchParams.get("exp"), file.searchParams.get("sig")));
    assert.equal(publicReportHref("/project-manager-workspace/x?a=1", internal), "https://verifikasiimpor.online/project-manager-workspace/x?a=1");
    assert.equal(publicReportHref("https://example.com/a", internal), "https://example.com/a");
    assert.equal(publicReportHref("mailto:a@b.c", internal), "mailto:a@b.c");
    assert.equal(publicReportHref("#modul-2", internal), "#modul-2");
  });
});
